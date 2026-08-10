const Settlement = require('../models/Settlement');
const GroupMember = require('../models/GroupMember');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { deleteFromCloudinary } = require('../config/cloudinary');
const { emitToUser, emitToGroup } = require('../socket/socketManager');
const { sendPushToUser } = require('../services/pushService');

// @desc Initiate payment settlement (Online UPI or Cash) or promise (No OTP)
// @route POST /api/settlements
const createSettlement = async (req, res) => {
  try {
    const {
      receiverId,
      amount,
      paymentMethod = 'upi',
      actionType,
      proofUrl,
      proofPublicId,
      note
    } = req.body;

    if (req.user.isSuperAdmin || req.user.email === 'admin@gmail.com') {
      return res.status(403).json({ message: 'Super Admin accounts cannot create personal settlements.' });
    }

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

    // Determine status & validation:
    let status = 'paid_pending_approval';

    if (actionType === 'will_pay_soon') {
      status = 'will_pay_soon';
    } else if (paymentMethod === 'upi') {
      // Online UPI settlements MANDATE payment screenshot proof
      if (!proofUrl || !proofUrl.trim()) {
        return res.status(400).json({
          message: 'Payment confirmation screenshot is required for online UPI payments.'
        });
      }
      status = 'paid_pending_approval';
    } else if (paymentMethod === 'cash') {
      // Cash payment requires receiver's 1-tap confirmation
      status = 'paid_pending_approval';
    }

    const settlement = await Settlement.create({
      groupId,
      payer: payerId,
      receiver: receiverId,
      amount: numAmount,
      paymentMethod: paymentMethod === 'cash' ? 'cash' : 'upi',
      status,
      proofUrl: proofUrl || null,
      proofPublicId: proofPublicId || null,
      note: note || '',
      paidAt: new Date(),
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('payer', 'fullName email phone upiId qrCodeUrl')
      .populate('receiver', 'fullName email phone upiId qrCodeUrl');

    // Log Activity
    const actionMsg = status === 'will_pay_soon'
      ? `promised to pay ₹${numAmount.toFixed(2)} to ${receiverUser.fullName} soon`
      : paymentMethod === 'cash'
      ? `marked ₹${numAmount.toFixed(2)} as paid in cash to ${receiverUser.fullName}`
      : `paid ₹${numAmount.toFixed(2)} via UPI to ${receiverUser.fullName} (proof attached)`;

    await Activity.create({
      groupId,
      user: req.user._id,
      action: actionMsg
    });

    // --- Socket.IO + Push Notification to RECEIVER ---
    const notifTitle = status === 'will_pay_soon'
      ? 'Payment Promise'
      : paymentMethod === 'cash'
      ? 'Cash Payment Received for Verification'
      : 'UPI Payment Received for Verification';

    const notifMsg = status === 'will_pay_soon'
      ? `${req.user.fullName} says they will pay ₹${numAmount.toFixed(2)} soon.`
      : paymentMethod === 'cash'
      ? `${req.user.fullName} marked ₹${numAmount.toFixed(2)} as paid in cash. Please confirm receipt.`
      : `${req.user.fullName} paid ₹${numAmount.toFixed(2)} via UPI and uploaded proof for your verification.`;

    // 1. Target notification to receiver
    emitToUser(receiverId, 'notification', {
      type: 'settlement:submitted',
      settlement: populated,
      message: notifMsg,
      actorName: req.user.fullName,
      timestamp: new Date().toISOString(),
    });

    sendPushToUser(receiverId, {
      title: notifTitle,
      body: notifMsg,
      data: { type: 'settlement:submitted', settlementId: settlement._id.toString() },
    });

    // 2. Broadcast settlement change to the entire group so dashboards & history stay in sync
    emitToGroup(groupId, 'settlement:updated', {
      settlement: populated,
      action: 'created',
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Create Settlement Error:', error);
    return res.status(500).json({ message: 'Server error creating settlement' });
  }
};

// @desc Receiver approves payment (Online proof or Cash)
// @route POST /api/settlements/:id/approve
const approveSettlement = async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id)
      .populate('payer', 'fullName email phone upiId qrCodeUrl')
      .populate('receiver', 'fullName email phone upiId qrCodeUrl');

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    if (settlement.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the payment receiver can approve this settlement' });
    }

    settlement.status = 'completed';
    settlement.verifiedAt = new Date();
    settlement.rejectionReason = '';
    await settlement.save();

    // Log Activity
    const methodLabel = settlement.paymentMethod === 'cash' ? 'cash payment' : 'payment proof';
    await Activity.create({
      groupId: settlement.groupId,
      user: req.user._id,
      action: `approved ₹${settlement.amount.toFixed(2)} ${methodLabel} from ${settlement.payer.fullName}`
    });

    // Notify Payer
    const payerId = settlement.payer._id.toString();
    const notifMsg = settlement.paymentMethod === 'cash'
      ? `${req.user.fullName} confirmed receiving ₹${settlement.amount.toFixed(2)} cash from you! Settlement completed.`
      : `${req.user.fullName} approved your ₹${settlement.amount.toFixed(2)} payment proof! Settlement completed.`;

    emitToUser(payerId, 'notification', {
      type: 'settlement:approved',
      settlement,
      message: notifMsg,
      actorName: req.user.fullName,
      timestamp: new Date().toISOString(),
    });

    sendPushToUser(payerId, {
      title: 'Payment Approved!',
      body: notifMsg,
      data: { type: 'settlement:approved', settlementId: settlement._id.toString() },
    });

    // Broadcast to group room to trigger live balance recalculations on all connected clients
    emitToGroup(settlement.groupId, 'settlement:updated', {
      settlement,
      action: 'approved',
      timestamp: new Date().toISOString(),
    });

    return res.json({ message: 'Settlement approved and completed successfully', settlement });
  } catch (error) {
    console.error('Approve Settlement Error:', error);
    return res.status(500).json({ message: 'Server error approving settlement' });
  }
};

// @desc Receiver rejects payment proof or cash notice
// @route POST /api/settlements/:id/reject
const rejectSettlement = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const settlement = await Settlement.findById(req.params.id)
      .populate('payer', 'fullName email phone upiId qrCodeUrl')
      .populate('receiver', 'fullName email phone upiId qrCodeUrl');

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    if (settlement.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the payment receiver can reject this settlement' });
    }

    const cleanReason = (rejectionReason && rejectionReason.trim()) || 'Payment was not verified by receiver';
    settlement.status = 'rejected';
    settlement.rejectionReason = cleanReason;
    await settlement.save();

    // Log Activity
    await Activity.create({
      groupId: settlement.groupId,
      user: req.user._id,
      action: `rejected ₹${settlement.amount.toFixed(2)} payment from ${settlement.payer.fullName}: "${cleanReason}"`
    });

    // Notify Payer
    const payerId = settlement.payer._id.toString();
    const notifMsg = `${req.user.fullName} rejected your ₹${settlement.amount.toFixed(2)} payment. Reason: ${cleanReason}`;

    emitToUser(payerId, 'notification', {
      type: 'settlement:rejected',
      settlement,
      message: notifMsg,
      actorName: req.user.fullName,
      timestamp: new Date().toISOString(),
    });

    sendPushToUser(payerId, {
      title: 'Payment Rejected',
      body: notifMsg,
      data: { type: 'settlement:rejected', settlementId: settlement._id.toString() },
    });

    // Broadcast to group room
    emitToGroup(settlement.groupId, 'settlement:updated', {
      settlement,
      action: 'rejected',
      timestamp: new Date().toISOString(),
    });

    return res.json({ message: 'Settlement rejected', settlement });
  } catch (error) {
    console.error('Reject Settlement Error:', error);
    return res.status(500).json({ message: 'Server error rejecting settlement' });
  }
};

// @desc Payer re-uploads new proof for rejected settlement
// @route POST /api/settlements/:id/reupload-proof
const reuploadProof = async (req, res) => {
  try {
    const { proofUrl, proofPublicId } = req.body;
    const settlement = await Settlement.findById(req.params.id)
      .populate('payer', 'fullName email phone upiId qrCodeUrl')
      .populate('receiver', 'fullName email phone upiId qrCodeUrl');

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    if (settlement.payer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the payer can upload new proof for this settlement' });
    }

    if (!proofUrl || !proofUrl.trim()) {
      return res.status(400).json({ message: 'Valid payment proof screenshot URL is required' });
    }

    // Clean up old proof from Cloudinary if replacing
    if (settlement.proofPublicId && settlement.proofPublicId !== proofPublicId) {
      await deleteFromCloudinary(settlement.proofPublicId);
    }

    settlement.proofUrl = proofUrl.trim();
    settlement.proofPublicId = proofPublicId || null;
    settlement.status = 'paid_pending_approval';
    settlement.rejectionReason = '';
    await settlement.save();

    // Log Activity
    await Activity.create({
      groupId: settlement.groupId,
      user: req.user._id,
      action: `uploaded replacement payment proof for ₹${settlement.amount.toFixed(2)} to ${settlement.receiver.fullName}`
    });

    // Notify Receiver
    const receiverId = settlement.receiver._id.toString();
    const notifMsg = `${req.user.fullName} uploaded a new payment proof for ₹${settlement.amount.toFixed(2)}. Please verify.`;

    emitToUser(receiverId, 'notification', {
      type: 'settlement:submitted',
      settlement,
      message: notifMsg,
      actorName: req.user.fullName,
      timestamp: new Date().toISOString(),
    });

    sendPushToUser(receiverId, {
      title: 'New Payment Proof Uploaded',
      body: notifMsg,
      data: { type: 'settlement:submitted', settlementId: settlement._id.toString() },
    });

    emitToGroup(settlement.groupId, 'settlement:updated', {
      settlement,
      action: 'reuploaded',
      timestamp: new Date().toISOString(),
    });

    return res.json({ message: 'Payment proof re-uploaded successfully', settlement });
  } catch (error) {
    console.error('Reupload Proof Error:', error);
    return res.status(500).json({ message: 'Server error re-uploading payment proof' });
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

    emitToGroup(settlement.groupId, 'settlement:updated', {
      settlement,
      action: 'cancelled',
      timestamp: new Date().toISOString(),
    });

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
  reuploadProof,
  deleteSettlementProof,
  cancelSettlement,
  getSettlements
};
