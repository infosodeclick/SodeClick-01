const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  // ผู้รายงาน
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // ประเภทปัญหา
  category: {
    type: String,
    required: true,
    enum: [
      'membership_upgrade',      // อัพเกรดแล้ว tier ไม่ขึ้น
      'user_harassment',         // บล็อก user ที่มากวน
      'payment_issue',           // ปัญหาการชำระเงิน
      'technical_issue',         // ปัญหาทางเทคนิค
      'bug_report',             // รายงาน bug
      'feature_request',         // ขอฟีเจอร์ใหม่
      'account_issue',          // ปัญหาบัญชี
      'other'                   // อื่นๆ
    ],
    index: true
  },
  
  // หัวข้อ
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  // รายละเอียดปัญหา
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  
  // สถานะ
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'rejected', 'closed'],
    default: 'pending',
    index: true
  },
  
  // ความสำคัญ
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  
  // ผู้ดูแลที่รับผิดชอบ
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  
  // ผู้ดูแลที่แก้ไขล่าสุด
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  
  // คำตอบ/การแก้ไขจาก admin
  adminResponse: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  
  // วันที่ตอบกลับ
  respondedAt: {
    type: Date
  },
  
  // ข้อมูลเพิ่มเติม (เช่น user ID ที่ต้องการบล็อก, transaction ID, etc.)
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // รูปภาพ/ไฟล์แนบ (URLs)
  attachments: [{
    type: String
  }],
  
  // ผู้ใช้ที่เกี่ยวข้อง (เช่น user ที่ต้องการรายงาน)
  relatedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  
  // จำนวนครั้งที่ผู้ใช้ดู report
  viewCount: {
    type: Number,
    default: 0
  },
  
  // ผู้ใช้ได้ดู report แล้วหรือยัง
  viewedByUser: {
    type: Boolean,
    default: false
  },
  
  // Admin ได้ดู report แล้วหรือยัง
  viewedByAdmin: {
    type: Boolean,
    default: false
  },
  
  // วันที่ admin ดูครั้งแรก
  firstViewedByAdminAt: {
    type: Date
  },
  
  // Tags สำหรับจัดหมวดหมู่
  tags: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes
reportSchema.index({ reportedBy: 1, createdAt: -1 });
reportSchema.index({ status: 1, priority: -1, createdAt: -1 });
reportSchema.index({ assignedTo: 1, status: 1 });
reportSchema.index({ category: 1, status: 1 });

// Method to get category name in Thai
reportSchema.methods.getCategoryName = function() {
  const names = {
    'membership_upgrade': 'อัพเกรดแล้ว tier ไม่ขึ้น',
    'user_harassment': 'บล็อก user ที่มากวน',
    'payment_issue': 'ปัญหาการชำระเงิน',
    'technical_issue': 'ปัญหาทางเทคนิค',
    'bug_report': 'รายงาน bug',
    'feature_request': 'ขอฟีเจอร์ใหม่',
    'account_issue': 'ปัญหาบัญชี',
    'other': 'อื่นๆ'
  };
  return names[this.category] || this.category;
};

// Method to get status name in Thai
reportSchema.methods.getStatusName = function() {
  const names = {
    'pending': 'รอดำเนินการ',
    'in_progress': 'กำลังดำเนินการ',
    'resolved': 'แก้ไขแล้ว',
    'rejected': 'ปฏิเสธ',
    'closed': 'ปิดแล้ว'
  };
  return names[this.status] || this.status;
};

// Method to get priority name in Thai
reportSchema.methods.getPriorityName = function() {
  const names = {
    'low': 'ต่ำ',
    'medium': 'ปานกลาง',
    'high': 'สูง',
    'urgent': 'ด่วน'
  };
  return names[this.priority] || this.priority;
};

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;

