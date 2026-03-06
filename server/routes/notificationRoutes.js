import express from 'express';
import {
  getAdminNotifications,
  markNotificationRead,
  markAllAdminNotificationsRead,
} from '../controllers/notificationController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, admin, getAdminNotifications);
router.patch('/read-all', protect, admin, markAllAdminNotificationsRead);
router.patch('/:id/read', protect, admin, markNotificationRead);

export default router;
