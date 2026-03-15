const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check admin permissions
const requireAdminPermissions = (permissions = []) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ message: 'Access token required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Check if user is admin or superadmin
      if (!['admin', 'superadmin'].includes(user.role)) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is inactive' });
      }

      // Check specific permissions if provided
      if (permissions.length > 0) {
        const hasPermission = permissions.some(permission => {
          switch (permission) {
            case 'user_management':
              return ['admin', 'superadmin'].includes(user.role);
            case 'message_management':
              return ['admin', 'superadmin'].includes(user.role);
            case 'chatroom_management':
              return ['admin', 'superadmin'].includes(user.role);
            case 'premium_management':
              return ['admin', 'superadmin'].includes(user.role);
            case 'password_reset':
              return ['admin', 'superadmin'].includes(user.role);
            case 'unlimited_chat_access':
              return ['admin', 'superadmin'].includes(user.role);
            default:
              return false;
          }
        });

        if (!hasPermission) {
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
};

// Middleware to check DJ permissions (DJ, Admin, or SuperAdmin can access)
const requireDJPermissions = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if user can access DJ mode
    if (!user.canAccessDJMode()) {
      return res.status(403).json({ message: 'DJ access required' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin permissions constants
const ADMIN_PERMISSIONS = {
  USER_MANAGEMENT: 'user_management',
  MESSAGE_MANAGEMENT: 'message_management',
  CHATROOM_MANAGEMENT: 'chatroom_management',
  PREMIUM_MANAGEMENT: 'premium_management',
  PASSWORD_RESET: 'password_reset',
  UNLIMITED_CHAT_ACCESS: 'unlimited_chat_access'
};

module.exports = {
  requireAdminPermissions,
  requireDJPermissions,
  ADMIN_PERMISSIONS
};
