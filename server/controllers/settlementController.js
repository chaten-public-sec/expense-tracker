const Settlement = require('../models/Settlement');
const GroupMember = require('../models/GroupMember');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { deleteFromCloudinary } = require('../config/cloudinary');
const { emitToUser } = require('../socket/socketManager');
const { sendPushToUser } = require('../services/pushService');

// @desc Initiate payment settlement or promise (No OTP)
// @route POST /api/settlements
const createSettlement = async (req, res) => {
  try {
    const { receiverId, amount, actionType, proofUrl, proofPublicId, note } = req.body;

    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver is required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid settlement amount is required' });
    }

    const membership = await GroupMember.findOne({ userId: req.user._id });
    if (!membership) {
      return res.status(400).json({ message: 'You are not part of any group.' });
    }

    const groupId = membership.groupId;
    const payerId = req.user._id;

    if (payerId.toString() === receiverId.toString()) {
      return res.status(400).json({ message: 'You cannot settle payment with yourself' });
    }

    const receiverUser = await User.findById(receiverId);
    if (!receiverUser) {
      return res.status(404).json({ message: 'Receiver user not found' });
    }

    // Determine status:
    // If actionType === 'will_pay_soon' -> status = 'will_pay_soon'
    // If proofUrl is provided -> status = 'paid_pending_approval' (or completed)
    // Default -> 'completed'
    let status = 'completed';
    if (actionType === 'will_pay_soon') {
      status = 'will_pay_soon';
    } else if (proofUrl) {
      status = 'paid_pending_approval';
    }

    const settlement = await Settlement.create({
      groupId,
      payer: payerId,
      receiver: receiverId,
      amount: numAmount,
      status,
      proofUrl: proofUrl || null,
      proofPublicId: proofPublicId || null,
      note: note || '',
      paidAt: new Date(),
      verifiedAt: status === 'completed' ? new Date() : undefined
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('payer', 'fullName email phone upiId qrCodeUrl')
      .populate('receiver', 'fullName email phone upiId qrCodeUrl');

    // Log Activity
    const actionMsg = status === 'will_pay_soon'
      ? `promised to pay ₹${numAmount.toFixed(2)} to ${receiverUser.fullName} soon`
      : status === 'paid_pending_approval'
      ? `submitted ₹${numAmount.toFixed(2)} payment proof to ${receiverUser.fullName}`
      : `settled ₹${numAmount.toFixed(2)} with ${receiverUser.fullName}`;

    await Activity.create({
      groupId,
      user: req.user._id,
      action: actionMsg
    });

    // --- Socket.IO + Push Notification to RECEIVER ---
    const notifTitle = status === 'will_pay_soon'
      ? 'Payment Promise'
      : status === 'paid_pending_approval'
      ? 'Payment Proof Submitted'
      : 'Payment Settled!';

    const notifMsg = status === 'will_pay_soon'
      ? `${req.user.fullName} says they will pay ₹${numAmount.toFixed(2)} soon.`
      : status === 'paid_pending_approval'
      ? `${req.user.fullName} paid ₹${numAmount.toFixed(2)} and uploaded payment proof for your review.`
      : `${req.user.fullName} settled ₹${numAmount.toFixed(2)} with you.`;

    emitToUser(receiverId, 'notification', {
      type: 'settlement:created',
      settlement: populated,
      message: notifMsg,
      actorName: req.user.fullName,
      timestamp: new Date().toISOString(),
    });

    sendPushToUser(receiverId, {
      title: notifTitle,
      body: notifMsg,
      data: { type: 'settlement:created', settlementId: settlement._id.toString() },
    });

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Create Settlement Error:', error);
    return res.status(500).json({ message: 'Server error creating settlement' });
  }
};

// @desc Receiver approves payment proof
// @route POST /api/settlements/:id/approve
const approveSettlement = async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id)
      .populate('payer', 'fullName email phone')
      .populate('receiver', 'fullName email phone');

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    if (settlement.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the payment receiver can approve this settlement' });
    }

    settlement.status = 'completed';
    settlement.verifiedAt = new Date();
    await settlement.save();

    // Log Activity
    await Activity.create({
      groupId: settlement.groupId,
      user: req.user._id,
      action: `approved ₹${settlement.amount.toFixed(2)} payment proof from ${settlement.payer.fullName}`
    });

    // Notify Payer
    const payerId = settlement.payer._id.toString();
    emitToUser(payerId, 'notification', {
      type: 'settlement:approved',
      settlement,
      message: `${req.user.fullName} approved your ₹${settlement.amount.toFixed(2)} payment proof! Settlement complete.`,
      actorName: req.user.fullName,
      timestamp: new Date().toISOString(),
    });

    sendPushToUser(payerId, {
      title: 'Payment Proof Approved!',
      body: `${req.user.fullName} verified your ₹${settlement.amount.toFixed(2)} payment settlement`,
      data: { type: 'settlement:approved', settlementId: settlement._id.toString() },
    });

    return res.json({ message: 'Settlement payment proof approved successfully', settlement });
  } catch (error) {
    console.error('Approve Settlement Error:', error);
    return res.status(500).json({ message: 'Server error approving settlement' });
  }
};

// @desc Receiver rejects payment proof
// @route POST /api/settlements/:id/reject
const rejectSettlement = async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id)
      .populate('payer', 'fullName email phone')
      .populate('receiver', 'fullName email phone');

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    if (settlement.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the payment receiver can reject this settlement' });
    }

    settlement.status = 'rejected';
    await settlement.save();

    // Notify Payer
    const payerId = settlement.payer._id.toString();
    emitToUser(payerId, 'notification', {
      type: 'settlement:rejected',
      settlement,
      message: `${req.user.fullName} rejected the ₹${settlement.amount.toFixed(2)} payment proof. Please verify details.`,
      actorName: req.user.fullName,
      timestamp: new Date().toISOString(),
    });

    return res.json({ message: 'Settlement rejected', settlement });
  } catch (error) {
    console.error('Reject Settlement Error:', error);
    return res.status(500).json({ message: 'Server error rejecting settlement' });
  }
};

// @desc Delete payment proof from Cloudinary
// @route DELETE /api/settlements/:id/proof
const deleteSettlementProof = async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    const userIdStr = req.user._id.toString();
    if (settlement.payer.toString() !== userIdStr && settlement.receiver.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Not authorized to delete proof for this settlement' });
    }

    if (settlement.proofPublicId) {
      await deleteFromCloudinary(settlement.proofPublicId);
    }

    settlement.proofUrl = null;
    settlement.proofPublicId = null;
    await settlement.save();

    return res.json({ message: 'Payment proof deleted successfully from Cloudinary', settlement });
  } catch (error) {
    console.error('Delete Proof Error:', error);
    return res.status(500).json({ message: 'Server error deleting settlement proof' });
  }
};

// @desc Cancel settlement
// @route POST /api/settlements/:id/cancel
const cancelSettlement = async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) {
      return res.status(404).json({ message: 'Settlement request not found' });
    }

    const userIdStr = req.user._id.toString();
    if (settlement.payer.toString() !== userIdStr && settlement.receiver.toString() !== userIdStr) {
      return res.status(403).json({ message: 'Not authorized to cancel this settlement' });
    }

    settlement.status = 'cancelled';
    await settlement.save();

    return res.json({ message: 'Settlement cancelled successfully', settlement });
  } catch (error) {
    console.error('Cancel Settlement Error:', error);
    return res.status(500).json({ message: 'Server error cancelling settlement' });
  }
};

// @desc Get settlement history for active group
// @route GET /api/settlements
const getSettlements = async (req, res) => {
  try {
    const membership = await GroupMember.findOne({ userId: req.user._id });
    if (!membership) {
      return res.status(400).json({ message: 'You are not part of any group.' });
    }

    // Automatically migrate legacy OTP statuses in DB to modern statuses
    await Settlement.updateMany({ status: 'verification_pending' }, { status: 'paid_pending_approval' });
    await Settlement.updateMany({ status: 'expired' }, { status: 'cancelled' });

    const settlements = await Settlement.find({ groupId: membership.groupId })
      .sort({ createdAt: -1 })
      .populate('payer', 'fullName email phone upiId qrCodeUrl')
      .populate('receiver', 'fullName email phone upiId qrCodeUrl');

    return res.json(settlements);
  } catch (error) {
    console.error('Get Settlements Error:', error);
    return res.status(500).json({ message: 'Server error fetching settlement history' });
  }
};

module.exports = {
  createSettlement,
  approveSettlement,
  rejectSettlement,
  deleteSettlementProof,
  cancelSettlement,
  getSettlements
};
