const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log('❌ User not found for ID:', decoded.id);
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('🔍 Admin check - User:', user.username, 'Role:', user.role, 'IsActive:', user.isActive);

    if (!['admin', 'superadmin'].includes(user.role)) {
      console.log('❌ Access denied - User role:', user.role);
      return res.status(403).json({ message: 'Admin access required' });
    }

    if (!user.isActive) {
      console.log('❌ Access denied - User inactive');
      return res.status(403).json({ message: 'Account is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Token verification error:', error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check if user is superadmin
const requireSuperAdmin = async (req, res, next) => {
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

    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check if user can access DJ mode (DJ, Admin, or SuperAdmin)
const requireDJAccess = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token provided for DJ access');
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log('❌ User not found for DJ access check:', decoded.id);
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('🔍 DJ access check - User:', user.username, 'Role:', user.role, 'IsActive:', user.isActive);

    if (!user.canAccessDJMode()) {
      console.log('❌ DJ access denied - User role:', user.role);
      return res.status(403).json({ message: 'DJ access required' });
    }

    if (!user.isActive) {
      console.log('❌ DJ access denied - User inactive');
      return res.status(403).json({ message: 'Account is inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Token verification error for DJ access:', error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = {
  requireAdmin,
  requireSuperAdmin,
  requireDJAccess
};
