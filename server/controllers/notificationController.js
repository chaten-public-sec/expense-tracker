const AppNotification = require('../models/AppNotification');

/**
 * @desc Get user's persistent application notifications from MongoDB
 * @route GET /api/notifications
 */
const getUserNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const notifications = await AppNotification.find({ recipientUserId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderUserId', 'fullName email avatar');

    const unreadCount = await AppNotification.countDocuments({
      recipientUserId: req.user._id,
      read: false,
    });

    return res.json({
      notifications,
      unreadCount,
    });
  } catch (err) {
    console.error('[Notification Controller Error]:', err);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

/**
 * @desc Get unread notification count
 * @route GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await AppNotification.countDocuments({
      recipientUserId: req.user._id,
      read: false,
    });

    return res.json({ unreadCount: count });
  } catch (err) {
    console.error('[Notification Count Error]:', err);
    return res.status(500).json({ message: 'Failed to fetch unread count' });
  }
};

/**
 * @desc Mark a notification as read
 * @route PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await AppNotification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipientUserId: req.user._id,
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const unreadCount = await AppNotification.countDocuments({
      recipientUserId: req.user._id,
      read: false,
    });

    return res.json({ message: 'Notification marked as read', notification, unreadCount });
  } catch (err) {
    console.error('[Mark Read Error]:', err);
    return res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

/**
 * @desc Mark all notifications as read for current user
 * @route PATCH /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    await AppNotification.updateMany(
      { recipientUserId: req.user._id, read: false },
      { read: true }
    );

    return res.json({ message: 'All notifications marked as read', unreadCount: 0 });
  } catch (err) {
    console.error('[Mark All Read Error]:', err);
    return res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
};

/**
 * Helper utility to create and persist an AppNotification record in MongoDB
 */
const createNotificationRecord = async ({
  recipientUserId,
  senderUserId,
  type,
  title,
  message,
  entityId,
  entityType,
}) => {
  try {
    if (!recipientUserId || !type || !title || !message) return null;

    // Deduplicate: prevent duplicate notifications for exact same entity & type within 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000);
    const existing = await AppNotification.findOne({
      recipientUserId,
      type,
      entityId,
      createdAt: { $gte: tenSecondsAgo },
    });

    if (existing) {
      return existing;
    }

    const notification = await AppNotification.create({
      recipientUserId,
      senderUserId,
      type,
      title,
      message,
      entityId,
      entityType,
    });

    return notification;
  } catch (err) {
    console.error('[Create Notification Record Error]:', err);
    return null;
  }
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotificationRecord,
};
