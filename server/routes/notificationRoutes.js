const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const PushSubscription = require('../models/PushSubscription');
const { getVapidPublicKey } = require('../services/pushService');
const {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');

// Persistent Application Notification Inbox Routes
router.get('/', protect, getUserNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.patch('/:id/read', protect, markAsRead);
router.patch('/read-all', protect, markAllAsRead);

// @desc Get VAPID public key for client-side subscription
// @route GET /api/notifications/vapid-key
router.get('/vapid-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(500).json({ message: 'VAPID public key not configured on server' });
  }
  return res.json({ publicKey });
});

// @desc Register a push subscription for the authenticated user
// @route POST /api/notifications/subscribe
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: 'Invalid push subscription object' });
    }

    // Upsert: update if same endpoint exists, create if not
    await PushSubscription.findOneAndUpdate(
      {
        userId: req.user._id,
        'subscription.endpoint': subscription.endpoint,
      },
      {
        userId: req.user._id,
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
      },
      { upsert: true, new: true }
    );

    console.log(`[Push] Subscription registered for user ${req.user.fullName}`);
    return res.json({ message: 'Push subscription registered successfully' });
  } catch (err) {
    console.error('[Push Subscribe Error]:', err);
    return res.status(500).json({ message: 'Failed to register push subscription' });
  }
});

// @desc Unsubscribe a push subscription
// @route POST /api/notifications/unsubscribe
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required to unsubscribe' });
    }

    await PushSubscription.deleteOne({
      userId: req.user._id,
      'subscription.endpoint': endpoint,
    });

    return res.json({ message: 'Push subscription removed successfully' });
  } catch (err) {
    console.error('[Push Unsubscribe Error]:', err);
    return res.status(500).json({ message: 'Failed to unsubscribe' });
  }
});

// @desc Register Android FCM device token for authenticated user
// @route POST /api/notifications/register-fcm
router.post('/register-fcm', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    await PushSubscription.findOneAndUpdate(
      {
        userId: req.user._id,
        fcmToken: fcmToken.trim(),
      },
      {
        userId: req.user._id,
        platform: 'android',
        fcmToken: fcmToken.trim(),
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    const tokenHash = `${fcmToken.substring(0, 8)}...${fcmToken.substring(fcmToken.length - 6)}`;
    console.log(`📱 [FCM Register] Registered token (${tokenHash}) for user ${req.user.fullName}`);
    return res.json({ message: 'FCM token registered successfully' });
  } catch (err) {
    console.error('[FCM Register Error]:', err);
    return res.status(500).json({ message: 'Failed to register FCM token' });
  }
});

// @desc Dev/Admin test push notification endpoint
// @route POST /api/notifications/test-push
router.post('/test-push', protect, async (req, res) => {
  try {
    const { sendPushToUser } = require('../services/pushService');
    await sendPushToUser(req.user._id, {
      title: 'SplitWise Test Alert',
      body: `Hello ${req.user.fullName}! Push notifications are working on SplitWise.`,
      data: { type: 'test', timestamp: new Date().toISOString() },
    });

    return res.json({ message: 'Test notification triggered successfully' });
  } catch (err) {
    console.error('[Test Push Error]:', err);
    return res.status(500).json({ message: 'Failed to send test push' });
  }
});

module.exports = router;
