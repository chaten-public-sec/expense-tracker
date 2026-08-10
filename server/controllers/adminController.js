const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Activity = require('../models/Activity');
const PushSubscription = require('../models/PushSubscription');
const { deleteFromCloudinary } = require('../config/cloudinary');
const { emitToGroup, emitToUser } = require('../socket/socketManager');
const { calculateGroupBalances } = require('../utils/balance');

// Helper to calculate splits when expense amount or members change
const computeSplits = async (groupId, amount, splitType, splitBetween, payerId) => {
  let targetUserIds = [];

  if (splitType === 'everyone') {
    const members = await GroupMember.find({ groupId });
    targetUserIds = members.map((m) => m.userId.toString());
  } else {
    targetUserIds = Array.isArray(splitBetween) ? splitBetween.map((id) => id.toString()) : [];
    if (!targetUserIds.includes(payerId.toString())) {
      targetUserIds.push(payerId.toString());
    }
  }

  if (targetUserIds.length === 0) {
    targetUserIds = [payerId.toString()];
  }

  const numMembers = targetUserIds.length;
  const rawShare = amount / numMembers;
  const roundedShare = Math.round(rawShare * 100) / 100;
  const remainder = Math.round((amount - roundedShare * numMembers) * 100) / 100;

  const splitDetails = targetUserIds.map((userId, idx) => ({
    user: userId,
    share: idx === 0 ? Math.round((roundedShare + remainder) * 100) / 100 : roundedShare,
  }));

  return { splitBetween: targetUserIds, splitDetails };
};

// ==========================================
// 1. GLOBAL SYSTEM OVERVIEW & METRICS
// ==========================================

// @desc Get Super Admin System Dashboard Statistics
// @route GET /api/admin/stats
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalGroups = await Group.countDocuments();
    const totalExpensesCount = await Expense.countDocuments();
    const totalSettlementsCount = await Settlement.countDocuments();
    const completedSettlementsCount = await Settlement.countDocuments({ status: 'completed' });
    const pendingSettlementsCount = await Settlement.countDocuments({ status: 'paid_pending_approval' });

    // Aggregate total money tracked across all expenses
    const expenseAgg = await Expense.aggregate([
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]);
    const totalExpenseAmount = expenseAgg.length > 0 ? Math.round(expenseAgg[0].totalAmount * 100) / 100 : 0;

    // Aggregate completed settlements volume
    const settlementAgg = await Settlement.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalSettled: { $sum: '$amount' } } },
    ]);
    const totalSettledAmount = settlementAgg.length > 0 ? Math.round(settlementAgg[0].totalSettled * 100) / 100 : 0;

    // Recent activity stream
    const recentActivities = await Activity.find()
      .populate('user', 'fullName email')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .limit(8);

    return res.json({
      totalUsers,
      totalGroups,
      totalExpensesCount,
      totalExpenseAmount,
      totalSettlementsCount,
      completedSettlementsCount,
      pendingSettlementsCount,
      totalSettledAmount,
      recentActivities,
    });
  } catch (error) {
    console.error('Get Admin Stats Error:', error);
    return res.status(500).json({ message: 'Server error fetching admin stats' });
  }
};

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

// @desc Get all registered users (paginated, searchable, filterable)
// @route GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search ? req.query.search.trim() : '';
    const roleFilter = req.query.role || '';
    const hasGroupFilter = req.query.hasGroup || '';

    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { upiId: { $regex: search, $options: 'i' } },
      ];
    }

    if (roleFilter === 'admin') {
      query.isSuperAdmin = true;
    } else if (roleFilter === 'user') {
      query.isSuperAdmin = { $ne: true };
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const membership = await GroupMember.findOne({ userId: u._id }).populate('groupId', 'name inviteCode');
        const expensesCount = await Expense.countDocuments({ paidBy: u._id });
        const settlementsCount = await Settlement.countDocuments({
          $or: [{ payer: u._id }, { receiver: u._id }],
        });

        return {
          ...u.toObject(),
          group: membership?.groupId || null,
          groupRole: membership?.role || null,
          expensesCount,
          settlementsCount,
        };
      })
    );

    let filteredUsers = enrichedUsers;
    if (hasGroupFilter === 'yes') {
      filteredUsers = filteredUsers.filter((u) => u.group !== null);
    } else if (hasGroupFilter === 'no') {
      filteredUsers = filteredUsers.filter((u) => u.group === null);
    }

    return res.json({
      users: filteredUsers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get Admin Users Error:', error);
    return res.status(500).json({ message: 'Server error fetching all users' });
  }
};

// @desc Get full user details for admin Drawer/Modal
// @route GET /api/admin/users/:id
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const membership = await GroupMember.findOne({ userId: user._id }).populate('groupId', 'name inviteCode payday createdAt');
    const recentExpenses = await Expense.find({ paidBy: user._id })
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentSettlements = await Settlement.find({
      $or: [{ payer: user._id }, { receiver: user._id }],
    })
      .populate('payer', 'fullName email')
      .populate('receiver', 'fullName email')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const pushCount = await PushSubscription.countDocuments({ userId: user._id });

    let balances = null;
    if (membership?.groupId) {
      try {
        balances = await calculateGroupBalances(membership.groupId._id, user._id.toString());
      } catch (e) {
        console.warn('Balance calc warning in getUserDetails:', e.message);
      }
    }

    return res.json({
      user,
      membership,
      recentExpenses,
      recentSettlements,
      pushCount,
      balances: balances ? balances.currentUserSummary : null,
    });
  } catch (error) {
    console.error('Get User Details Error:', error);
    return res.status(500).json({ message: 'Server error fetching user details' });
  }
};

// @desc Edit user profile properties as Super Admin
// @route PUT /api/admin/users/:id
const updateUser = async (req, res) => {
  try {
    const { fullName, email, phone, upiId, isSuperAdmin } = req.body;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate email uniqueness if changing email
    if (email && email.toLowerCase() !== targetUser.email.toLowerCase()) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({ message: 'Email is already taken by another account' });
      }
      targetUser.email = email.toLowerCase().trim();
    }

    if (fullName) targetUser.fullName = fullName.trim();
    if (phone) targetUser.phone = phone.trim();
    if (upiId !== undefined) targetUser.upiId = upiId ? upiId.trim() : '';

    // Handle Super Admin role toggling with safeguards
    if (isSuperAdmin !== undefined && typeof isSuperAdmin === 'boolean') {
      // Prevent self-demotion
      if (req.user._id.toString() === targetUser._id.toString() && !isSuperAdmin) {
        return res.status(400).json({ message: 'You cannot remove your own Super Admin privileges.' });
      }

      // Prevent removing the last Super Admin
      if (!isSuperAdmin && targetUser.isSuperAdmin) {
        const adminCount = await User.countDocuments({ isSuperAdmin: true });
        if (adminCount <= 1) {
          return res.status(400).json({ message: 'Cannot demote the last remaining Super Admin.' });
        }
      }

      targetUser.isSuperAdmin = isSuperAdmin;
    }

    await targetUser.save();

    return res.json({
      message: `User ${targetUser.fullName} updated successfully`,
      user: {
        _id: targetUser._id,
        fullName: targetUser.fullName,
        email: targetUser.email,
        phone: targetUser.phone,
        upiId: targetUser.upiId,
        isSuperAdmin: targetUser.isSuperAdmin,
        qrCodeUrl: targetUser.qrCodeUrl,
      },
    });
  } catch (error) {
    console.error('Update User Admin Error:', error);
    return res.status(500).json({ message: 'Server error updating user profile' });
  }
};

// @desc Admin password reset for user
// @route POST /api/admin/users/:id/password
const changeUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const salt = await bcrypt.genSalt(10);
    targetUser.password = await bcrypt.hash(newPassword, salt);
    await targetUser.save();

    return res.json({ message: `Password for ${targetUser.fullName} has been reset successfully.` });
  } catch (error) {
    console.error('Admin Password Reset Error:', error);
    return res.status(500).json({ message: 'Server error resetting user password' });
  }
};

// @desc Safe User Deletion with full data cascade and cleanup
// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Protection 1: Prevent self-deletion
    if (req.user._id.toString() === userId.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own active Super Admin account.' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Protection 2: Prevent deleting protected seed admin or last super admin
    if (targetUser.email === 'admin@gmail.com') {
      return res.status(403).json({ message: 'Primary System Super Admin cannot be deleted.' });
    }

    if (targetUser.isSuperAdmin) {
      const superAdminCount = await User.countDocuments({ isSuperAdmin: true });
      if (superAdminCount <= 1) {
        return res.status(403).json({ message: 'Cannot delete the only remaining Super Admin account.' });
      }
    }

    // 1. Clean up Cloudinary QR asset
    if (targetUser.qrCodePublicId) {
      try {
        await deleteFromCloudinary(targetUser.qrCodePublicId);
      } catch (e) {
        console.warn('QR Cloudinary delete error:', e.message);
      }
    }

    // 2. Handle group memberships and group creator roles
    const memberships = await GroupMember.find({ userId });
    for (const mem of memberships) {
      const groupId = mem.groupId;
      if (mem.role === 'creator') {
        const nextMember = await GroupMember.findOne({ groupId, userId: { $ne: userId } });
        if (nextMember) {
          nextMember.role = 'creator';
          await nextMember.save();
        } else {
          // Sole member of group -> clean up group
          await Expense.deleteMany({ groupId });
          await Settlement.deleteMany({ groupId });
          await Activity.deleteMany({ groupId });
          await Group.findByIdAndDelete(groupId);
        }
      }
    }

    // 3. Delete group membership records & push subscriptions
    await GroupMember.deleteMany({ userId });
    await PushSubscription.deleteMany({ userId });

    // 4. Delete user document
    await User.findByIdAndDelete(userId);

    return res.json({ message: `User account "${targetUser.fullName}" and associated records deleted successfully.` });
  } catch (error) {
    console.error('Delete User Admin Error:', error);
    return res.status(500).json({ message: 'Server error deleting user' });
  }
};

// ==========================================
// 3. GROUP MANAGEMENT
// ==========================================

// @desc Get all groups across system (paginated, searchable)
// @route GET /api/admin/groups
const getAllGroups = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search ? req.query.search.trim() : '';

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { inviteCode: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Group.countDocuments(query);
    const groups = await Group.find(query)
      .populate('createdBy', 'fullName email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const enrichedGroups = await Promise.all(
      groups.map(async (g) => {
        const memberCount = await GroupMember.countDocuments({ groupId: g._id });
        const expensesCount = await Expense.countDocuments({ groupId: g._id });
        const settlementsCount = await Settlement.countDocuments({ groupId: g._id });

        const expAgg = await Expense.aggregate([
          { $match: { groupId: g._id } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const totalAmount = expAgg.length > 0 ? Math.round(expAgg[0].total * 100) / 100 : 0;

        return {
          _id: g._id,
          name: g.name,
          inviteCode: g.inviteCode,
          payday: g.payday,
          createdBy: g.createdBy,
          memberCount,
          expensesCount,
          settlementsCount,
          totalAmount,
          createdAt: g.createdAt,
        };
      })
    );

    return res.json({
      groups: enrichedGroups,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get Admin Groups Error:', error);
    return res.status(500).json({ message: 'Server error fetching all groups' });
  }
};

// @desc Get full group details with members, expenses, settlements, and activities
// @route GET /api/admin/groups/:id
const getGroupDetails = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('createdBy', 'fullName email phone');
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const members = await GroupMember.find({ groupId: group._id })
      .populate('userId', 'fullName email phone upiId qrCodeUrl')
      .sort({ joinedAt: 1 });

    const expenses = await Expense.find({ groupId: group._id })
      .populate('paidBy', 'fullName email')
      .sort({ date: -1, createdAt: -1 })
      .limit(20);

    const settlements = await Settlement.find({ groupId: group._id })
      .populate('payer', 'fullName email')
      .populate('receiver', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(20);

    const activities = await Activity.find({ groupId: group._id })
      .populate('user', 'fullName')
      .sort({ createdAt: -1 })
      .limit(20);

    // Calculate group financial summaries if members exist
    let balances = null;
    if (members.length > 0) {
      try {
        balances = await calculateGroupBalances(group._id, members[0].userId?._id?.toString() || '');
      } catch (e) {
        console.warn('Balance calc warning in getGroupDetails:', e.message);
      }
    }

    return res.json({
      group,
      members,
      expenses,
      settlements,
      activities,
      balances: balances ? balances.membersSummary : [],
    });
  } catch (error) {
    console.error('Get Group Details Error:', error);
    return res.status(500).json({ message: 'Server error fetching group details' });
  }
};

// @desc Update safe group properties as Super Admin
// @route PUT /api/admin/groups/:id
const updateGroup = async (req, res) => {
  try {
    const { name, payday } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (name) group.name = name.trim();

    if (payday !== undefined) {
      if (payday === null || payday === '') {
        group.payday = null;
      } else {
        const numPayday = parseInt(payday, 10);
        if (isNaN(numPayday) || numPayday < 1 || numPayday > 31) {
          return res.status(400).json({ message: 'Payday must be a day of the month (1-31)' });
        }
        group.payday = numPayday;
      }
    }

    await group.save();

    // Notify group members of update
    emitToGroup(group._id, 'notification', {
      type: 'group:updated',
      message: `Group details updated by Super Admin`,
      timestamp: new Date().toISOString(),
    });

    return res.json({ message: `Group "${group.name}" updated successfully`, group });
  } catch (error) {
    console.error('Update Group Admin Error:', error);
    return res.status(500).json({ message: 'Server error updating group' });
  }
};

// @desc Remove a member from a group (Admin override)
// @route DELETE /api/admin/groups/:id/members/:userId
const removeGroupMember = async (req, res) => {
  try {
    const { id: groupId, userId } = req.params;

    const membership = await GroupMember.findOne({ groupId, userId });
    if (!membership) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }

    await GroupMember.deleteOne({ _id: membership._id });

    // If removing the creator, reassign to next member
    if (membership.role === 'creator') {
      const nextMember = await GroupMember.findOne({ groupId });
      if (nextMember) {
        nextMember.role = 'creator';
        await nextMember.save();
      }
    }

    emitToGroup(groupId, 'notification', {
      type: 'group:member_removed',
      message: `A member was removed from the group by Super Admin`,
      timestamp: new Date().toISOString(),
    });

    return res.json({ message: 'Member removed from group successfully by Super Admin' });
  } catch (error) {
    console.error('Remove Group Member Admin Error:', error);
    return res.status(500).json({ message: 'Server error removing group member' });
  }
};

// @desc Delete group by Super Admin with full cascade cleanup
// @route DELETE /api/admin/groups/:id
const deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // 1. Clean up all Expense receipt screenshots from Cloudinary
    const expenses = await Expense.find({ groupId });
    for (const exp of expenses) {
      if (exp.screenshotPublicId) {
        try {
          await deleteFromCloudinary(exp.screenshotPublicId);
        } catch (e) {
          console.warn('Expense screenshot delete error:', e.message);
        }
      }
    }

    // 2. Clean up all Settlement proof screenshots from Cloudinary
    const settlements = await Settlement.find({ groupId });
    for (const st of settlements) {
      if (st.proofPublicId) {
        try {
          await deleteFromCloudinary(st.proofPublicId);
        } catch (e) {
          console.warn('Settlement proof delete error:', e.message);
        }
      }
    }

    // 3. Delete database records
    await GroupMember.deleteMany({ groupId });
    await Expense.deleteMany({ groupId });
    await Settlement.deleteMany({ groupId });
    await Activity.deleteMany({ groupId });
    await Group.findByIdAndDelete(groupId);

    // 4. Notify room
    emitToGroup(groupId, 'notification', {
      type: 'group:deleted',
      message: `Group "${group.name}" was deleted by Super Admin`,
      timestamp: new Date().toISOString(),
    });

    return res.json({ message: `Group "${group.name}" and all associated data permanently deleted.` });
  } catch (error) {
    console.error('Delete Group Admin Error:', error);
    return res.status(500).json({ message: 'Server error deleting group' });
  }
};

// ==========================================
// 4. EXPENSE MANAGEMENT
// ==========================================

// @desc Get all expenses (paginated, searchable, filterable)
// @route GET /api/admin/expenses
const getAllExpenses = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search ? req.query.search.trim() : '';
    const groupId = req.query.groupId || '';
    const paymentMode = req.query.paymentMode || '';
    const splitType = req.query.splitType || '';

    const query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (groupId) {
      query.groupId = groupId;
    }
    if (paymentMode) {
      query.paymentMode = paymentMode;
    }
    if (splitType) {
      query.splitType = splitType;
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .populate('groupId', 'name')
      .populate('paidBy', 'fullName email phone')
      .populate('splitDetails.user', 'fullName email')
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      expenses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get Admin Expenses Error:', error);
    return res.status(500).json({ message: 'Server error fetching all expenses' });
  }
};

// @desc Get full expense details
// @route GET /api/admin/expenses/:id
const getExpenseDetails = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('groupId', 'name inviteCode')
      .populate('paidBy', 'fullName email phone upiId qrCodeUrl')
      .populate('splitDetails.user', 'fullName email phone upiId');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    return res.json(expense);
  } catch (error) {
    console.error('Get Expense Details Error:', error);
    return res.status(500).json({ message: 'Server error fetching expense details' });
  }
};

// @desc Edit expense as Super Admin with split recalculation
// @route PUT /api/admin/expenses/:id
const updateExpense = async (req, res) => {
  try {
    const { title, amount, date, paymentMode, notes } = req.body;
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (title) expense.title = title.trim();

    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: 'Valid expense amount greater than 0 is required' });
      }

      // Recalculate splits if amount changed
      if (numAmount !== expense.amount) {
        expense.amount = numAmount;
        const { splitDetails } = await computeSplits(
          expense.groupId,
          numAmount,
          expense.splitType,
          expense.splitBetween,
          expense.paidBy
        );
        expense.splitDetails = splitDetails;
      }
    }

    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        expense.date = parsedDate;
      }
    }

    if (paymentMode) expense.paymentMode = paymentMode;
    if (notes !== undefined) expense.notes = notes.trim();

    await expense.save();

    // Real-time update to group
    emitToGroup(expense.groupId, 'notification', {
      type: 'expense:updated',
      message: `Expense "${expense.title}" was updated by Super Admin`,
      timestamp: new Date().toISOString(),
    });

    return res.json({ message: `Expense "${expense.title}" updated successfully`, expense });
  } catch (error) {
    console.error('Update Admin Expense Error:', error);
    return res.status(500).json({ message: 'Server error updating expense' });
  }
};

// @desc Delete any expense by Super Admin with Cloudinary cleanup & socket emit
// @route DELETE /api/admin/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const groupId = expense.groupId;
    const title = expense.title;

    if (expense.screenshotPublicId) {
      try {
        await deleteFromCloudinary(expense.screenshotPublicId);
      } catch (e) {
        console.warn('Screenshot delete warning:', e.message);
      }
    }

    await Expense.findByIdAndDelete(req.params.id);

    // Notify group room so live balances refresh
    emitToGroup(groupId, 'notification', {
      type: 'expense:deleted',
      message: `Expense "${title}" was deleted by Super Admin`,
      timestamp: new Date().toISOString(),
    });

    return res.json({ message: `Expense "${title}" deleted successfully by Super Admin` });
  } catch (error) {
    console.error('Delete Admin Expense Error:', error);
    return res.status(500).json({ message: 'Server error deleting expense' });
  }
};

// ==========================================
// 5. SETTLEMENT MANAGEMENT
// ==========================================

// @desc Get all settlements (paginated, searchable, filterable by status)
// @route GET /api/admin/settlements
const getAllSettlements = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const status = req.query.status || '';
    const groupId = req.query.groupId || '';

    const query = {};
    if (status) query.status = status;
    if (groupId) query.groupId = groupId;

    const total = await Settlement.countDocuments(query);
    const settlements = await Settlement.find(query)
      .populate('groupId', 'name')
      .populate('payer', 'fullName email phone upiId')
      .populate('receiver', 'fullName email phone upiId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      settlements,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get Admin Settlements Error:', error);
    return res.status(500).json({ message: 'Server error fetching all settlements' });
  }
};

// @desc Administrative action on settlement (Approve / Reject / Cancel / Delete)
// @route POST /api/admin/settlements/:id/action
const adminSettlementAction = async (req, res) => {
  try {
    const { action } = req.body;
    const settlement = await Settlement.findById(req.params.id)
      .populate('payer', 'fullName email')
      .populate('receiver', 'fullName email');

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement record not found' });
    }

    if (action === 'approve') {
      settlement.status = 'completed';
      settlement.verifiedAt = new Date();
      await settlement.save();

      emitToUser(settlement.payer._id, 'notification', {
        type: 'settlement:approved',
        message: `Settlement of ₹${settlement.amount.toFixed(2)} was approved by Super Admin`,
        timestamp: new Date().toISOString(),
      });
      emitToUser(settlement.receiver._id, 'notification', {
        type: 'settlement:approved',
        message: `Settlement of ₹${settlement.amount.toFixed(2)} was verified by Super Admin`,
        timestamp: new Date().toISOString(),
      });

      return res.json({ message: 'Settlement status updated to Completed by Super Admin', settlement });
    }

    if (action === 'cancel') {
      settlement.status = 'cancelled';
      await settlement.save();

      emitToUser(settlement.payer._id, 'notification', {
        type: 'settlement:cancelled',
        message: `Settlement of ₹${settlement.amount.toFixed(2)} was marked Cancelled by Super Admin`,
        timestamp: new Date().toISOString(),
      });

      return res.json({ message: 'Settlement cancelled by Super Admin', settlement });
    }

    if (action === 'delete') {
      if (settlement.proofPublicId) {
        try {
          await deleteFromCloudinary(settlement.proofPublicId);
        } catch (e) {
          console.warn('Proof delete warning:', e.message);
        }
      }
      await Settlement.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Settlement record deleted by Super Admin' });
    }

    return res.status(400).json({ message: 'Invalid administrative settlement action specified' });
  } catch (error) {
    console.error('Admin Settlement Action Error:', error);
    return res.status(500).json({ message: 'Server error performing settlement action' });
  }
};

// ==========================================
// 6. SYSTEM AUDIT TRAILS & ACTIVITY
// ==========================================

// @desc Get system-wide activities (paginated)
// @route GET /api/admin/activities
const getAllActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const groupId = req.query.groupId || '';

    const query = {};
    if (groupId) query.groupId = groupId;

    const total = await Activity.countDocuments(query);
    const activities = await Activity.find(query)
      .populate('user', 'fullName email')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      activities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get Admin Activities Error:', error);
    return res.status(500).json({ message: 'Server error fetching audit activities' });
  }
};

module.exports = {
  getAdminStats,
  // Users
  getAllUsers,
  getUserDetails,
  updateUser,
  changeUserPassword,
  deleteUser,
  // Groups
  getAllGroups,
  getGroupDetails,
  updateGroup,
  removeGroupMember,
  deleteGroup,
  // Expenses
  getAllExpenses,
  getExpenseDetails,
  updateExpense,
  deleteExpense,
  // Settlements
  getAllSettlements,
  adminSettlementAction,
  // Activities
  getAllActivities,
};
