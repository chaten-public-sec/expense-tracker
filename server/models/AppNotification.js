const mongoose = require('mongoose');

const appNotificationSchema = new mongoose.Schema({
  recipientUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  senderUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  type: {
    type: String,
    enum: [
      'expense_added',
      'expense_updated',
      'expense_deleted',
      'settlement_requested',
      'settlement_approved',
      'settlement_rejected',
      'group_invite',
      'group_member_joined',
      'system_alert',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  entityType: {
    type: String,
    enum: ['expense', 'settlement', 'group', 'user'],
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

appNotificationSchema.index({ recipientUserId: 1, createdAt: -1 });

module.exports = mongoose.model('AppNotification', appNotificationSchema);
