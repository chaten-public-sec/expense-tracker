const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  platform: {
    type: String,
    enum: ['web', 'android', 'ios'],
    default: 'web',
  },
  // Web Push Subscription object
  subscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String,
    },
  },
  // Android / Mobile FCM Registration Token
  fcmToken: {
    type: String,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

pushSubscriptionSchema.index({ userId: 1, 'subscription.endpoint': 1 });
pushSubscriptionSchema.index({ userId: 1, fcmToken: 1 });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
