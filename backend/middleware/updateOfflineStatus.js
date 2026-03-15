const User = require('../models/User');

// Middleware สำหรับอัปเดตสถานะออฟไลน์ของผู้ใช้ที่ไม่ได้ใช้งานระบบเป็นเวลานาน
const updateOfflineStatus = async () => {
  try {
    console.log('🔄 Checking for users to set offline...');
    
    // หาผู้ใช้ที่ออนไลน์แต่ไม่ได้ใช้งานระบบมากกว่า 30 นาที
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const usersToSetOffline = await User.find({
      isOnline: true,
      lastActive: { $lt: thirtyMinutesAgo }
    });
    
    if (usersToSetOffline.length > 0) {
      console.log(`📴 Setting ${usersToSetOffline.length} users offline`);
      
      // อัปเดตสถานะออฟไลน์
      await User.updateMany(
        {
          isOnline: true,
          lastActive: { $lt: thirtyMinutesAgo }
        },
        {
          $set: { isOnline: false }
        }
      );
      
      console.log(`✅ Successfully set ${usersToSetOffline.length} users offline`);
    } else {
      console.log('✅ No users need to be set offline');
    }
    
  } catch (error) {
    console.error('❌ Error updating offline status:', error);
  }
};

// ปิดการรันอัตโนมัติ - ให้ offline เฉพาะเมื่อ logout หรือออกจากแอปเท่านั้น
// setInterval(updateOfflineStatus, 5 * 60 * 1000);

// รันครั้งแรกเมื่อเริ่มเซิร์ฟเวอร์
updateOfflineStatus();

module.exports = updateOfflineStatus;
