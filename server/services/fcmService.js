/**
 * Send FCM Notification to a list of Android FCM registration tokens.
 * @param {string[]} fcmTokens
 * @param {{ title: string, body: string, data?: object, icon?: string }} payload
 */
const sendFCMNotification = async (fcmTokens, payload) => {
  if (!fcmTokens || fcmTokens.length === 0) return { sent: 0, failed: 0 };

  const fcmServerKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;

  if (!fcmServerKey) {
    const tokenHashes = fcmTokens.map(t => `${t.substring(0, 8)}...${t.substring(t.length - 6)}`);
    console.log(`📱 [FCM Notification Ready] FCM Server Key missing in env, payload queued for tokens: ${tokenHashes.join(', ')}`);
    console.log(`📱 [FCM Notification Payload]: Title="${payload.title}", Body="${payload.body}"`);
    return { sent: fcmTokens.length, failed: 0, dryRun: true };
  }

  let sent = 0;
  let failed = 0;

  for (const token of fcmTokens) {
    try {
      const fcmBody = JSON.stringify({
        to: token,
        priority: 'high',
        content_available: true,
        notification: {
          title: payload.title || 'SplitWise',
          body: payload.body || '',
          icon: 'ic_launcher',
          color: '#2563eb',
          android_channel_id: 'splitwise_notifications',
          sound: 'default',
        },
        data: payload.data || {},
      });

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${fcmServerKey}`,
          'Content-Type': 'application/json',
        },
        body: fcmBody,
      });

      const data = await response.json();

      if (response.ok && data && data.success === 1) {
        sent++;
      } else {
        failed++;
        const tokenHash = `${token.substring(0, 8)}...${token.substring(token.length - 6)}`;
        console.warn(`[FCM Push Warning] Error sending to token ${tokenHash}:`, data);
        if (data?.results?.[0]?.error === 'NotRegistered' || data?.results?.[0]?.error === 'InvalidRegistration') {
          const PushSubscription = require('../models/PushSubscription');
          console.log(`📱 [FCM Cleanup] Removing stale FCM token ${tokenHash}`);
          await PushSubscription.deleteOne({ fcmToken: token });
        }
      }
    } catch (err) {
      failed++;
      const tokenHash = `${token.substring(0, 8)}...${token.substring(token.length - 6)}`;
      console.error(`[FCM Push Error] Failed for token ${tokenHash}:`, err.message);
    }
  }

  console.log(`📱 [FCM Push Complete] Sent ${sent} Android notification(s) (${failed} failed)`);
  return { sent, failed };
};

module.exports = {
  sendFCMNotification,
};
