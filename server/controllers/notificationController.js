import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

// @desc    Get all notifications for admin
// @route   GET /api/admin/notifications
// @access  Private (Admin)
export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ forRole: 'admin' })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const formatted = notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link || undefined,
      read: n.read,
      time: n.createdAt,
    }));

    return res.status(200).json({ notifications: formatted });
  } catch (err) {
    console.error('Get admin notifications error:', err.message);
    return res.status(500).json({ message: 'Failed to load notifications' });
  }
};

// @desc    Mark a notification as read
// @route   PATCH /api/admin/notifications/:id/read
// @access  Private (Admin)
export const markNotificationRead = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: id, forRole: 'admin' },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.status(200).json({ read: true });
  } catch (err) {
    console.error('Mark notification read error:', err.message);
    return res.status(500).json({ message: 'Failed to update notification' });
  }
};

// @desc    Mark all admin notifications as read
// @route   PATCH /api/admin/notifications/read-all
// @access  Private (Admin)
export const markAllAdminNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ forRole: 'admin' }, { read: true });
    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all notifications read error:', err.message);
    return res.status(500).json({ message: 'Failed to update notifications' });
  }
};
