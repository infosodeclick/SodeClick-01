const express = require('express');
const router = express.Router();
const SystemSettings = require('../models/SystemSettings');
const User = require('../models/User');
const AdminActionLog = require('../models/AdminActionLog');
const { requireSuperAdmin } = require('../middleware/adminAuth');
const { logAdminAction } = require('../middleware/adminPrivileges');

// GET /api/settings - Get all system settings
router.get('/', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่าระบบ'
    });
  }
});

// GET /api/settings/payment-bypass - Get payment bypass settings
router.get('/payment-bypass', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    const paymentBypassInfo = {
      enabled: settings.paymentBypass?.enabled || false,
      enabledBy: settings.paymentBypass?.enabledBy || null,
      enabledAt: settings.paymentBypass?.enabledAt || null,
      reason: settings.paymentBypass?.reason || ''
    };

    // If enabled, get the user who enabled it
    if (paymentBypassInfo.enabledBy) {
      try {
        const user = await User.findById(paymentBypassInfo.enabledBy).select('username firstName lastName');
        if (user) {
          paymentBypassInfo.enabledByUser = {
            username: user.username,
            displayName: `${user.firstName} ${user.lastName}`.trim()
          };
        }
      } catch (userError) {
        console.error('Error fetching user who enabled bypass:', userError);
      }
    }

    res.json({
      success: true,
      data: paymentBypassInfo
    });
  } catch (error) {
    console.error('Error fetching payment bypass settings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า bypass payment'
    });
  }
});

// POST /api/settings/payment-bypass - Update payment bypass settings (SuperAdmin only)
router.post('/payment-bypass', requireSuperAdmin, async (req, res) => {
  try {
    const { enabled, reason = '' } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุสถานะการเปิดใช้งาน bypass mode'
      });
    }

    // Update settings
    const settings = await SystemSettings.updatePaymentBypass(enabled, req.user._id, reason);

    // Log admin action
    await AdminActionLog.createLog({
      adminId: req.user._id,
      actionType: 'superadmin_payment_settings',
      description: `SuperAdmin ${enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} Payment Bypass Mode`,
      targetUserId: null,
      metadata: {
        enabled,
        reason,
        enabledBy: req.user._id,
        enabledAt: new Date()
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    const actionText = enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
    const message = `Bypass Payment Mode ${actionText} สำเร็จ`;

    res.json({
      success: true,
      message,
      data: {
        enabled: settings.paymentBypass.enabled,
        enabledBy: settings.paymentBypass.enabledBy,
        enabledAt: settings.paymentBypass.enabledAt,
        reason: settings.paymentBypass.reason
      }
    });
  } catch (error) {
    console.error('Error updating payment bypass settings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า bypass payment'
    });
  }
});

// GET /api/settings/maintenance - Get maintenance settings
router.get('/maintenance', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    const maintenanceInfo = {
      enabled: settings.maintenance?.enabled || false,
      message: settings.maintenance?.message || 'ระบบกำลังอยู่ในระหว่างการปรับปรุง',
      estimatedTime: settings.maintenance?.estimatedTime || '',
      enabledBy: settings.maintenance?.enabledBy || null,
      enabledAt: settings.maintenance?.enabledAt || null
    };

    // If enabled, get the user who enabled it
    if (maintenanceInfo.enabledBy) {
      try {
        const user = await User.findById(maintenanceInfo.enabledBy).select('username firstName lastName');
        if (user) {
          maintenanceInfo.enabledByUser = {
            username: user.username,
            displayName: `${user.firstName} ${user.lastName}`.trim()
          };
        }
      } catch (userError) {
        console.error('Error fetching user who enabled maintenance:', userError);
      }
    }

    res.json({
      success: true,
      data: maintenanceInfo
    });
  } catch (error) {
    console.error('Error fetching maintenance settings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า maintenance'
    });
  }
});

// POST /api/settings/maintenance - Update maintenance settings (SuperAdmin only)
router.post('/maintenance', requireSuperAdmin, async (req, res) => {
  try {
    const { enabled, message = '', estimatedTime = '' } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุสถานะการเปิดใช้งาน maintenance mode'
      });
    }

    // Update settings
    const settings = await SystemSettings.updateMaintenance(enabled, message, estimatedTime, req.user._id);

    // Log admin action
    await logAdminAction(req.user._id, 'maintenance_toggle', {
      enabled,
      message,
      estimatedTime,
      timestamp: new Date()
    });

    const actionText = enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
    const successMessage = `Maintenance Mode ${actionText} สำเร็จ`;

    res.json({
      success: true,
      message: successMessage,
      data: {
        enabled: settings.maintenance.enabled,
        message: settings.maintenance.message || 'ระบบกำลังอยู่ในระหว่างการปรับปรุง',
        estimatedTime: settings.maintenance.estimatedTime || '',
        enabledBy: settings.maintenance.enabledBy,
        enabledAt: settings.maintenance.enabledAt
      }
    });
  } catch (error) {
    console.error('Error updating maintenance settings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า maintenance'
    });
  }
});

// GET /api/settings/rabbit-gateway - Get Rabbit Gateway settings
router.get('/rabbit-gateway', async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    res.json({
      success: true,
      data: {
        enabled: settings.rabbitGateway?.enabled || true,
        apiKey: settings.rabbitGateway?.apiKey || '',
        secretKey: settings.rabbitGateway?.secretKey || ''
      }
    });
  } catch (error) {
    console.error('Error fetching Rabbit Gateway settings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า Rabbit Gateway'
    });
  }
});

// POST /api/settings/rabbit-gateway - Update Rabbit Gateway settings (SuperAdmin only)
router.post('/rabbit-gateway', requireSuperAdmin, async (req, res) => {
  try {
    const { enabled, apiKey = '', secretKey = '' } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุสถานะการเปิดใช้งาน Rabbit Gateway'
      });
    }

    const settings = await SystemSettings.getSettings();

    settings.rabbitGateway = {
      enabled,
      apiKey,
      secretKey
    };

    await settings.save();

    // Log admin action
    await logAdminAction(req.user._id, 'rabbit_gateway_settings', {
      enabled,
      apiKey: apiKey ? '[SET]' : '[NOT_SET]',
      secretKey: secretKey ? '[SET]' : '[NOT_SET]',
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'บันทึกการตั้งค่า Rabbit Gateway สำเร็จ',
      data: {
        enabled: settings.rabbitGateway.enabled,
        apiKey: settings.rabbitGateway.apiKey,
        secretKey: settings.rabbitGateway.secretKey
      }
    });
  } catch (error) {
    console.error('Error updating Rabbit Gateway settings:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปเดตการตั้งค่า Rabbit Gateway'
    });
  }
});

module.exports = router;
