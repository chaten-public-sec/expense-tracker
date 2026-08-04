const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  payer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Settlement amount must be greater than 0']
  },
  otpHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  failedAttempts: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['verification_pending', 'completed', 'cancelled', 'expired'],
    default: 'verification_pending'
  },
  verifiedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settlement', settlementSchema);
