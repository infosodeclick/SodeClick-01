const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to bypass membership restrictions for admin users
const bypassMembershipRestrictions = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(); // Continue with normal restrictions
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id || decoded.userId);

    if (!user) {
      return next(); // Continue with normal restrictions
    }

    // If user is admin, superadmin, or DJ, bypass membership restrictions
    if (['admin', 'superadmin', 'dj'].includes(user.role)) {
      req.user = user;
      req.isAdmin = true;
      req.adminPrivileges = {
        bypassDailyLimits: true,
        bypassMembershipTier: true,
        bypassPaymentRestrictions: true,
        unlimitedAccess: true
      };
    }

    next();
  } catch (error) {
    next(); // Continue with normal restrictions if token is invalid
  }
};

// Helper function to check if user has admin privileges
const hasAdminPrivileges = (req) => {
  return req.isAdmin === true;
};

// Middleware to check daily usage limits (with admin bypass)
const checkDailyUsage = async (req, res, next) => {
  try {
    if (hasAdminPrivileges(req)) {
      return next(); // Admin bypass
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastReset = new Date(user.dailyUsage?.lastReset || 0);
    lastReset.setHours(0, 0, 0, 0);

    // Reset daily usage if it's a new day
    if (lastReset < today) {
      user.dailyUsage = {
        chatCount: 0,
        imageUploadCount: 0,
        videoUploadCount: 0,
        lastReset: new Date()
      };
      await user.save();
    }

    // Check limits based on membership tier
    const limits = {
      member: { chats: 10, images: 3, videos: 1 },
      silver: { chats: 20, images: 5, videos: 2 },
      gold: { chats: 50, images: 10, videos: 5 },
      vip: { chats: 100, images: 20, videos: 10 },
      vip1: { chats: 150, images: 30, videos: 15 },
      vip2: { chats: 200, images: 40, videos: 20 },
      diamond: { chats: 300, images: 60, videos: 30 },
      platinum: { chats: 500, images: 100, videos: 50 }
    };

    const tier = user.membership?.tier || 'member';
    const tierLimits = limits[tier] || limits.member;

    req.dailyLimits = tierLimits;
    req.currentUsage = user.dailyUsage;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Middleware to check membership tier requirements
const checkMembershipTier = (requiredTier) => {
  return (req, res, next) => {
    try {
      if (hasAdminPrivileges(req)) {
        return next(); // Admin bypass
      }

      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const tiers = ['member', 'silver', 'gold', 'vip', 'vip1', 'vip2', 'diamond', 'platinum'];
      const userTier = user.membership?.tier || 'member';
      const userTierIndex = tiers.indexOf(userTier);
      const requiredTierIndex = tiers.indexOf(requiredTier);

      if (userTierIndex < requiredTierIndex) {
        return res.status(403).json({ 
          message: `This feature requires ${requiredTier} membership or higher`,
          requiredTier,
          currentTier: userTier
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
};

// Middleware to check coin balance (with admin bypass)
const checkCoinBalance = (requiredCoins) => {
  return (req, res, next) => {
    try {
      if (hasAdminPrivileges(req)) {
        return next(); // Admin bypass
      }

      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (user.coins < requiredCoins) {
        return res.status(402).json({ 
          message: 'Insufficient coins',
          required: requiredCoins,
          current: user.coins
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
};

module.exports = {
  bypassMembershipRestrictions,
  hasAdminPrivileges,
  checkDailyUsage,
  checkMembershipTier,
  checkCoinBalance
};
