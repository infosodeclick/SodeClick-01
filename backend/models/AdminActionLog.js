const mongoose = require('mongoose');

const adminActionLogSchema = new mongoose.Schema({
  // ผู้ที่ทำการกระทำ
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // ประเภทการกระทำ
  actionType: {
    type: String,
    required: true,
    enum: [
      // SuperAdmin Actions
      'superadmin_vote',
      'superadmin_add_coins',
      'superadmin_add_vote_points',
      'superadmin_payment_settings',
      
      // Admin Actions
      'admin_ban_user',
      'admin_unban_user',
      'admin_edit_user',
      'admin_create_user',
      'admin_delete_user',
      'admin_update_membership',
      'admin_reset_password',
      'admin_upload_image',
      'admin_update_role',
      'admin_clear_ghost_users',
      'admin_delete_message',
      'admin_delete_chatroom',
      'admin_create_chatroom',
      'admin_toggle_maintenance'
    ],
    index: true
  },
  
  // รายละเอียดการกระทำ
  description: {
    type: String,
    required: true
  },
  
  // ผู้ใช้ที่ถูกกระทำ (ถ้ามี)
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // ข้อมูลเพิ่มเติม (JSON)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // IP Address
  ipAddress: {
    type: String
  },
  
  // User Agent
  userAgent: {
    type: String
  },
  
  // สถานะ (success, failed, pending)
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success',
    index: true
  },
  
  // ข้อความ error (ถ้ามี)
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
adminActionLogSchema.index({ createdAt: -1 });
adminActionLogSchema.index({ adminId: 1, createdAt: -1 });
adminActionLogSchema.index({ actionType: 1, createdAt: -1 });
adminActionLogSchema.index({ targetUserId: 1, createdAt: -1 });

// Method to create log entry
adminActionLogSchema.statics.createLog = async function(data) {
  try {
    const log = new this({
      adminId: data.adminId,
      actionType: data.actionType,
      description: data.description,
      targetUserId: data.targetUserId || null,
      metadata: data.metadata || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      status: data.status || 'success',
      errorMessage: data.errorMessage || null
    });
    
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating admin action log:', error);
    // Don't throw error to prevent breaking the main action
    return null;
  }
};

const AdminActionLog = mongoose.model('AdminActionLog', adminActionLogSchema);

module.exports = AdminActionLog;

