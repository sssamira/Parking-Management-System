import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';

export const sendMessage = async (req, res) => {
  try {
    const { toUserId, message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ message: 'Message is required' });
    }
    const isAdmin = req.user?.role === 'admin';
    const userId = isAdmin ? toUserId : req.user?._id;
    if (!userId) return res.status(400).json({ message: 'User id is required' });
    const normalized = message.trim();
    const doc = await ChatMessage.create({
      user: userId,
      senderRole: isAdmin ? 'admin' : 'user',
      sender: isAdmin ? 'admin_hardcoded' : String(req.user?._id || ''),
      message: normalized,
      readByUser: !isAdmin,
      readByAdmin: isAdmin
    });
    return res.status(201).json({ message: doc });
  } catch (err) {
    return res.status(500).json({ message: 'Server error sending message' });
  }
};

export const getThread = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const userId = isAdmin ? req.query.userId : req.user?._id;
    if (!userId) return res.status(400).json({ message: 'User id is required' });
    const msgs = await ChatMessage.find({ user: userId }).sort({ createdAt: 1 }).limit(500);
    return res.json({ messages: msgs, count: msgs.length });
  } catch (err) {
    return res.status(500).json({ message: 'Server error fetching thread' });
  }
};

export const getThreads = async (req, res) => {
  try {
    const agg = await ChatMessage.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$user',
          lastMessage: { $first: '$message' },
          lastSenderRole: { $first: '$senderRole' },
          lastAt: { $first: '$createdAt' },
          unreadForAdmin: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$senderRole', 'user'] }, { $eq: ['$readByAdmin', false] }] }, 1, 0]
            }
          },
          unreadForUser: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$senderRole', 'admin'] }, { $eq: ['$readByUser', false] }] }, 1, 0]
            }
          }
        }
      },
      { $sort: { lastAt: -1 } }
    ]);
    const ids = agg.map(a => a._id);
    const users = await User.find({ _id: { $in: ids } }).select('name email');
    const usersMap = new Map(users.map(u => [String(u._id), u]));
    const threads = agg.map(t => ({
      userId: t._id,
      user: usersMap.get(String(t._id)) || null,
      lastMessage: t.lastMessage,
      lastSenderRole: t.lastSenderRole,
      lastAt: t.lastAt,
      unreadForAdmin: t.unreadForAdmin,
      unreadForUser: t.unreadForUser
    }));
    return res.json({ threads, count: threads.length });
  } catch (err) {
    return res.status(500).json({ message: 'Server error fetching threads' });
  }
};
export const markRead = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const userId = isAdmin ? req.params.userId : req.user?._id;
    if (!userId) return res.status(400).json({ message: 'User id is required' });
    let q;
    let update;
    if (isAdmin) {
      q = { user: userId, senderRole: 'user', readByAdmin: false };
      update = { readByAdmin: true };
    } else {
      q = { user: userId, senderRole: 'admin', readByUser: false };
      update = { readByUser: true };
    }
    const r = await ChatMessage.updateMany(q, update);
    return res.json({ updated: r.modifiedCount || 0 });
  } catch (err) {
    return res.status(500).json({ message: 'Server error marking read' });
  }
};
