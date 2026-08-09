const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Retrieve VAPID credentials or auto-generate fallback pair if missing
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidContact = process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@example.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('[Web Push] VAPID keys missing in env. Auto-generating keypair for Web Push...');
  const generatedKeys = webpush.generateVAPIDKeys();
  vapidPublicKey = generatedKeys.publicKey;
  vapidPrivateKey = generatedKeys.privateKey;
  process.env.VAPID_PUBLIC_KEY = vapidPublicKey;
  process.env.VAPID_PRIVATE_KEY = vapidPrivateKey;
}

webpush.setVapidDetails(vapidContact, vapidPublicKey, vapidPrivateKey);
console.log('[Web Push] VAPID credentials active');

/**
 * Get configured VAPID public key
 */
const getVapidPublicKey = () => vapidPublicKey;

/**
 * Send a push notification to all subscriptions for a given user
 * @param {string} userId
 * @param {{ title: string, body: string, data?: object, icon?: string }} payload
 */
const sendPushToUser = async (userId, payload) => {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  try {
    const subscriptions = await PushSubscription.find({ userId: userId.toString() });

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title || 'SplitWise',
      body: payload.body || '',
      data: payload.data || {},
      icon: payload.icon || '/favicon.ico',
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(sub.subscription, pushPayload).catch(async (err) => {
          // 410 Gone or 404 means the subscription is invalid/expired — clean up
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`[Web Push] Removing expired subscription for user ${userId}: ${sub.subscription.endpoint.substring(0, 50)}...`);
            await PushSubscription.deleteOne({ _id: sub._id });
          } else {
            console.error(`[Web Push] Error sending to user ${userId}:`, err.message);
          }
          throw err;
        })
      )
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (sent > 0) {
      console.log(`[Web Push] Sent ${sent} notification(s) to user ${userId}${failed > 0 ? ` (${failed} failed)` : ''}`);
    }
  } catch (err) {
    console.error(`[Web Push] Unexpected error for user ${userId}:`, err.message);
  }
};

/**
 * Send push notifications to a list of users, optionally excluding one
 * @param {string[]} userIds
 * @param {{ title: string, body: string, data?: object }} payload
 * @param {string|null} excludeUserId
 */
const sendPushToUsers = async (userIds, payload, excludeUserId = null) => {
  const excludeId = excludeUserId ? excludeUserId.toString() : null;

  const promises = userIds
    .map((id) => id.toString())
    .filter((id) => id !== excludeId)
    .map((id) => sendPushToUser(id, payload));

  await Promise.allSettled(promises);
};

/**
 * Send push notifications to all members of a group, optionally excluding one
 * @param {string} groupId
 * @param {{ title: string, body: string, data?: object }} payload
 * @param {string|null} excludeUserId
 */
const sendPushToGroup = async (groupId, payload, excludeUserId = null) => {
  const GroupMember = require('../models/GroupMember');

  try {
    const members = await GroupMember.find({ groupId });
    const userIds = members.map((m) => m.userId.toString());
    await sendPushToUsers(userIds, payload, excludeUserId);
  } catch (err) {
    console.error(`[Web Push] Error sending group push for group ${groupId}:`, err.message);
  }
};

module.exports = {
  getVapidPublicKey,
  sendPushToUser,
  sendPushToUsers,
  sendPushToGroup,
};
