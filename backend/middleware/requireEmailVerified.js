const User = require('../models/User');

/**
 * Middleware to require email verification
 * Use this middleware on routes that require verified email
 */
const requireEmailVerified = async (req, res, next) => {
  try {
    // User should already be authenticated by auth middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'กรุณาเข้าสู่ระบบก่อน'
      });
    }

    // Check if email is verified
    if (!req.user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'กรุณายืนยันอีเมลของคุณก่อนใช้งานฟีเจอร์นี้',
        requiresEmailVerification: true,
        email: req.user.email
      });
    }

    next();
  } catch (error) {
    console.error('Error in requireEmailVerified middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบการยืนยันอีเมล'
    });
  }
};

module.exports = { requireEmailVerified };

