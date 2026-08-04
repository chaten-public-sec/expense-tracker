const bcrypt = require('bcryptjs');
const Settlement = require('../models/Settlement');
const GroupMember = require('../models/GroupMember');
const Activity = require('../models/Activity');
const User = require('../models/User');

// Helper to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc Initiate payment settlement (Payer generates OTP)
// @route POST /api/settlements
const createSettlement = async (req, res) => {
  try {
    const { receiverId, amount } = req.body;

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

    // Cancel any existing pending settlement between these two users
    await Settlement.updateMany(
      { groupId, payer: payerId, receiver: receiverId, status: 'verification_pending' },
      { status: 'cancelled' }
    );

    // Generate 6-digit OTP & bcrypt hash
    const rawOtp = generateOTP();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(rawOtp, salt);

    // 2-minute validity
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    const settlement = await Settlement.create({
      groupId,
      payer: payerId,
      receiver: receiverId,
      amount: numAmount,
      otpHash,
      expiresAt,
      failedAttempts: 0,
      status: 'verification_pending'
    });

    const populated = await Settlement.findById(settlement._id)
      .populate('payer', 'fullName email phone')
      .populate('receiver', 'fullName email phone');

    // Return the plain rawOtp to the payer ONLY once for screen display
    return res.status(201).json({
      settlement: populated,
      otp: rawOtp, // Provided to Payer to show to Receiver
      expiresAt
    });
  } catch (error) {
    console.error('Create Settlement Error:', error);
    return res.status(500).json({ message: 'Server error initiating payment settlement' });
  }
};

// @desc Verify OTP settlement (Receiver enters OTP)
// @route POST /api/settlements/:id/verify
const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const settlementId = req.params.id;

    if (!otp || otp.trim().length !== 6) {
      return res.status(400).json({ message: 'Please enter a valid 6-digit OTP' });
    }

    const settlement = await Settlement.findById(settlementId)
      .populate('payer', 'fullName email phone')
      .populate('receiver', 'fullName email phone');

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement request not found' });
    }

    // Guard: Only designated receiver can verify payment
    if (settlement.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the receiver can verify this payment OTP' });
    }

    if (settlement.status !== 'verification_pending') {
      return res.status(400).json({ message: `Settlement is already ${settlement.status}` });
    }

    // Check expiration (2 mins)
    if (new Date() > new Date(settlement.expiresAt)) {
      settlement.status = 'expired';
      await settlement.save();
      return res.status(400).json({ message: 'OTP Expired. Please ask payer to generate a new OTP.' });
    }

    // Check failed attempt limit (max 3)
    if (settlement.failedAttempts >= 3) {
      settlement.status = 'expired';
      await settlement.save();
      return res.status(400).json({ message: 'Maximum failed attempts exceeded (3/3). OTP expired.' });
    }

    // Compare entered OTP with stored bcrypt hash
    const isMatch = await bcrypt.compare(otp.trim(), settlement.otpHash);

    if (!isMatch) {
      settlement.failedAttempts += 1;
      if (settlement.failedAttempts >= 3) {
        settlement.status = 'expired';
        await settlement.save();
        return res.status(400).json({ message: 'Invalid OTP. Maximum 3 attempts exceeded. OTP expired.' });
      }
      await settlement.save();
      return res.status(400).json({
        message: `Invalid OTP. (${settlement.failedAttempts}/3 attempts used)`
      });
    }

    // Successful OTP verification
    settlement.status = 'completed';
    settlement.verifiedAt = new Date();
    await settlement.save();

    // Log Activity
    await Activity.create({
      groupId: settlement.groupId,
      user: req.user._id,
      action: `verified ₹${settlement.amount} payment from ${settlement.payer.fullName}`
    });

    return res.json({
      message: 'Payment verified and settlement completed successfully!',
      settlement
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({ message: 'Server error verifying settlement OTP' });
  }
};

// @desc Cancel pending settlement
// @route POST /api/settlements/:id/cancel
const cancelSettlement = async (req, res) => {
  try {
    const settlement = await Settlement.findById(req.params.id);
    if (!settlement) {
      return res.status(404).json({ message: 'Settlement request not found' });
    }

    if (settlement.payer.toString() !== req.user._id.toString() && settlement.receiver.toString() !== req.user._id.toString()) {
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

    const settlements = await Settlement.find({ groupId: membership.groupId })
      .sort({ createdAt: -1 })
      .populate('payer', 'fullName email phone')
      .populate('receiver', 'fullName email phone');

    return res.json(settlements);
  } catch (error) {
    console.error('Get Settlements Error:', error);
    return res.status(500).json({ message: 'Server error fetching settlement history' });
  }
};

module.exports = {
  createSettlement,
  verifyOTP,
  cancelSettlement,
  getSettlements
};
