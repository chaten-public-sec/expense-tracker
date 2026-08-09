const User = require('../models/User');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Activity = require('../models/Activity');
const { deleteFromCloudinary } = require('../config/cloudinary');

// @desc Get Super Admin System Dashboard Statistics
// @route GET /api/admin/stats
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalGroups = await Group.countDocuments();
    const totalExpensesCount = await Expense.countDocuments();
    const totalSettlementsCount = await Settlement.countDocuments();

    // Aggregate total money tracked
    const expenseAgg = await Expense.aggregate([
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);
    const totalExpenseAmount = expenseAgg.length > 0 ? Math.round(expenseAgg[0].totalAmount * 100) / 100 : 0;

    return res.json({
      totalUsers,
      totalGroups,
      totalExpensesCount,
      totalExpenseAmount,
      totalSettlementsCount,
    });
  } catch (error) {
    console.error('Get Admin Stats Error:', error);
    return res.status(500).json({ message: 'Server error fetching admin stats' });
  }
};

// @desc Get all groups across system
// @route GET /api/admin/groups
const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('createdBy', 'fullName email phone')
      .sort({ createdAt: -1 });

    const enrichedGroups = await Promise.all(groups.map(async (g) => {
      const memberCount = await GroupMember.countDocuments({ groupId: g._id });
      const members = await GroupMember.find({ groupId: g._id }).populate('userId', 'fullName email phone upiId');
      const expensesCount = await Expense.countDocuments({ groupId: g._id });
      
      const expAgg = await Expense.aggregate([
        { $match: { groupId: g._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalAmount = expAgg.length > 0 ? Math.round(expAgg[0].total * 100) / 100 : 0;

      return {
        _id: g._id,
        name: g.name,
        inviteCode: g.inviteCode,
        payday: g.payday,
        createdBy: g.createdBy,
        memberCount,
        members: members.map(m => m.userId),
        expensesCount,
        totalAmount,
        createdAt: g.createdAt
      };
    }));

    return res.json(enrichedGroups);
  } catch (error) {
    console.error('Get Admin Groups Error:', error);
    return res.status(500).json({ message: 'Server error fetching all groups' });
  }
};

// @desc Delete group by Super Admin
// @route DELETE /api/admin/groups/:id
const deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Delete associated data
    await GroupMember.deleteMany({ groupId });
    await Expense.deleteMany({ groupId });
    await Settlement.deleteMany({ groupId });
    await Activity.deleteMany({ groupId });
    await Group.findByIdAndDelete(groupId);

    return res.json({ message: `Group "${group.name}" deleted successfully by Super Admin` });
  } catch (error) {
    console.error('Delete Group Admin Error:', error);
    return res.status(500).json({ message: 'Server error deleting group' });
  }
};

// @desc Get all registered users
// @route GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    const enrichedUsers = await Promise.all(users.map(async (u) => {
      const membership = await GroupMember.findOne({ userId: u._id }).populate('groupId', 'name');
      return {
        ...u.toObject(),
        group: membership?.groupId || null
      };
    }));

    return res.json(enrichedUsers);
  } catch (error) {
    console.error('Get Admin Users Error:', error);
    return res.status(500).json({ message: 'Server error fetching all users' });
  }
};

// @desc Delete user by Super Admin
// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.isSuperAdmin || targetUser.email === 'admin@gmail.com') {
      return res.status(403).json({ message: 'Super Admin account cannot be deleted' });
    }

    // Delete user memberships and references
    await GroupMember.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    return res.json({ message: `User ${targetUser.fullName} deleted successfully` });
  } catch (error) {
    console.error('Delete User Admin Error:', error);
    return res.status(500).json({ message: 'Server error deleting user' });
  }
};

// @desc Get all system expenses
// @route GET /api/admin/expenses
const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('groupId', 'name')
      .populate('paidBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json(expenses);
  } catch (error) {
    console.error('Get Admin Expenses Error:', error);
    return res.status(500).json({ message: 'Server error fetching all expenses' });
  }
};

// @desc Delete any expense by Super Admin
// @route DELETE /api/admin/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.screenshotPublicId) {
      await deleteFromCloudinary(expense.screenshotPublicId);
    }

    await Expense.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Expense deleted successfully by Super Admin' });
  } catch (error) {
    console.error('Delete Admin Expense Error:', error);
    return res.status(500).json({ message: 'Server error deleting expense' });
  }
};

module.exports = {
  getAdminStats,
  getAllGroups,
  deleteGroup,
  getAllUsers,
  deleteUser,
  getAllExpenses,
  deleteExpense,
};
