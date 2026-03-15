const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/adminAuth');
const AdminActionLog = require('../models/AdminActionLog');
const { getSocketInstance } = require('../socket');
const multer = require('multer');
const { reportImageStorage, CLOUDINARY_ENABLED } = require('../config/cloudinary');
const path = require('path');

// Configure multer for report image uploads
const reportImageUpload = multer({
  storage: reportImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test((file.mimetype || '').toLowerCase());

    if (extname && mimetype) {
      return cb(null, true);
    }

    cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPEG, JPG, PNG, GIF, WebP)'));
  }
});

// Handle upload errors
const handleReportUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'ไฟล์รูปภาพมีขนาดใหญ่เกินไป (สูงสุด 10MB)'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'อัปโหลดไฟล์ไม่สำเร็จ'
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'อัปโหลดไฟล์ไม่สำเร็จ'
    });
  }
  next();
};

// User: อัปโหลดรูปภาพสำหรับ report (ต้องอยู่ก่อน route /:id เพื่อไม่ให้ match ผิด)
router.post('/upload-image', auth, reportImageUpload.single('image'), handleReportUploadError, async (req, res) => {
  try {
    console.log('📤 Report image upload endpoint hit');
    console.log('📤 File:', req.file);
    console.log('📤 Request body:', req.body);
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'ไม่พบไฟล์ที่อัปโหลด'
      });
    }

    const forwardedProto = req.headers['x-forwarded-proto'];
    const protocol = forwardedProto ? forwardedProto.split(',')[0] : req.protocol;
    const localHost = `${protocol}://${req.get('host')}`;
    const uploadedPath = req.file.path || req.file.secure_url || req.file.url || null;
    const generatedFileName = req.file.filename || req.file.public_id || null;
    let fileUrl = CLOUDINARY_ENABLED
      ? uploadedPath
      : `${localHost}/uploads/reports/${generatedFileName}`;

    if (CLOUDINARY_ENABLED && fileUrl && !/^https?:\/\//i.test(fileUrl) && generatedFileName) {
      try {
        const cloudinary = require('cloudinary').v2;
        fileUrl = cloudinary.url(generatedFileName, { secure: true });
      } catch (cloudinaryError) {
        console.warn('⚠️ Unable to generate Cloudinary URL from filename', {
          generatedFileName,
          error: cloudinaryError?.message
        });
      }
    }

    if (!/^https?:\/\//i.test(fileUrl)) {
      fileUrl = fileUrl.startsWith('/')
        ? `${localHost}${fileUrl}`
        : `${localHost}/${fileUrl}`;
    }

    if (!fileUrl) {
      console.error('❌ Unable to determine file URL after upload', {
        CLOUDINARY_ENABLED,
        uploadedPath,
        generatedFileName
      });
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถสร้าง URL ของไฟล์ได้'
      });
    }

    res.json({
      success: true,
      message: 'อัปโหลดรูปภาพสำเร็จ',
      data: {
        imageUrl: fileUrl,
        filename: generatedFileName
      }
    });
  } catch (error) {
    console.error('Error uploading report image:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
      error: error.message
    });
  }
});

// User: สร้าง report ใหม่
router.post('/', auth, async (req, res) => {
  try {
    const { category, title, description, metadata, attachments, relatedUserId } = req.body;
    
    // Validate required fields
    if (!category || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ประเภท, หัวข้อ, รายละเอียด)'
      });
    }
    
    // Validate category
    const validCategories = [
      'membership_upgrade',
      'user_harassment',
      'payment_issue',
      'technical_issue',
      'bug_report',
      'feature_request',
      'account_issue',
      'other'
    ];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'ประเภทปัญหาไม่ถูกต้อง'
      });
    }
    
    // Set priority based on category
    let priority = 'medium';
    if (category === 'user_harassment' || category === 'payment_issue') {
      priority = 'high';
    } else if (category === 'membership_upgrade') {
      priority = 'high';
    }
    
    // Create report
    const report = new Report({
      reportedBy: req.user._id,
      category,
      title: title.trim(),
      description: description.trim(),
      priority,
      metadata: metadata || {},
      attachments: attachments || [],
      relatedUserId: relatedUserId || null
    });
    
    await report.save();
    
    // Populate reportedBy for response
    await report.populate('reportedBy', 'username firstName lastName email');
    
    console.log(`📝 New report created: ${report._id} by ${req.user.username} (${category})`);
    
    // ส่ง notification ไปยัง admin/mod/support ทั้งหมด
    try {
      const io = getSocketInstance();
      if (io) {
        // หา admin/mod/support ทั้งหมด
        const admins = await User.find({
          role: { $in: ['admin', 'mod', 'support', 'superadmin'] },
          isActive: true
        }).select('_id username');
        
        const categoryNames = {
          'membership_upgrade': 'อัพเกรดแล้ว tier ไม่ขึ้น',
          'user_harassment': 'บล็อก user ที่มากวน',
          'payment_issue': 'ปัญหาการชำระเงิน',
          'technical_issue': 'ปัญหาทางเทคนิค',
          'bug_report': 'รายงาน bug',
          'feature_request': 'ขอฟีเจอร์ใหม่',
          'account_issue': 'ปัญหาบัญชี',
          'other': 'อื่นๆ'
        };
        
        const notification = {
          type: 'report_created',
          title: 'มีรายงานปัญหาใหม่',
          message: `${req.user.username || req.user.displayName || 'ผู้ใช้'} แจ้งปัญหา: ${categoryNames[category] || category} - ${report.title}`,
          data: {
            reportId: report._id.toString(),
            reportTitle: report.title,
            category: report.category,
            categoryName: categoryNames[category] || category,
            reportedBy: {
              id: req.user._id.toString(),
              username: req.user.username,
              displayName: req.user.displayName || req.user.username
            },
            priority: report.priority,
            priorityName: report.priority === 'low' ? 'ต่ำ' : 
                         report.priority === 'medium' ? 'ปานกลาง' : 
                         report.priority === 'high' ? 'สูง' : 
                         report.priority === 'urgent' ? 'ด่วน' : report.priority
          },
          createdAt: new Date(),
          isRead: false
        };
        
        // ส่ง notification ไปยัง admin/mod/support ทุกคน
        admins.forEach(admin => {
          // สร้าง adminNotification โดยระบุ data object ใหม่ทั้งหมด
          const adminNotification = {
            type: notification.type,
            title: notification.title,
            message: notification.message,
            recipientId: admin._id.toString(),
            _id: `report_${report._id}_${admin._id}_${Date.now()}`,
            createdAt: notification.createdAt,
            isRead: notification.isRead,
            // ระบุ data object ใหม่ทั้งหมดเพื่อให้แน่ใจว่ามีข้อมูลครบ
            data: {
              reportId: report._id.toString(),
              reportTitle: report.title,
              category: report.category,
              priority: report.priority,
              reportedBy: {
                id: req.user._id.toString(),
                username: req.user.username,
                displayName: req.user.displayName || req.user.username
              }
            }
          };
          
          // Debug: ตรวจสอบว่า adminNotification.data มีข้อมูลครบหรือไม่
          console.log(`🔍 [Report] Admin notification data check for ${admin.username}:`, {
            hasData: !!adminNotification.data,
            dataKeys: Object.keys(adminNotification.data || {}),
            reportId: adminNotification.data?.reportId,
            reportTitle: adminNotification.data?.reportTitle,
            category: adminNotification.data?.category,
            priority: adminNotification.data?.priority,
            reportedBy: adminNotification.data?.reportedBy
          });
          
          const userRoom = `user_${admin._id}`;
          
          // ตรวจสอบว่ามี socket ใน room หรือไม่
          const room = io.sockets.adapter.rooms.get(userRoom);
          const socketCount = room ? room.size : 0;
          
          // Debug: แสดงรายการ rooms ทั้งหมดที่มี user_ prefix
          const allUserRooms = Array.from(io.sockets.adapter.rooms.keys()).filter(r => r.startsWith('user_'));
          console.log(`🔔 [Report] Admin ${admin.username} (${admin._id}): room=${userRoom}, sockets=${socketCount}`);
          console.log(`🔍 [Report] All user rooms:`, allUserRooms);
          console.log(`🔍 [Report] Total user rooms: ${allUserRooms.length}`);
          
          // Debug: แสดง socket IDs ทั้งหมดใน user room
          if (room && room.size > 0) {
            const socketIds = Array.from(room);
            console.log(`🔍 [Report] Socket IDs in room ${userRoom}:`, socketIds);
          }
          
          // บันทึก notification ลง global.notifications (in-memory storage)
          // เพื่อให้ API /api/notifications/:userId สามารถดึงได้
          if (!global.notifications) {
            global.notifications = [];
          }
          
          // ตรวจสอบว่า notification นี้มีอยู่แล้วหรือไม่ (ป้องกัน duplicate)
          const existingNotificationIndex = global.notifications.findIndex(
            n => n._id === adminNotification._id || 
            (n.type === adminNotification.type && 
             n.recipientId === adminNotification.recipientId && 
             n.data?.reportId === adminNotification.data?.reportId)
          );
          
          if (existingNotificationIndex === -1) {
            // เพิ่ม notification ใหม่
            global.notifications.push(adminNotification);
            console.log(`💾 [Report] Saved notification to global.notifications for admin ${admin.username} (${admin._id})`);
          } else {
            console.log(`⚠️ [Report] Notification already exists in global.notifications, skipping save`);
          }
          
          // ส่งไปยัง user room (เฉพาะ admin คนนั้น)
          io.to(userRoom).emit('newNotification', adminNotification);
          
          // Log สำหรับ debug
          if (socketCount === 0) {
            console.warn(`⚠️ [Report] Admin ${admin.username} (${admin._id}) is not in room ${userRoom} - notification may not be received`);
            console.warn(`⚠️ [Report] Available rooms:`, Array.from(io.sockets.adapter.rooms.keys()).filter(r => r.startsWith('user_')).slice(0, 10));
          } else {
            console.log(`✅ [Report] Sent report notification to admin ${admin._id} (${admin.username}) - ${socketCount} socket(s) in room`);
          }
          
          // Log notification details
          console.log(`📨 [Report] Notification details:`, {
            type: adminNotification.type,
            title: adminNotification.title,
            message: adminNotification.message,
            recipientId: adminNotification.recipientId,
            data: adminNotification.data,
            _id: adminNotification._id,
            createdAt: adminNotification.createdAt,
            isRead: adminNotification.isRead
          });
          console.log(`📨 [Report] Full notification object:`, JSON.stringify(adminNotification, null, 2));
        });
        
        console.log(`🔔 [Report] Sent report notification to ${admins.length} admins`);
      }
    } catch (socketError) {
      console.error('Error sending report notification:', socketError);
      // ไม่ให้ socket error รบกวนการตอบกลับ API
    }
    
    res.status(201).json({
      success: true,
      message: 'ส่งรายงานสำเร็จ เราจะดำเนินการตรวจสอบและติดต่อกลับโดยเร็วที่สุด',
      data: report
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งรายงาน',
      error: error.message
    });
  }
});

// User: ดู reports ของตัวเอง
router.get('/my-reports', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const category = req.query.category;
    
    const query = { reportedBy: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    const skip = (page - 1) * limit;
    
    const reports = await Report.find(query)
      .populate('assignedTo', 'username firstName lastName')
      .populate('lastUpdatedBy', 'username firstName lastName')
      .populate('relatedUserId', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Report.countDocuments(query);
    
    res.json({
      success: true,
      data: reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน',
      error: error.message
    });
  }
});

// User: ดู report รายการเดียว
// หมายเหตุ: route นี้ต้องอยู่หลัง route /upload-image เพื่อไม่ให้ match ผิด
router.get('/:id', auth, async (req, res) => {
  try {
    // ตรวจสอบว่าไม่ใช่ route /upload-image
    if (req.params.id === 'upload-image') {
      return res.status(404).json({
        success: false,
        message: 'API route not found'
      });
    }
    
    const report = await Report.findById(req.params.id)
      .populate('reportedBy', 'username firstName lastName email')
      .populate('assignedTo', 'username firstName lastName email')
      .populate('lastUpdatedBy', 'username firstName lastName')
      .populate('relatedUserId', 'username firstName lastName email');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายงาน'
      });
    }
    
    // Check if user owns this report or is admin
    if (report.reportedBy._id.toString() !== req.user._id.toString() && !['admin', 'superadmin', 'mod', 'support'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึงรายงานนี้'
      });
    }
    
    // Update view count if user is viewing their own report
    if (report.reportedBy._id.toString() === req.user._id.toString()) {
      report.viewCount += 1;
      report.viewedByUser = true;
      await report.save();
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน',
      error: error.message
    });
  }
});

// Admin: ดู reports ทั้งหมด
router.get('/', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const category = req.query.category;
    const priority = req.query.priority;
    const assignedTo = req.query.assignedTo;
    const search = req.query.search;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const reports = await Report.find(query)
      .populate('reportedBy', 'username firstName lastName email')
      .populate('assignedTo', 'username firstName lastName email')
      .populate('lastUpdatedBy', 'username firstName lastName email')
      .populate('relatedUserId', 'username firstName lastName email')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await Report.countDocuments(query);
    
    // Count by status
    const statusCounts = await Report.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statusStats = {};
    statusCounts.forEach(item => {
      statusStats[item._id] = item.count;
    });
    
    res.json({
      success: true,
      data: reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        status: statusStats,
        total
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน',
      error: error.message
    });
  }
});

// Admin: อัพเดทสถานะ report
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายงาน'
      });
    }
    
    const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'สถานะไม่ถูกต้อง'
      });
    }
    
    const updateData = {
      status,
      lastUpdatedBy: req.user._id
    };
    
    // If status is resolved or rejected, set admin response
    if ((status === 'resolved' || status === 'rejected' || status === 'closed') && adminResponse) {
      updateData.adminResponse = adminResponse.trim();
      updateData.respondedAt = new Date();
      
      // ส่ง notification ไปยัง user เมื่อ admin ตอบกลับพร้อมเปลี่ยนสถานะ
      try {
        const io = getSocketInstance();
        if (io && report.reportedBy) {
          // ปรับข้อความตามสถานะ
          let title = 'มีการตอบกลับรายงานของคุณ';
          let message = `Admin ตอบกลับรายงาน: ${report.title}`;
          
          if (status === 'closed') {
            title = 'รายงานของคุณถูกปิดแล้ว';
            message = `รายงาน "${report.title}" ถูกปิดแล้ว พร้อมคำตอบจาก Admin`;
          } else if (status === 'resolved') {
            title = 'รายงานของคุณได้รับการแก้ไขแล้ว';
            message = `รายงาน "${report.title}" ถูกแก้ไขเรียบร้อยแล้ว พร้อมคำตอบจาก Admin`;
          } else if (status === 'rejected') {
            title = 'รายงานของคุณถูกปฏิเสธ';
            message = `รายงาน "${report.title}" ถูกปฏิเสธ พร้อมคำตอบจาก Admin`;
          }
          
          const notification = {
            type: 'report_response',
            title: title,
            message: message,
            data: {
              reportId: report._id,
              reportTitle: report.title,
              adminResponse: adminResponse.trim(),
              status: status,
              respondedBy: {
                id: req.user._id,
                username: req.user.username,
                displayName: req.user.displayName || req.user.username
              },
              respondedAt: new Date()
            },
            createdAt: new Date(),
            isRead: false
          };
          
          // ส่ง notification ไปยัง user ที่เป็นเจ้าของ report
          const userNotification = {
            ...notification,
            recipientId: report.reportedBy._id.toString(),
            _id: `report_response_${report._id}_${Date.now()}`
          };
          
          io.to(`user_${report.reportedBy._id}`).emit('newNotification', userNotification);
          
          console.log(`🔔 Sent report response notification to user ${report.reportedBy._id} (status: ${status})`);
        }
      } catch (socketError) {
        console.error('Error sending report response notification:', socketError);
        // ไม่ให้ socket error รบกวนการตอบกลับ API
      }
    }
    
    // If status is in_progress, assign to current admin if not already assigned
    if (status === 'in_progress' && !report.assignedTo) {
      updateData.assignedTo = req.user._id;
    }
    
    // Mark as viewed by admin
    if (!report.viewedByAdmin) {
      updateData.viewedByAdmin = true;
      updateData.firstViewedByAdminAt = new Date();
    }
    
    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate('reportedBy', 'username firstName lastName email')
      .populate('assignedTo', 'username firstName lastName email')
      .populate('lastUpdatedBy', 'username firstName lastName email')
      .populate('relatedUserId', 'username firstName lastName email');
    
    // ส่ง notification ไปยัง user เมื่อ admin เปลี่ยนสถานะ
    // ถ้ามี adminResponse แล้วจะส่ง notification จากส่วน adminResponse แล้ว (ไม่ต้องส่งซ้ำ)
    // แต่ถ้าไม่มี adminResponse จะส่ง notification จากส่วนนี้
    const hasAdminResponse = (status === 'resolved' || status === 'rejected' || status === 'closed') && adminResponse;
    const shouldSendStatusNotification = report.status !== status && updatedReport.reportedBy && !hasAdminResponse;
    
    if (shouldSendStatusNotification) {
      try {
        const io = getSocketInstance();
        if (io) {
          const statusNames = {
            'pending': 'รอดำเนินการ',
            'in_progress': 'กำลังตรวจสอบ',
            'resolved': 'แก้ไขแล้ว',
            'rejected': 'ปฏิเสธ',
            'closed': 'ปิดแล้ว'
          };
          
          // สำหรับ closed/resolved/rejected ให้ใช้ข้อความที่ชัดเจนกว่า
          let title = 'สถานะรายงานของคุณถูกอัพเดท';
          let message = `รายงาน "${updatedReport.title}" ถูกเปลี่ยนสถานะเป็น: ${statusNames[status] || status}`;
          
          if (status === 'closed') {
            title = 'รายงานของคุณถูกปิดแล้ว';
            message = `รายงาน "${updatedReport.title}" ถูกปิดแล้ว`;
          } else if (status === 'resolved') {
            title = 'รายงานของคุณได้รับการแก้ไขแล้ว';
            message = `รายงาน "${updatedReport.title}" ถูกแก้ไขเรียบร้อยแล้ว`;
          } else if (status === 'rejected') {
            title = 'รายงานของคุณถูกปฏิเสธ';
            message = `รายงาน "${updatedReport.title}" ถูกปฏิเสธ`;
          }
          
          const notification = {
            type: 'report_status_update',
            title: title,
            message: message,
            data: {
              reportId: updatedReport._id,
              reportTitle: updatedReport.title,
              oldStatus: report.status,
              newStatus: status,
              statusName: statusNames[status] || status,
              updatedBy: {
                id: req.user._id,
                username: req.user.username,
                displayName: req.user.displayName || req.user.username
              },
              updatedAt: new Date(),
              adminResponse: updatedReport.adminResponse || null
            },
            createdAt: new Date(),
            isRead: false
          };
          
          const userNotification = {
            ...notification,
            recipientId: updatedReport.reportedBy._id.toString(),
            _id: `report_status_${updatedReport._id}_${Date.now()}`
          };
          
          io.to(`user_${updatedReport.reportedBy._id}`).emit('newNotification', userNotification);
          
          console.log(`🔔 Sent report status update notification to user ${updatedReport.reportedBy._id} (${report.status} → ${status})`);
        }
      } catch (socketError) {
        console.error('Error sending report status update notification:', socketError);
        // ไม่ให้ socket error รบกวนการตอบกลับ API
      }
    }
    
    // Log admin action
    try {
      await AdminActionLog.createLog({
        adminId: req.user._id,
        actionType: 'admin_update_report_status',
        description: `Admin อัพเดทสถานะ report ${report._id} เป็น ${status}`,
        targetUserId: report.reportedBy,
        metadata: {
          reportId: report._id,
          oldStatus: report.status,
          newStatus: status,
          reportTitle: report.title,
          reportCategory: report.category
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success'
      });
    } catch (logError) {
      console.error('Error logging admin action:', logError);
    }
    
    console.log(`📝 Report ${report._id} status updated to ${status} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'อัพเดทสถานะรายงานสำเร็จ',
      data: updatedReport
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทสถานะรายงาน',
      error: error.message
    });
  }
});

// Admin: มอบหมาย report ให้ admin คนอื่น
router.patch('/:id/assign', requireAdmin, async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายงาน'
      });
    }
    
    // Verify assignedTo is an admin/mod/support
    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser || !['admin', 'mod', 'support', 'superadmin'].includes(assignedUser.role)) {
        return res.status(400).json({
          success: false,
          message: 'ผู้ใช้ที่มอบหมายต้องเป็น admin/mod/support'
        });
      }
    }
    
    const updateData = {
      assignedTo: assignedTo || null,
      lastUpdatedBy: req.user._id
    };
    
    // If assigning, set status to in_progress if it's pending
    if (assignedTo && report.status === 'pending') {
      updateData.status = 'in_progress';
    }
    
    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate('reportedBy', 'username firstName lastName email')
      .populate('assignedTo', 'username firstName lastName email')
      .populate('lastUpdatedBy', 'username firstName lastName email')
      .populate('relatedUserId', 'username firstName lastName email');
    
    // ส่ง notification ไปยัง user เมื่อ admin มอบหมาย report
    if (updatedReport.reportedBy) {
      try {
        const io = getSocketInstance();
        if (io) {
          const assignedUser = updatedReport.assignedTo;
          const notification = {
            type: 'report_assigned',
            title: assignedTo ? 'รายงานของคุณถูกมอบหมายให้ผู้ดูแล' : 'การมอบหมายรายงานถูกยกเลิก',
            message: assignedTo 
              ? `รายงาน "${updatedReport.title}" ถูกมอบหมายให้ ${assignedUser?.username || assignedUser?.displayName || 'ผู้ดูแล'} ตรวจสอบ`
              : `การมอบหมายรายงาน "${updatedReport.title}" ถูกยกเลิก`,
            data: {
              reportId: updatedReport._id,
              reportTitle: updatedReport.title,
              assignedTo: assignedTo ? {
                id: assignedUser?._id,
                username: assignedUser?.username,
                displayName: assignedUser?.displayName || assignedUser?.username
              } : null,
              assignedBy: {
                id: req.user._id,
                username: req.user.username,
                displayName: req.user.displayName || req.user.username
              },
              assignedAt: new Date()
            },
            createdAt: new Date(),
            isRead: false
          };
          
          const userNotification = {
            ...notification,
            recipientId: updatedReport.reportedBy._id.toString(),
            _id: `report_assign_${updatedReport._id}_${Date.now()}`
          };
          
          io.to(`user_${updatedReport.reportedBy._id}`).emit('newNotification', userNotification);
          
          console.log(`🔔 Sent report assignment notification to user ${updatedReport.reportedBy._id}`);
        }
      } catch (socketError) {
        console.error('Error sending report assignment notification:', socketError);
        // ไม่ให้ socket error รบกวนการตอบกลับ API
      }
    }
    
    // Log admin action
    try {
      await AdminActionLog.createLog({
        adminId: req.user._id,
        actionType: 'admin_assign_report',
        description: `Admin มอบหมาย report ${report._id} ให้ ${assignedTo ? 'admin อื่น' : 'ยกเลิกการมอบหมาย'}`,
        targetUserId: report.reportedBy,
        metadata: {
          reportId: report._id,
          assignedTo: assignedTo || null,
          reportTitle: report.title
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success'
      });
    } catch (logError) {
      console.error('Error logging admin action:', logError);
    }
    
    res.json({
      success: true,
      message: 'มอบหมายรายงานสำเร็จ',
      data: updatedReport
    });
  } catch (error) {
    console.error('Error assigning report:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการมอบหมายรายงาน',
      error: error.message
    });
  }
});

// Admin: อัพเดท priority
router.patch('/:id/priority', requireAdmin, async (req, res) => {
  try {
    const { priority } = req.body;
    
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'ความสำคัญไม่ถูกต้อง'
      });
    }
    
    const report = await Report.findById(req.params.id)
      .populate('reportedBy', 'username firstName lastName email');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายงาน'
      });
    }
    
    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      {
        priority,
        lastUpdatedBy: req.user._id
      },
      { new: true }
    )
      .populate('reportedBy', 'username firstName lastName email')
      .populate('assignedTo', 'username firstName lastName email')
      .populate('lastUpdatedBy', 'username firstName lastName email')
      .populate('relatedUserId', 'username firstName lastName email');
    
    // ส่ง notification ไปยัง user เมื่อ admin เปลี่ยน priority
    if (report.priority !== priority && updatedReport.reportedBy) {
      try {
        const io = getSocketInstance();
        if (io) {
          const priorityNames = {
            'low': 'ต่ำ',
            'medium': 'ปานกลาง',
            'high': 'สูง',
            'urgent': 'ด่วน'
          };
          
          const notification = {
            type: 'report_priority_update',
            title: 'ความสำคัญของรายงานถูกอัพเดท',
            message: `รายงาน "${updatedReport.title}" ถูกเปลี่ยนความสำคัญเป็น: ${priorityNames[priority] || priority}`,
            data: {
              reportId: updatedReport._id,
              reportTitle: updatedReport.title,
              oldPriority: report.priority,
              newPriority: priority,
              priorityName: priorityNames[priority] || priority,
              updatedBy: {
                id: req.user._id,
                username: req.user.username,
                displayName: req.user.displayName || req.user.username
              },
              updatedAt: new Date()
            },
            createdAt: new Date(),
            isRead: false
          };
          
          const userNotification = {
            ...notification,
            recipientId: updatedReport.reportedBy._id.toString(),
            _id: `report_priority_${updatedReport._id}_${Date.now()}`
          };
          
          io.to(`user_${updatedReport.reportedBy._id}`).emit('newNotification', userNotification);
          
          console.log(`🔔 Sent report priority update notification to user ${updatedReport.reportedBy._id} (${report.priority} → ${priority})`);
        }
      } catch (socketError) {
        console.error('Error sending report priority update notification:', socketError);
        // ไม่ให้ socket error รบกวนการตอบกลับ API
      }
    }
    
    res.json({
      success: true,
      message: 'อัพเดทความสำคัญสำเร็จ',
      data: updatedReport
    });
  } catch (error) {
    console.error('Error updating report priority:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทความสำคัญ',
      error: error.message
    });
  }
});

// Admin: เพิ่ม admin response
router.patch('/:id/response', requireAdmin, async (req, res) => {
  try {
    const { adminResponse } = req.body;
    
    if (!adminResponse || !adminResponse.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกคำตอบ'
      });
    }
    
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        adminResponse: adminResponse.trim(),
        respondedAt: new Date(),
        lastUpdatedBy: req.user._id
      },
      { new: true }
    )
      .populate('reportedBy', 'username firstName lastName email')
      .populate('assignedTo', 'username firstName lastName email')
      .populate('lastUpdatedBy', 'username firstName lastName email')
      .populate('relatedUserId', 'username firstName lastName email');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายงาน'
      });
    }
    
    // ส่ง notification ไปยัง user ที่เป็นเจ้าของ report
    try {
      const io = getSocketInstance();
      if (io && report.reportedBy) {
        const notification = {
          type: 'report_response',
          title: 'มีการตอบกลับรายงานของคุณ',
          message: `Admin ตอบกลับรายงาน: ${report.title}`,
          data: {
            reportId: report._id,
            reportTitle: report.title,
            adminResponse: report.adminResponse,
            respondedBy: {
              id: req.user._id,
              username: req.user.username,
              displayName: req.user.displayName || req.user.username
            },
            respondedAt: report.respondedAt
          },
          createdAt: new Date(),
          isRead: false
        };
        
        // ส่ง notification ไปยัง user ที่เป็นเจ้าของ report
        const userNotification = {
          ...notification,
          recipientId: report.reportedBy._id.toString(),
          _id: `report_response_${report._id}_${Date.now()}`
        };
        
        io.to(`user_${report.reportedBy._id}`).emit('newNotification', userNotification);
        
        console.log(`🔔 Sent report response notification to user ${report.reportedBy._id}`);
      }
    } catch (socketError) {
      console.error('Error sending report response notification:', socketError);
      // ไม่ให้ socket error รบกวนการตอบกลับ API
    }
    
    // Log admin action
    try {
      await AdminActionLog.createLog({
        adminId: req.user._id,
        actionType: 'admin_respond_report',
        description: `Admin ตอบกลับ report ${report._id}`,
        targetUserId: report.reportedBy,
        metadata: {
          reportId: report._id,
          reportTitle: report.title
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success'
      });
    } catch (logError) {
      console.error('Error logging admin action:', logError);
    }
    
    res.json({
      success: true,
      message: 'เพิ่มคำตอบสำเร็จ',
      data: report
    });
  } catch (error) {
    console.error('Error adding admin response:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มคำตอบ',
      error: error.message
    });
  }
});

// Admin: ดูสถิติ reports
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const total = await Report.countDocuments({});
    const pending = await Report.countDocuments({ status: 'pending' });
    const inProgress = await Report.countDocuments({ status: 'in_progress' });
    const resolved = await Report.countDocuments({ status: 'resolved' });
    const rejected = await Report.countDocuments({ status: 'rejected' });
    const closed = await Report.countDocuments({ status: 'closed' });
    
    // Count by category
    const categoryStats = await Report.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Count by priority
    const priorityStats = await Report.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Reports by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentReports = await Report.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        resolved,
        rejected,
        closed,
        categoryStats,
        priorityStats,
        recentReports
      }
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติรายงาน',
      error: error.message
    });
  }
});

// SuperAdmin: ลบ report
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('reportedBy', 'username firstName lastName email');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรายงาน'
      });
    }
    
    // ลบ report
    await Report.findByIdAndDelete(req.params.id);
    
    // Log admin action
    try {
      await AdminActionLog.createLog({
        adminId: req.user._id,
        actionType: 'admin_delete_report',
        description: `SuperAdmin ลบ report ${report._id}`,
        targetUserId: report.reportedBy?._id || null,
        metadata: {
          reportId: report._id,
          reportTitle: report.title,
          reportCategory: report.category,
          reportStatus: report.status
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success'
      });
    } catch (logError) {
      console.error('Error logging admin action:', logError);
    }
    
    console.log(`🗑️ Report ${report._id} deleted by SuperAdmin ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'ลบรายงานสำเร็จ'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบรายงาน',
      error: error.message
    });
  }
});

module.exports = router;

