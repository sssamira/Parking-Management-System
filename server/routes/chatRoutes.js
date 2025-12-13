import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import { sendMessage, getThread, getThreads, markRead } from '../controllers/chatController.js';

const router = express.Router();

router.post('/message', protect, sendMessage);
router.get('/thread', protect, getThread);
router.get('/threads', protect, admin, getThreads);
router.patch('/read', protect, markRead);
router.patch('/:userId/read', protect, markRead);

export default router;