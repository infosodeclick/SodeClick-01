const express = require('express');
const router = express.Router();

// In-memory storage for maintenance mode status
// In production, you might want to use Redis or database
let maintenanceStatus = {
  isMaintenanceMode: false,
  message: 'ระบบกำลังบำรุงรักษา กรุณารอสักครู่',
  startTime: null,
  estimatedEndTime: null,
  lastUpdated: new Date()
};

// Get maintenance status
router.get('/status', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        isMaintenanceMode: maintenanceStatus.isMaintenanceMode,
        message: maintenanceStatus.message,
        startTime: maintenanceStatus.startTime,
        estimatedEndTime: maintenanceStatus.estimatedEndTime,
        lastUpdated: maintenanceStatus.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error getting maintenance status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถานะการบำรุงรักษา'
    });
  }
});

// Toggle maintenance mode (Admin only)
router.post('/toggle', (req, res) => {
  try {
    const { isMaintenanceMode, message, estimatedHours } = req.body;
    
    // Update maintenance status
    maintenanceStatus.isMaintenanceMode = isMaintenanceMode;
    maintenanceStatus.message = message || 'ระบบกำลังบำรุงรักษา กรุณารอสักครู่';
    maintenanceStatus.lastUpdated = new Date();
    
    if (isMaintenanceMode) {
      maintenanceStatus.startTime = new Date();
      if (estimatedHours) {
        const endTime = new Date();
        endTime.setHours(endTime.getHours() + estimatedHours);
        maintenanceStatus.estimatedEndTime = endTime;
      }
    } else {
      maintenanceStatus.startTime = null;
      maintenanceStatus.estimatedEndTime = null;
    }
    
    console.log(`Maintenance mode ${isMaintenanceMode ? 'enabled' : 'disabled'} at ${maintenanceStatus.lastUpdated}`);
    
    res.json({
      success: true,
      data: {
        isMaintenanceMode: maintenanceStatus.isMaintenanceMode,
        message: maintenanceStatus.message,
        startTime: maintenanceStatus.startTime,
        estimatedEndTime: maintenanceStatus.estimatedEndTime,
        lastUpdated: maintenanceStatus.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะการบำรุงรักษา'
    });
  }
});

// Get maintenance history (Admin only)
router.get('/history', (req, res) => {
  try {
    // In production, you would fetch from database
    res.json({
      success: true,
      data: {
        current: maintenanceStatus,
        history: [] // Add maintenance history here
      }
    });
  } catch (error) {
    console.error('Error getting maintenance history:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงประวัติการบำรุงรักษา'
    });
  }
});

module.exports = router;
