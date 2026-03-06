import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if it's the hardcoded admin
      if (decoded.id === 'admin_hardcoded' && decoded.role === 'admin') {
        // Create virtual admin user
        req.user = {
          _id: 'admin_hardcoded',
          name: 'System Administrator',
          email: process.env.ADMIN_EMAIL?.toLowerCase().trim(),
          role: 'admin',
        };
        return next();
      }

      // Normal user - get from database
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Admin only middleware
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

// Parking owner only middleware (supports both role names during migration)
export const parkingOwner = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'owner' || role === 'parkingowner') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Parking owner only.' });
};


