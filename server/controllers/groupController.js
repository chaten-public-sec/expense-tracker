const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { calculateGroupBalances } = require('../utils/balance');
const { calculateBillingCycle } = require('../utils/billingCycle');
const { emitToUser, emitToGroup } = require('../socket/socketManager');
const { sendPushToUser, sendPushToGroup } = require('../services/pushService');

// Generate random 6-character uppercase alphanumeric code
const generateInviteCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// @desc Create a new group
// @route POST /api/groups
const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Check if user is already in a group
    const existingMembership = await GroupMember.findOne({ userId: req.user._id });
    if (existingMembership) {
      return res.status(400).json({ message: 'You are already a member of a group. Please leave your current group before creating a new one.' });
    }

    // Generate unique 6-character invite code
    let inviteCode = generateInviteCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const existing = await Group.findOne({ inviteCode });
      if (!existing) {
        isUnique = true;
      } else {
        inviteCode = generateInviteCode();
        attempts++;
      }
    }

    const group = await Group.create({
      name: name.trim(),
      inviteCode,
      createdBy: req.user._id
    });

    // Register user as creator in GroupMember collection
    const membership = await GroupMember.create({
      groupId: group._id,
      userId: req.user._id,
      role: 'creator'
    });

    // Activity log
    await Activity.create({
      groupId: group._id,
      user: req.user._id,
      action: `created group "${group.name}"`
    });

    return res.status(201).json({
      group,
      role: membership.role
    });
  } catch (error) {
    console.error('Create Group Error:', error);
    return res.status(500).json({ message: 'Server error creating group' });
  }
};

// @desc Join an existing group using invite code
// @route POST /api/groups/join
const joinGroup = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    const formattedCode = inviteCode.trim().toUpperCase();

    const group = await Group.findOne({ inviteCode: formattedCode });
    if (!group) {
      return res.status(404).json({ message: 'Invalid invite code. Group not found.' });
    }

    // Check if user is already in ANY group
    const existingMembership = await GroupMember.findOne({ userId: req.user._id });
    if (existingMembership) {
      if (existingMembership.groupId.toString() === group._id.toString()) {
        return res.status(400).json({ message: 'You are already a member of this group.' });
      }
      return res.status(400).json({ message: 'You are already in another group. Please leave your current group first.' });
    }

    const membership = await GroupMember.create({
      groupId: group._id,
      userId: req.user._id,
      role: 'member'
    });

    await Activity.create({
      groupId: group._id,
      user: req.user._id,
      action: 'joined the group'
    });

    // --- Socket.IO + Push Notification to existing group members ---
    emitToGroup(group._id, 'notification', {
      type: 'group:member_joined',
      message: `${req.user.fullName} joined the group`,
      actorName: req.user.fullName,
      timestamp: new Date().toISOString(),
    }, req.user._id.toString());

    sendPushToGroup(group._id, {
      title: 'New Member Joined',
      body: `${req.user.fullName} joined your group "${group.name}"`,
      data: { type: 'group:member_joined' },
    }, req.user._id.toString());

    return res.json({
      group,
      role: membership.role
    });
  } catch (error) {
    console.error('Join Group Error:', error);
    return res.status(500).json({ message: 'Server error joining group' });
  }
};

// @desc Get active group info, members, and billing cycle
// @route GET /api/groups/info
const getGroupInfo = async (req, res) => {
  try {
    const membership = await GroupMember.findOne({ userId: req.user._id }).populate('groupId');
    if (!membership || !membership.groupId) {
      return res.status(404).json({ message: 'You are not part of any group.' });
    }

    const group = membership.groupId;
    const { totalPaidMap, everyoneShareMap, specificShareMap, totalOwesMap, totalReceivesMap, pairwiseOwesMap, pairwiseReceivesMap } = await calculateGroupBalances(group._id);

    const members = await GroupMember.find({ groupId: group._id }).populate('userId', 'fullName email phone upiId qrCodeUrl');

    const memberList = members.map(m => {
      const uId = m.userId._id.toString();
      return {
        _id: uId,
        fullName: m.userId.fullName,
        email: m.userId.email,
        phone: m.userId.phone,
        upiId: m.userId.upiId || '',
        qrCodeUrl: m.userId.qrCodeUrl || null,
        role: m.role,
        joinedAt: m.joinedAt,
        totalPaid: Math.round((totalPaidMap[uId] || 0) * 100) / 100,
        everyoneShare: Math.round((everyoneShareMap[uId] || 0) * 100) / 100,
        specificShare: Math.round((specificShareMap[uId] || 0) * 100) / 100,
        totalOwes: Math.round((totalOwesMap[uId] || 0) * 100) / 100,
        totalReceives: Math.round((totalReceivesMap[uId] || 0) * 100) / 100,
        netBalance: Math.round(((totalReceivesMap[uId] || 0) - (totalOwesMap[uId] || 0)) * 100) / 100,
        owesList: pairwiseOwesMap[uId] || [],
        receivesList: pairwiseReceivesMap[uId] || []
      };
    });

    const billingCycle = calculateBillingCycle(group.payday);

    return res.json({
      group,
      userRole: membership.role,
      members: memberList,
      billingCycle
    });
  } catch (error) {
    console.error('Get Group Info Error:', error);
    return res.status(500).json({ message: 'Server error fetching group info' });
  }
};

// @desc Set / update Group Payday (Admin only)
// @route PUT /api/groups/payday
const setPayday = async (req, res) => {
  try {
    const { payday } = req.body;

    const membership = await GroupMember.findOne({ userId: req.user._id });
    if (!membership) {
      return res.status(400).json({ message: 'You are not part of any group.' });
    }

    if (membership.role !== 'creator') {
      return res.status(403).json({ message: 'Forbidden: Only the group admin can set the group payday.' });
    }

    const group = await Group.findById(membership.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    let numericPayday = null;
    if (payday !== null && payday !== undefined && payday !== '') {
      numericPayday = parseInt(payday, 10);
      if (isNaN(numericPayday) || numericPayday < 1 || numericPayday > 31) {
        return res.status(400).json({ message: 'Payday must be a day of the month between 1 and 31' });
      }
    }

    group.payday = numericPayday;
    await group.save();

    const billingCycle = calculateBillingCycle(group.payday);

    await Activity.create({
      groupId: group._id,
      user: req.user._id,
      action: numericPayday ? `set group payday to day ${numericPayday} of every month` : 'disabled payday billing cycle'
    });

    // Notify group members
    if (numericPayday) {
      emitToGroup(group._id, 'notification', {
        type: 'group:payday_updated',
        message: `${req.user.fullName} set monthly payday to day ${numericPayday} of every month`,
        actorName: req.user.fullName,
        timestamp: new Date().toISOString(),
      }, req.user._id.toString());
    }

    return res.json({
      message: numericPayday ? `Payday updated to day ${numericPayday} of every month` : 'Payday cleared',
      group,
      billingCycle
    });
  } catch (error) {
    console.error('Set Payday Error:', error);
    return res.status(500).json({ message: 'Server error setting group payday' });
  }
};

// @desc Send manual "Pay Now" reminder to a group member (Admin only)
// @route POST /api/groups/remind-member
const sendPaymentReminder = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    const membership = await GroupMember.findOne({ userId: req.user._id });
    if (!membership) {
      return res.status(400).json({ message: 'You are not part of any group.' });
    }

    if (membership.role !== 'creator') {
      return res.status(403).json({ message: 'Forbidden: Only the group admin can send payment reminders.' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target member not found' });
    }

    // Check balances to get owed details
    const balances = await calculateGroupBalances(membership.groupId, targetUserId);
    const owedTotal = balances.currentUserSummary.youNeedToPayTotal;

    const adminUser = await User.findById(req.user._id);

    const message = owedTotal > 0
      ? `Payday Reminder from Admin ${adminUser.fullName}: You have pending dues of ₹${owedTotal.toFixed(2)}. Please pay your flatmates!`
      : `Payment Reminder from Admin ${adminUser.fullName}: Please check your flatmate balance and settle up.`;

    // Socket.IO + Push Notification
    emitToUser(targetUserId, 'notification', {
      type: 'group:pay_now_reminder',
      message,
      actorName: adminUser.fullName,
      amount: owedTotal,
      adminUpiId: adminUser.upiId || '',
      adminQrCodeUrl: adminUser.qrCodeUrl || null,
      timestamp: new Date().toISOString(),
    });

    sendPushToUser(targetUserId, {
      title: '⚡ Pay Now Reminder',
      body: message,
      data: { type: 'group:pay_now_reminder', targetUserId },
    });

    return res.json({
      message: `Payment reminder sent successfully to ${targetUser.fullName}`
    });
  } catch (error) {
    console.error('Send Payment Reminder Error:', error);
    return res.status(500).json({ message: 'Server error sending payment reminder' });
  }
};

// @desc Leave current group
// @route POST /api/groups/leave
const leaveGroup = async (req, res) => {
  try {
    const membership = await GroupMember.findOne({ userId: req.user._id });
    if (!membership) {
      return res.status(400).json({ message: 'You are not part of any group.' });
    }

    const groupId = membership.groupId;
    const balances = await calculateGroupBalances(groupId, req.user._id.toString());
    const userSummary = balances.currentUserSummary;

    if (userSummary.youNeedToPayTotal > 0 || userSummary.youWillReceiveTotal > 0) {
      return res.status(400).json({
        message: 'Please settle all balances before leaving the group.',
        youNeedToPayTotal: userSummary.youNeedToPayTotal,
        youWillReceiveTotal: userSummary.youWillReceiveTotal
      });
    }

    await GroupMember.deleteOne({ _id: membership._id });

    if (membership.role === 'creator') {
      const nextMember = await GroupMember.findOne({ groupId });
      if (nextMember) {
        nextMember.role = 'creator';
        await nextMember.save();
      } else {
        await Group.deleteOne({ _id: groupId });
      }
    }

    return res.json({ message: 'Successfully left the group.' });
  } catch (error) {
    console.error('Leave Group Error:', error);
    return res.status(500).json({ message: 'Server error leaving group' });
  }
};

// @desc Delete group (Creator only)
// @route DELETE /api/groups
const deleteGroup = async (req, res) => {
  try {
    const membership = await GroupMember.findOne({ userId: req.user._id });
    if (!membership) {
      return res.status(404).json({ message: 'You are not part of any group.' });
    }

    if (membership.role !== 'creator') {
      return res.status(403).json({ message: 'Only the group creator can delete the group.' });
    }

    const groupId = membership.groupId;

    await GroupMember.deleteMany({ groupId });
    await Expense.deleteMany({ groupId });
    await Settlement.deleteMany({ groupId });
    await Activity.deleteMany({ groupId });
    await Group.deleteOne({ _id: groupId });

    return res.json({ message: 'Group deleted successfully.' });
  } catch (error) {
    console.error('Delete Group Error:', error);
    return res.status(500).json({ message: 'Server error deleting group' });
  }
};

module.exports = {
  createGroup,
  joinGroup,
  getGroupInfo,
  setPayday,
  sendPaymentReminder,
  leaveGroup,
  deleteGroup
};
