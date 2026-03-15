const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    console.log('🔐 Auth middleware:', {
      hasToken: !!token,
      tokenLength: token?.length,
      endpoint: req.path,
      method: req.method
    });
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ message: "Access token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Token decoded:', { userId: decoded.id, type: typeof decoded.id });
    
    const user = await User.findById(decoded.id);

    if (!user) {
      console.log('❌ User not found:', decoded.id);
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isActive) {
      console.log('❌ User account deactivated:', decoded.id);
      return res.status(401).json({ message: "Account is deactivated" });
    }

    // อัปเดตสถานะออนไลน์เมื่อมีการใช้งาน API
    const now = new Date();
    
    // อัพเดท lastActive ทุกครั้งที่เรียก API เพื่อให้สถานะ online แม่นยำ
    user.lastActive = now;
    user.isOnline = true;
    await user.save();
    
    console.log(`🔄 Updated user ${user._id} lastActive: ${now.toISOString()}`);

    console.log('✅ Auth successful:', { userId: user._id, username: user.username });
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Auth failed:', error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { auth };
