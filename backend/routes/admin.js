const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');
const ChatMessage = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');
const { requireAdmin, requireSuperAdmin } = require('../middleware/adminAuth');
const { requireAdminPermissions, ADMIN_PERMISSIONS } = require('../middleware/adminPermissions');
const { profileImageStorage, deleteImage, getPublicIdFromUrl, CLOUDINARY_ENABLED } = require('../config/cloudinary');

// Configure multer for Cloudinary upload (Admin)
const upload = multer({ 
  storage: profileImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (Cloudinary supports larger files)
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|avif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPEG, JPG, PNG, GIF, WebP, BMP, AVIF)'));
    }
  }
});

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  console.error('❌ Multer Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์'
    });
  }
  
  if (err.message.includes('รองรับเฉพาะไฟล์รูปภาพ')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next(err);
};

// Get all users with pagination
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';
    const premium = req.query.premium || '';
    const sort = req.query.sort || '-createdAt';

    const query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    // Handle role filtering
    if (role) {
      // ถ้า role เป็นหลายค่า (คั่นด้วย comma) ให้แยก
      if (role.includes(',')) {
        const roles = role.split(',').map(r => r.trim());
        query.role = { $in: roles };
      } else {
        query.role = role;
      }
    }
    
    // Filter for adminCreated users (if specified)
    if (req.query.adminCreated === 'true') {
      query.createdByAdmin = true;
      
      // ถ้าระบุ adminCreated=true ให้กรองเฉพาะ admin, mod, support เสมอ
      // ไม่ว่าจะระบุ role หรือไม่ก็ตาม เพื่อป้องกันการนับ user ทั่วไป
      if (role) {
        // ถ้าระบุ role แล้ว ให้กรอง role ที่ระบุและต้องเป็น admin, mod, support เท่านั้น
        const roles = role.includes(',') ? role.split(',').map(r => r.trim()) : [role];
        const validRoles = roles.filter(r => ['admin', 'mod', 'support'].includes(r));
        if (validRoles.length > 0) {
          query.role = { $in: validRoles };
        } else {
          // ถ้า role ที่ระบุไม่มี admin/mod/support ให้ตั้ง query ที่ไม่มีผล (ไม่พบข้อมูล)
          query.role = { $in: [] };
        }
      } else {
        // ถ้าไม่ได้ระบุ role ให้กรองเฉพาะ admin, mod, support
        query.role = { $in: ['admin', 'mod', 'support'] };
      }
    }

    if (status === 'active') {
      query.isActive = true;
      query.isBanned = false;
    } else if (status === 'banned') {
      query.isBanned = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Filter for premium users only
    if (premium === 'true') {
      query['membership.tier'] = { 
        $in: ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver'] 
      };
    }

    // ถ้าไม่ได้ระบุ role หรือ adminCreated ให้ซ่อน admin และ superadmin จากรายการทั้งหมด
    // แต่ถ้าระบุ role=admin,mod,support หรือ adminCreated=true ให้แสดงตามที่ระบุ
    if (!role && req.query.adminCreated !== 'true') {
      query.role = { $nin: ['admin', 'superadmin'] };
    }

    // Log query สำหรับ debug
    if (req.query.adminCreated === 'true') {
      console.log('🔍 Query สำหรับ adminCreated=true:', JSON.stringify(query, null, 2));
    }

    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates')
      .populate('membership.planId')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Log ผลลัพธ์สำหรับ debug
    if (req.query.adminCreated === 'true') {
      console.log(`📊 พบผู้ใช้ ${users.length} คน`);
      users.forEach(u => {
        console.log(`  - ${u.username}: role=${u.role}, createdByAdmin=${u.createdByAdmin}`);
      });
    }

    const total = await User.countDocuments(query);

    // แปลง profileImages จาก path เป็น URL เต็ม
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
      : `${req.protocol}://${req.get('host')}`;
    
    const usersWithImageUrls = users.map(user => ({
      ...user.toObject(),
      profileImages: user.profileImages.map(img => {
        // ตรวจสอบว่า img เป็น string หรือไม่
        if (typeof img !== 'string') {
          return img; // ถ้าไม่ใช่ string ให้คืนค่าตามเดิม
        }
        // ถ้าเป็น data URL หรือ URL เต็มแล้ว ให้ใช้ตามเดิม
        if (img.startsWith('http') || img.startsWith('data:')) {
          return img;
        }
        // ถ้าเป็น path ให้แปลงเป็น URL เต็ม
        return `${baseUrl}/uploads/${img}`;
      })
    }));

    res.json({
      users: usersWithImageUrls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get premium statistics
router.get('/premium/stats', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const membershipTiers = ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver'];
    const stats = {};

    // Count users by membership tier (ไม่รวม SuperAdmin)
    for (const tier of membershipTiers) {
      const count = await User.countDocuments({
        'membership.tier': tier,
        isActive: true,
        role: { $ne: 'superadmin' } // ไม่รวม SuperAdmin ในสถิติ
      });
      stats[tier] = count;
    }

    // Calculate total premium users
    stats.totalPremium = membershipTiers.reduce((total, tier) => total + stats[tier], 0);

    // Aggregate revenue from paymentHistory
    // Filter: paymentMethod ไม่ใช่ 'admin' และ status เป็น 'completed'
    // เฉพาะการชำระเงินจริงผ่าน Payment Gateway
    const revenuePipeline = [
      {
        $match: {
          role: { $ne: 'superadmin' }
        }
      },
      {
        $unwind: {
          path: '$paymentHistory',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          'paymentHistory.status': 'completed',
          'paymentHistory.paymentMethod': { $nin: ['admin', 'Admin', 'ADMIN', 'unknown'] }, // ไม่นับการอัพเกรดโดย admin
          'paymentHistory.tier': { $in: membershipTiers }, // เฉพาะ premium tiers
          ...(startDate ? { 'paymentHistory.purchaseDate': { $gte: new Date(startDate) } } : {}),
          ...(endDate ? { 
            'paymentHistory.purchaseDate': { 
              $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            } 
          } : {})
        }
      },
      {
        $group: {
          _id: '$paymentHistory.tier',
          totalAmount: { $sum: '$paymentHistory.amount' },
          count: { $sum: 1 }
        }
      }
    ];

    const revenueData = await User.aggregate(revenuePipeline);

    // Calculate total revenue from actual payments
    stats.totalRevenue = revenueData.reduce((total, item) => total + item.totalAmount, 0);

    // Calculate monthly revenue (current month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyRevenueData = await User.aggregate([
      {
        $match: {
          role: { $ne: 'superadmin' }
        }
      },
      {
        $unwind: {
          path: '$paymentHistory',
          preserveNullAndEmptyArrays: false
        }
      },
      {
        $match: {
          'paymentHistory.status': 'completed',
          'paymentHistory.paymentMethod': { $nin: ['admin', 'Admin', 'ADMIN'] },
          'paymentHistory.tier': { $in: membershipTiers },
          'paymentHistory.purchaseDate': {
            $gte: currentMonthStart,
            $lte: currentMonthEnd
          }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$paymentHistory.amount' }
        }
      }
    ]);

    stats.monthlyRevenue = monthlyRevenueData.length > 0 ? monthlyRevenueData[0].totalAmount : 0;

    // Add revenue breakdown by tier
    stats.revenueByTier = {};
    revenueData.forEach(item => {
      stats.revenueByTier[item._id] = {
        amount: item.totalAmount,
        count: item.count
      };
    });

    // Add date range info if provided
    if (startDate || endDate) {
      stats.dateRange = {
        startDate: startDate || null,
        endDate: endDate || null
      };
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching premium stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get banned users with pagination
router.get('/banned-users', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sort = req.query.sort || '-createdAt';

    const query = { isBanned: true };
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { banReason: { $regex: search, $options: 'i' } }
      ];
    }

    // ซ่อน admin และ superadmin จากรายการผู้ใช้ที่ถูกแบน
    query.role = { $nin: ['admin', 'superadmin'] };

    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates')
      .populate('membership.planId')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates')
      .populate('membership.planId');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถดูรายละเอียด SuperAdmin ได้
    if (req.user.role === 'admin' && user.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot view SuperAdmin details',
        error: 'Admin users cannot view SuperAdmin account details'
      });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { role, membership, isActive, isBanned, banReason, coins, votePoints, profileImages, firstName, lastName, email } = req.body;
    
    // ตรวจสอบว่าผู้ใช้ที่จะแก้ไขเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถแก้ไข SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot modify SuperAdmin user',
        error: 'Admin users cannot modify SuperAdmin accounts'
      });
    }
    
    const updateData = {};
    
    if (role && ['user', 'dj', 'admin', 'superadmin'].includes(role)) {
      updateData.role = role;
    }
    
    if (membership) {
      // ถ้าเปลี่ยน tier ให้หา planId ที่ถูกต้อง
      if (membership.tier && membership.tier !== 'member') {
        try {
          const MembershipPlan = require('../models/MembershipPlan');
          const plan = await MembershipPlan.findOne({ 
            tier: membership.tier, 
            isActive: true 
          });
          
          if (plan) {
            // คำนวณวันหมดอายุใหม่
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + plan.duration.days);
            
            updateData.membership = {
              ...membership,
              planId: plan._id,
              startDate: startDate,
              endDate: endDate
            };
            
            // อัพเดท verification status สำหรับ premium tiers
            if (membership.tier !== 'member') {
              updateData.isVerified = true;
            }
            
            console.log(`🔄 Admin updated user ${req.params.id} membership to ${membership.tier} with planId: ${plan._id}`);
          } else {
            console.log(`⚠️  No plan found for tier: ${membership.tier}`);
            updateData.membership = membership;
          }
        } catch (error) {
          console.error('Error finding membership plan:', error);
          updateData.membership = membership;
        }
      } else {
        // สำหรับ member tier
        updateData.membership = {
          ...membership,
          planId: null,
          endDate: null
        };
      }
    }
    
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    
    if (typeof isBanned === 'boolean') {
      updateData.isBanned = isBanned;
    }
    
    if (banReason !== undefined) {
      updateData.banReason = banReason;
    }
    
    if (typeof coins === 'number') {
      updateData.coins = coins;
    }
    
    if (typeof votePoints === 'number') {
      updateData.votePoints = votePoints;
    }
    
    if (profileImages && Array.isArray(profileImages)) {
      updateData.profileImages = profileImages;
    }
    
    if (firstName) {
      updateData.firstName = firstName;
    }
    
    if (lastName) {
      updateData.lastName = lastName;
    }
    
    if (email) {
      updateData.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates')
     .populate('membership.planId');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload profile image for user (Admin only)
router.post('/users/:id/upload-image', requireAdmin, (req, res, next) => {
  console.log('📤 Admin upload request received for user:', req.params.id);
  console.log('📤 Admin user:', req.user?.id);
  console.log('📤 Content-Type:', req.headers['content-type']);
  next();
}, upload.single('profileImage'), handleMulterError, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📤 Processing admin upload for user:', id);
    console.log('📤 File received:', req.file ? 'Yes' : 'No');
    
    if (!req.file) {
      console.log('❌ No file received in request');
      return res.status(400).json({
        success: false,
        message: 'กรุณาเลือกไฟล์รูปภาพ'
      });
    }

    console.log('📤 File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      cloudinaryEnabled: CLOUDINARY_ENABLED
    });

    const user = await User.findById(id);
    
    if (!user) {
      // ถ้าไม่พบ user ให้ลบรูปที่อัพโหลด
      if (req.file) {
        if (CLOUDINARY_ENABLED && req.file.filename) {
          try {
            await deleteImage(req.file.filename);
            console.log('🗑️ Deleted orphaned image from Cloudinary');
          } catch (err) {
            console.error('❌ Error deleting orphaned image:', err);
          }
        } else if (req.file.path) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
              console.log('🗑️ Deleted orphaned local file');
            }
          } catch (err) {
            console.error('❌ Error deleting local file:', err);
          }
        }
      }
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // เพิ่มรูปภาพใหม่เข้าไปใน profileImages array
    let imageUrl, imagePathToSave;
    
    if (CLOUDINARY_ENABLED) {
      imageUrl = req.file.path;
      imagePathToSave = imageUrl;
      console.log('☁️ Admin Cloudinary upload:', imageUrl);
    } else {
      const imagePath = req.file.filename;
      imagePathToSave = `users/${id}/${imagePath}`;
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
        : `${req.protocol}://${req.get('host')}`;
      imageUrl = `${baseUrl}/uploads/${imagePathToSave}`;
      console.log('💾 Admin local storage upload:', imageUrl);
    }
    
    user.profileImages.push(imagePathToSave);

    // จำกัดจำนวนรูปภาพ (admin สามารถอัพโหลดได้มากขึ้น)
    const maxImages = 30; // จำกัดที่ 30 รูปสำหรับ admin
    
    // ถ้าเกินจำนวนที่กำหนด ให้ลบรูปเก่าออก
    if (user.profileImages.length > maxImages) {
      const imagesToDelete = user.profileImages.slice(0, user.profileImages.length - maxImages);
      
      for (const imageItem of imagesToDelete) {
        if (imageItem && typeof imageItem === 'string' && !imageItem.startsWith('data:image')) {
          try {
            if (CLOUDINARY_ENABLED && imageItem.includes('cloudinary.com')) {
              const publicIdToDelete = getPublicIdFromUrl(imageItem);
              if (publicIdToDelete) {
                await deleteImage(publicIdToDelete);
                console.log('🗑️ Deleted old image from Cloudinary');
              }
            } else if (imageItem.startsWith('users/')) {
              const fullPath = path.join(__dirname, '..', 'uploads', imageItem);
              if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log('🗑️ Deleted old local file');
              }
            }
          } catch (err) {
            console.error('❌ Error deleting old image:', err);
          }
        }
      }
      
      user.profileImages = user.profileImages.slice(-maxImages);
    }

    await user.save();

    console.log('✅ Admin image uploaded successfully:', {
      userId: id,
      imageUrl,
      storage: CLOUDINARY_ENABLED ? 'Cloudinary' : 'Local',
      totalImages: user.profileImages.length
    });

    res.json({
      success: true,
      message: CLOUDINARY_ENABLED 
        ? 'อัปโหลดรูปภาพสำเร็จ (Cloudinary + CDN)' 
        : 'อัปโหลดรูปภาพสำเร็จ',
      imageUrl: imageUrl,
      totalImages: user.profileImages.length,
      cdn: CLOUDINARY_ENABLED,
      storage: CLOUDINARY_ENABLED ? 'cloudinary' : 'local'
    });

  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ'
    });
  }
});

// Ban/Unban user
router.patch('/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const { isBanned, banReason } = req.body;
    
    // ตรวจสอบว่าผู้ใช้ที่จะแบนเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถแบน SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot ban SuperAdmin user',
        error: 'Admin users cannot ban SuperAdmin accounts'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isBanned: isBanned,
        banReason: isBanned ? banReason : null
      },
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates')
     .populate('membership.planId');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Ban user with duration
router.patch('/users/:id/ban-duration', requireAdmin, async (req, res) => {
  try {
    const { isBanned, banReason, banDuration, banDurationType } = req.body;
    
    // ตรวจสอบว่าผู้ใช้ที่จะแบนเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถแบน SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot ban SuperAdmin user',
        error: 'Admin users cannot ban SuperAdmin accounts'
      });
    }
    
    let banExpiresAt = null;
    if (isBanned && banDuration && banDurationType) {
      const now = new Date();
      switch (banDurationType) {
        case 'hours':
          banExpiresAt = new Date(now.getTime() + (banDuration * 60 * 60 * 1000));
          break;
        case 'days':
          banExpiresAt = new Date(now.getTime() + (banDuration * 24 * 60 * 60 * 1000));
          break;
        case 'months':
          banExpiresAt = new Date(now.getTime() + (banDuration * 30 * 24 * 60 * 60 * 1000));
          break;
        case 'permanent':
          banExpiresAt = null; // Permanent ban
          break;
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isBanned: isBanned,
        banReason: isBanned ? banReason : null,
        banExpiresAt: banExpiresAt
      },
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates')
     .populate('membership.planId');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new user (admin only)
router.post('/users', requireAdmin, async (req, res) => {
  try {
    console.log('Creating user with data:', req.body);
    
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      dateOfBirth, 
      gender, 
      lookingFor, 
      location,
      role = 'user',
      membership = { tier: 'member' }
    } = req.body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName || !dateOfBirth || !gender || !lookingFor || !location) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['username', 'email', 'password', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'lookingFor', 'location']
      });
    }

    // Validate username length
    if (username.length < 3) {
      return res.status(400).json({ 
        message: 'Username must be at least 3 characters long' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format' 
      });
    }

    // Validate date format
    const parsedDate = new Date(dateOfBirth);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid date format for dateOfBirth' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    // Create new user with proper data structure
    // Note: User model will hash password automatically via pre-save middleware
    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Send plain password, model will hash it
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: `${firstName} ${lastName}`,
      dateOfBirth: parsedDate,
      gender,
      lookingFor,
      location: location.trim(),
      role,
      // ถ้า role เป็น admin/mod/support ให้ตั้ง createdByAdmin เป็น true
      createdByAdmin: ['admin', 'mod', 'support'].includes(role),
      createdByAdminId: ['admin', 'mod', 'support'].includes(role) ? req.user._id : null,
      createdByAdminAt: ['admin', 'mod', 'support'].includes(role) ? new Date() : null,
      membership: {
        tier: membership?.tier || 'member',
        startDate: new Date(),
        endDate: membership?.tier === 'member' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now for paid tiers
        autoRenew: false,
        planId: null
      },
      isActive: true,
      isBanned: false,
      gpsLocation: {
        lat: 13.7563, // Default to Bangkok
        lng: 100.5018
      },
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563]
      },
      dailyUsage: {
        chatCount: 0,
        imageUploadCount: 0,
        videoUploadCount: 0,
        lastReset: new Date(),
        lastDailyBonusClaim: null,
        lastSpinWheelTime: null
      },
      lastActive: new Date(),
      // เพิ่มข้อมูลเริ่มต้นสำหรับ fields ที่อาจจำเป็น
      profileImages: [],
      likes: [],
      blurredPhotosViewed: [],
      pinnedPosts: [],
      blurredPrivatePhotos: [],
      createdChatRooms: [],
      loginHistory: []
    });

    console.log('Saving user with data:', {
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      membership: newUser.membership
    });
    
    await newUser.save();

    const userResponse = await User.findById(newUser._id)
      .select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates')
      .populate('membership.planId');

    console.log('User created successfully:', userResponse._id);
    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Error creating user:', error);
    // Duplicate key (email/username) error
    if (error && (error.code === 11000 || error.code === 'E11000')) {
      const dupField = Object.keys(error.keyValue || {})[0] || 'field'
      return res.status(400).json({
        message: 'Duplicate value',
        error: `${dupField} already exists`,
        keyValue: error.keyValue
      });
    }
    // Mongoose validation error details
    if (error && error.name === 'ValidationError') {
      console.log('❌ Validation Error Details:', error.errors);
      console.log('❌ Validation Error Name:', error.name);
      console.log('❌ Validation Error Message:', error.message);
      
      const details = Object.keys(error.errors || {}).map(k => ({
        field: k,
        message: error.errors[k]?.message,
        value: error.errors[k]?.value,
        kind: error.errors[k]?.kind,
        path: error.errors[k]?.path
      }))
      console.log('❌ Validation Error Details Formatted:', details);
      return res.status(400).json({
        message: 'Validation failed',
        errors: details
      });
    }
    // Default
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message
    });
  }
});

// Get user profile details
router.get('/users/:id/profile', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates')
      .populate('membership.planId');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถดูรายละเอียดโปรไฟล์ SuperAdmin ได้
    if (req.user.role === 'admin' && user.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot view SuperAdmin profile',
        error: 'Admin users cannot view SuperAdmin profile details'
      });
    }

    // Calculate age
    const age = user.age;

    res.json({
      ...user.toObject(),
      age
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user role
router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    // รองรับ role ทั้งหมด: user, admin, mod, support, superadmin
    if (!['user', 'admin', 'mod', 'support', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // ตรวจสอบว่าผู้ใช้ที่จะแก้ไขเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถแก้ไข role ของ SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot modify SuperAdmin role',
        error: 'Admin users cannot modify SuperAdmin roles'
      });
    }

    // Admin ไม่สามารถสร้าง admin ได้ (เฉพาะ superadmin เท่านั้น)
    if (req.user.role === 'admin' && role === 'admin') {
      return res.status(403).json({ 
        message: 'Cannot create admin role',
        error: 'Admin users cannot create other admin users'
      });
    }

    // ถ้าแต่งตั้งเป็น admin/mod/support ให้ตั้ง createdByAdmin เป็น true
    const updateData = { role };
    if (['admin', 'mod', 'support'].includes(role)) {
      updateData.createdByAdmin = true;
      updateData.createdByAdminId = req.user._id;
      updateData.createdByAdminAt = new Date();
    } else if (role === 'user') {
      // ถ้าเปลี่ยนกลับเป็น user ให้ลบข้อมูล createdByAdmin
      updateData.createdByAdmin = false;
      updateData.createdByAdminId = null;
      updateData.createdByAdminAt = null;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates')
     .populate('membership.planId');

    // บันทึก log (ถ้ามี AdminActionLog)
    try {
      const AdminActionLog = require('../models/AdminActionLog');
      await AdminActionLog.createLog({
        adminId: req.user._id,
        actionType: 'admin_update_role',
        description: `Admin แต่งตั้ง ${targetUser.username} (${targetUser._id}) เป็น ${role}`,
        targetUserId: req.params.id,
        metadata: {
          oldRole: targetUser.role,
          newRole: role,
          targetUsername: targetUser.username,
          targetDisplayName: targetUser.displayName || targetUser.username
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'success'
      });
    } catch (logError) {
      console.error('Error logging admin action:', logError);
      // ไม่ throw error เพื่อไม่ให้กระทบการอัพเดท role
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user membership
router.patch('/users/:id/membership', requireAdmin, async (req, res) => {
  try {
    const { membership } = req.body;
    
    // ตรวจสอบว่าผู้ใช้ที่จะแก้ไขเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถแก้ไข membership ของ SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot modify SuperAdmin membership',
        error: 'Admin users cannot modify SuperAdmin memberships'
      });
    }
    
    let updateData = { membership };
    
    // ถ้าเปลี่ยน tier ให้หา planId ที่ถูกต้อง
    if (membership.tier && membership.tier !== 'member') {
      try {
        const MembershipPlan = require('../models/MembershipPlan');
        const plan = await MembershipPlan.findOne({ 
          tier: membership.tier, 
          isActive: true 
        });
        
        if (plan) {
          // คำนวณวันหมดอายุใหม่
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + plan.duration.days);
          
          updateData.membership = {
            ...membership,
            planId: plan._id,
            startDate: startDate,
            endDate: endDate
          };
          
          // อัพเดท verification status สำหรับ premium tiers
          updateData.isVerified = true;
          
          console.log(`🔄 Admin updated user ${req.params.id} membership to ${membership.tier} with planId: ${plan._id}`);
        } else {
          console.log(`⚠️  No plan found for tier: ${membership.tier}`);
        }
      } catch (error) {
        console.error('Error finding membership plan:', error);
      }
    } else if (membership.tier === 'member') {
      // สำหรับ member tier
      updateData.membership = {
        ...membership,
        planId: null,
        endDate: null
      };
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates')
     .populate('membership.planId');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    console.log('🗑️ Delete user request - Admin:', req.user.username, 'Target ID:', req.params.id);
    
    // ตรวจสอบว่าผู้ใช้ที่จะลบมีอยู่หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      console.log('❌ Target user not found');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('🎯 Target user found:', targetUser.username, 'Role:', targetUser.role);

    // Admin ปกติไม่สามารถลบ SuperAdmin ได้
    if (targetUser.role === 'superadmin' && req.user.role !== 'superadmin') {
      console.log('❌ Cannot delete SuperAdmin');
      return res.status(403).json({ 
        message: 'Cannot delete SuperAdmin user',
        error: 'Only SuperAdmin can delete SuperAdmin users'
      });
    }

    // Admin ไม่สามารถลบตัวเองได้
    if (targetUser._id.toString() === req.user._id.toString()) {
      console.log('❌ Cannot delete self');
      return res.status(403).json({ 
        message: 'Cannot delete yourself',
        error: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    console.log('✅ User deleted successfully:', targetUser.username);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.log('❌ Delete user error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // 1. ผู้ใช้ทั้งหมด (ไม่รวม SuperAdmin)
    const totalUsers = await User.countDocuments({ role: { $ne: 'superadmin' } });
    
    // 2. ข้อความทั้งหมด (จาก chat messages)
    const totalMessages = await User.aggregate([
      {
        $group: {
          _id: null,
          totalMessages: { $sum: { $ifNull: ['$dailyUsage.chatCount', 0] } }
        }
      }
    ]);
    
    // 3. ผู้ใช้ออนไลน์ (ผู้ใช้ที่มี isOnline = true และ active ภายใน 5 นาทีที่ผ่านมา) - ไม่รวม SuperAdmin
    // เคลียร์ ghost users ก่อนนับ (ผู้ใช้ที่มี isOnline: true แต่ lastActive เก่าเกิน 5 นาที)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // เคลียร์ ghost users อัตโนมัติ
    const ghostUsersCount = await User.countDocuments({
      isOnline: true,
      lastActive: { $lt: fiveMinutesAgo },
      role: { $ne: 'superadmin' }
    });
    
    if (ghostUsersCount > 0) {
      await User.updateMany(
        {
          isOnline: true,
          lastActive: { $lt: fiveMinutesAgo },
          role: { $ne: 'superadmin' }
        },
        {
          $set: { isOnline: false }
        }
      );
      console.log(`🧹 Auto-cleared ${ghostUsersCount} ghost users from stats calculation`);
    }
    
    // นับผู้ใช้ออนไลน์จริงๆ (isOnline: true และ lastActive ภายใน 5 นาทีที่ผ่านมา)
    const onlineUsers = await User.countDocuments({ 
      isOnline: true,
      lastActive: { $gte: fiveMinutesAgo },
      isActive: true, 
      isBanned: false,
      role: { $ne: 'superadmin' }
    });
    
    // 4. สมาชิก Premium (ผู้ใช้ที่มี membership tier เป็น premium หรือสูงกว่า) - ไม่รวม SuperAdmin
    const premiumUsers = await User.countDocuments({
      'membership.tier': { $in: ['premium', 'vip', 'diamond'] },
      isActive: true,
      isBanned: false,
      role: { $ne: 'superadmin' }
    });

    // สถิติตามระดับชั้นสมาชิก (ไม่รวม SuperAdmin)
    const membershipStats = await User.aggregate([
      {
        $match: { role: { $ne: 'superadmin' } }
      },
      {
        $group: {
          _id: '$membership.tier',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // สถิติตาม role (ไม่รวม SuperAdmin)
    const roleStats = await User.aggregate([
      {
        $match: { role: { $ne: 'superadmin' } }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // ผู้ใช้ที่ถูกแบน (ไม่รวม SuperAdmin)
    const bannedUsers = await User.countDocuments({ 
      isBanned: true,
      role: { $ne: 'superadmin' }
    });
    
    // ผู้ใช้ที่ยืนยันแล้ว (ไม่รวม SuperAdmin)
    const verifiedUsers = await User.countDocuments({ 
      isVerified: true,
      role: { $ne: 'superadmin' }
    });

    // ผู้ใช้ใหม่ในเดือนนี้ (ไม่รวม SuperAdmin)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: currentMonth },
      role: { $ne: 'superadmin' }
    });

    // ผู้ใช้ที่ active ในเดือนนี้ (ไม่รวม SuperAdmin)
    const activeUsersThisMonth = await User.countDocuments({
      isActive: true,
      isBanned: false,
      lastLoginAt: { $gte: currentMonth },
      role: { $ne: 'superadmin' }
    });

    res.json({
      totalUsers,
      totalMessages: totalMessages[0]?.totalMessages || 0,
      onlineUsers,
      premiumUsers,
      bannedUsers,
      verifiedUsers,
      newUsersThisMonth,
      activeUsersThisMonth,
      membershipStats,
      roleStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get membership plans
router.get('/membership-plans', requireAdmin, async (req, res) => {
  try {
    const plans = await MembershipPlan.find({
      tier: { $ne: 'test' } // กรอง test tier ออก
    }).sort({ order: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== ADMIN CHAT MANAGEMENT ====================

// GET /api/admin/chatrooms - ดูรายการห้องแชททั้งหมด
router.get('/chatrooms', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const sort = req.query.sort || '-createdAt';

    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) {
      query.type = type;
    }

    // สำหรับ admin dashboard - แสดงห้องแชททั้งหมด (ไม่ว่าจะสร้างโดยใครก็ตาม)
    const skip = (page - 1) * limit;
    
    // Get chat rooms without populate first to avoid errors
    let chatRooms = await ChatRoom.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Manually populate createdBy and owner if they exist
    const userIds = new Set();
    chatRooms.forEach(room => {
      if (room.createdBy) userIds.add(room.createdBy.toString());
      if (room.owner) userIds.add(room.owner.toString());
    });

    const users = await User.find({ _id: { $in: Array.from(userIds) } })
      .select('username displayName firstName lastName role')
      .lean();

    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });

    // Attach user data to rooms
    chatRooms = chatRooms.map(room => ({
      ...room,
      createdBy: room.createdBy ? (userMap[room.createdBy.toString()] || null) : null,
      owner: room.owner ? (userMap[room.owner.toString()] || null) : null
    }));

    // Count total documents matching the query
    const total = await ChatRoom.countDocuments(query);

    res.json({
      success: true,
      chatRooms: chatRooms || [],
      pagination: {
        page,
        limit,
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// DELETE /api/admin/chatrooms/:roomId - ลบห้องแชท
router.delete('/chatrooms/:roomId', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // ลบข้อความทั้งหมดในห้อง
    await ChatMessage.deleteMany({ chatRoom: roomId });

    // ลบห้องแชท
    await ChatRoom.findByIdAndDelete(roomId);

    res.json({ 
      message: 'Chat room deleted successfully',
      deletedRoom: {
        id: chatRoom._id,
        name: chatRoom.name,
        type: chatRoom.type
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/admin/chatrooms/:roomId/set-main - ตั้งห้องสาธารณะหลัก
router.post('/chatrooms/:roomId/set-main', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // ตรวจสอบว่าเป็นห้องสาธารณะหรือไม่
    if (chatRoom.type !== 'public') {
      return res.status(400).json({ message: 'Only public chat rooms can be set as main' });
    }

    // รีเซ็ตห้องหลักเดิม (ถ้ามี)
    await ChatRoom.updateMany(
      { type: 'public', isMainPublicRoom: true },
      { $unset: { isMainPublicRoom: 1 } }
    );

    // ตั้งห้องใหม่เป็นห้องหลัก
    chatRoom.isMainPublicRoom = true;
    await chatRoom.save();

    res.json({ 
      message: 'Main public room set successfully',
      mainRoom: {
        id: chatRoom._id,
        name: chatRoom.name,
        type: chatRoom.type
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/admin/messages/public - ดูรายการข้อความสาธารณะ (พร้อม filter)
router.get('/messages/public', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const filter = req.query.filter || 'all'; // all, inappropriate, obscene, discriminatory
    const sort = req.query.sort || '-createdAt';

    const query = {
      chatRoom: 'public', // Only public chat messages
      // Include deleted messages to show admin deletion notices
    };

    // Apply content filter based on filter type
    if (filter !== 'all') {
      const filterPatterns = {
        inappropriate: [
          /เซ็กซ์|มีเซ็กส์|ต้องการเซ็กส์|ต้องการมีเซ็กส์|ต้องการ.*เซ็กส์|ชวน.*เซ็กส์|ชักชวน.*เซ็กส์|ต้องการพบ|ต้องการเจอ|หาเซ็กส์|หา.*เซ็กส์|คุกคาม|ข่มขู่|จะทำร้าย|จะฆ่า|จะตี|จะตบ/i
        ],
        obscene: [
          /อวัยวะ|เพศ|เย็ด|มีเซ็กส์|xxx|sex|sexual|porn|pornographic|ลามก|ภาพลามก|คลิปลามก|เว็บลามก/i
        ],
        discriminatory: [
          /เหยียด|เหยียดเพศ|เหยียดสีผิว|เหยียดเชื้อชาติ|เหยียดศาสนา|ดูถูก|บูลลี่|bully|เสียดสี|mock|mockery|ล้อเลียน|เยาะเย้ย|ดูแคลน|ต่ำ|ต่ำช้า|โง่|ปัญญาอ่อน|อ้วน|ผอม|ดำ|ขาว|สั้น|เตี้ย|สูง|ต่างด้าว|ต่างชาติ/i
        ]
      };

      if (filterPatterns[filter]) {
        query.$or = filterPatterns[filter].map(pattern => ({
          content: { $regex: pattern }
        }));
      }
    }

    const skip = (page - 1) * limit;
    
    const messages = await ChatMessage.find(query)
      .populate('sender', 'username displayName membership membershipTier profileImages')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await ChatMessage.countDocuments(query);

    res.json({
      success: true,
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching public messages:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// GET /api/admin/messages - ดูรายการข้อความทั้งหมด
router.get('/messages', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const roomId = req.query.roomId || '';
    const type = req.query.type || '';
    const sort = req.query.sort || '-createdAt';

    const query = { isDeleted: false };
    
    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    if (roomId) {
      query.chatRoom = roomId;
    }

    if (type) {
      query.messageType = type;
    }

    const skip = (page - 1) * limit;
    
    const messages = await ChatMessage.find(query)
      .populate('sender', 'username displayName membership membershipTier profileImages')
      .populate('chatRoom', 'name type')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await ChatMessage.countDocuments(query);

    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admin/messages/:messageId - ลบข้อความ (soft delete - แสดงว่า "ถูกลบโดยผู้ดูแลระบบ")
router.delete('/messages/:messageId', requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Soft delete - mark as deleted by admin instead of actually deleting
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    await message.save();

    res.json({ 
      message: 'Message deleted successfully',
      deletedMessage: {
        id: message._id,
        content: message.content,
        messageType: message.messageType,
        isDeleted: true
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admin/messages/room/:roomId - ลบข้อความทั้งหมดในห้อง
router.delete('/messages/room/:roomId', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // ลบข้อความทั้งหมดในห้อง
    const result = await ChatMessage.deleteMany({ chatRoom: roomId });

    res.json({ 
      message: 'All messages in room deleted successfully',
      deletedCount: result.deletedCount,
      roomName: chatRoom.name
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admin/images/:messageId - ลบรูปภาพจากข้อความ
router.delete('/images/:messageId', requireAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.messageType !== 'image') {
      return res.status(400).json({ message: 'Message is not an image' });
    }

    // ลบไฟล์รูปภาพถ้ามี
    const imageUrl = message.fileInfo?.fileUrl || message.fileUrl;
    if (imageUrl && !imageUrl.startsWith('http')) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', imageUrl);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // ลบข้อความรูปภาพ
    await Message.findByIdAndDelete(messageId);

    res.json({ 
      message: 'Image deleted successfully',
      deletedImage: {
        id: message._id,
        fileName: message.fileInfo?.fileName || message.fileName,
        fileUrl: imageUrl
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admin/images/room/:roomId - ลบรูปภาพทั้งหมดในห้อง
router.delete('/images/room/:roomId', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // หาข้อความรูปภาพทั้งหมดในห้อง
    const imageMessages = await ChatMessage.find({ 
      chatRoom: roomId, 
      messageType: 'image',
      isDeleted: false 
    });

    // ลบไฟล์รูปภาพ
    const fs = require('fs');
    const path = require('path');
    
    for (const message of imageMessages) {
      const imageUrl = message.fileInfo?.fileUrl || message.fileUrl;
      if (imageUrl && !imageUrl.startsWith('http')) {
        const filePath = path.join(__dirname, '..', imageUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // ลบข้อความรูปภาพทั้งหมด
    const result = await ChatMessage.deleteMany({ 
      chatRoom: roomId, 
      messageType: 'image' 
    });

    res.json({ 
      message: 'All images in room deleted successfully',
      deletedCount: result.deletedCount,
      roomName: chatRoom.name
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== ADMIN CHAT ROOM CREATION ====================

// POST /api/admin/chatrooms/create - สร้างห้องแชทใหม่
router.post('/chatrooms/create', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      type = 'private',
      entryFee = 0,
      entryConditions = {},
      ageRestriction = {},
      settings = {},
      inviteLink = {}
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    // สร้าง invite code ถ้ามีการตั้งค่า
    let inviteCode = null;
    if (inviteLink.generateLink) {
      inviteCode = generateInviteCode();
    }

    // สร้างห้องแชท
    const chatRoom = new ChatRoom({
      name: name.trim(),
      description: description?.trim(),
      type,
      owner: req.user._id, // Admin เป็นเจ้าของ
      entryFee,
      entryConditions: {
        requiredCoins: entryConditions.requiredCoins || 0,
        specialConditions: entryConditions.specialConditions || '',
        requireRealPayment: entryConditions.requireRealPayment || false,
        realPaymentAmount: entryConditions.realPaymentAmount || 0
      },
      ageRestriction: {
        minAge: ageRestriction.minAge || 18,
        maxAge: ageRestriction.maxAge || 100
      },
      settings: {
        maxMembers: settings.maxMembers || 100,
        allowGifts: settings.allowGifts !== false,
        allowCoinGifts: settings.allowCoinGifts !== false,
        moderationEnabled: settings.moderationEnabled || false
      },
      inviteLink: inviteCode ? {
        code: inviteCode,
        isActive: true,
        expiresAt: inviteLink.expiresAt ? new Date(inviteLink.expiresAt) : null,
        maxUses: inviteLink.maxUses || -1,
        usedCount: 0
      } : undefined
    });

    await chatRoom.save();

    res.json({
      message: 'Chat room created successfully',
      chatRoom: {
        id: chatRoom._id,
        name: chatRoom.name,
        type: chatRoom.type,
        entryFee: chatRoom.entryFee,
        entryConditions: chatRoom.entryConditions,
        inviteLink: chatRoom.inviteLink
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/admin/chatrooms/:roomId/invite-link - สร้าง invite link
router.post('/chatrooms/:roomId/invite-link', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { expiresAt, maxUses } = req.body;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    const inviteCode = generateInviteCode();
    
    chatRoom.inviteLink = {
      code: inviteCode,
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      maxUses: maxUses || -1,
      usedCount: 0
    };

    await chatRoom.save();

    res.json({
      message: 'Invite link created successfully',
      inviteLink: chatRoom.inviteLink
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/admin/chatrooms/:roomId/invite-link - ดู invite link
router.get('/chatrooms/:roomId/invite-link', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    if (!chatRoom.inviteLink || !chatRoom.inviteLink.code) {
      return res.status(404).json({ message: 'No invite link found' });
    }

    res.json({
      inviteLink: chatRoom.inviteLink,
      fullUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${chatRoom.inviteLink.code}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/admin/chatrooms/:roomId/invite-link - ลบ invite link
router.delete('/chatrooms/:roomId/invite-link', requireAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    chatRoom.inviteLink = undefined;
    await chatRoom.save();

    res.json({ message: 'Invite link deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/admin/chatrooms/join-by-invite - เข้าร่วมห้องด้วย invite link
router.post('/chatrooms/join-by-invite', async (req, res) => {
  try {
    const { inviteCode, userId } = req.body;

    if (!inviteCode || !userId) {
      return res.status(400).json({ message: 'Invite code and user ID are required' });
    }

    const chatRoom = await ChatRoom.findOne({ 'inviteLink.code': inviteCode });
    if (!chatRoom) {
      return res.status(404).json({ message: 'Invalid invite link' });
    }

    // ตรวจสอบว่า invite link ยังใช้งานได้หรือไม่
    if (!chatRoom.inviteLink.isActive) {
      return res.status(400).json({ message: 'Invite link is inactive' });
    }

    if (chatRoom.inviteLink.expiresAt && new Date() > chatRoom.inviteLink.expiresAt) {
      return res.status(400).json({ message: 'Invite link has expired' });
    }

    if (chatRoom.inviteLink.maxUses !== -1 && chatRoom.inviteLink.usedCount >= chatRoom.inviteLink.maxUses) {
      return res.status(400).json({ message: 'Invite link usage limit reached' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ตรวจสอบเงื่อนไขการเข้าห้อง
    const canJoin = await checkEntryConditions(chatRoom, user);
    if (!canJoin.success) {
      return res.status(403).json({ message: canJoin.message });
    }

    // เพิ่มผู้ใช้เป็นสมาชิก
    if (!chatRoom.isMember(userId)) {
      chatRoom.addMember(userId);
      chatRoom.inviteLink.usedCount += 1;
      await chatRoom.save();
    }

    res.json({
      message: 'Successfully joined chat room',
      chatRoom: {
        id: chatRoom._id,
        name: chatRoom.name,
        type: chatRoom.type
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function สำหรับสร้าง invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper function สำหรับตรวจสอบเงื่อนไขการเข้าห้อง
async function checkEntryConditions(chatRoom, user) {
  // ตรวจสอบจำนวนเหรียญ
  if (chatRoom.entryConditions.requiredCoins > 0) {
    if (user.coins < chatRoom.entryConditions.requiredCoins) {
      return {
        success: false,
        message: `ต้องมีเหรียญอย่างน้อย ${chatRoom.entryConditions.requiredCoins} เหรียญ`
      };
    }
  }

  // ตรวจสอบเงื่อนไขพิเศษ
  if (chatRoom.entryConditions.specialConditions) {
    const conditions = chatRoom.entryConditions.specialConditions.toLowerCase();
    
    if (conditions.includes('premium') && user.membership.tier === 'member') {
      return {
        success: false,
        message: 'ต้องเป็นสมาชิก Premium'
      };
    }
    
    if (conditions.includes('gold') && user.membership.tier !== 'gold') {
      return {
        success: false,
        message: 'ต้องเป็นสมาชิก Gold'
      };
    }
  }

  // ตรวจสอบการเสียเงินจริง
  if (chatRoom.entryConditions.requireRealPayment) {
    // ตรวจสอบว่าผู้ใช้มีเงินเพียงพอหรือไม่
    // (ต้องเชื่อมต่อกับระบบการชำระเงินจริง)
    return {
      success: false,
      message: `ต้องชำระเงิน ${chatRoom.entryConditions.realPaymentAmount} บาท`
    };
  }

  return { success: true };
}

// Get analytics data
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '12months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    }

    // Generate monthly data
    const monthlyData = {
      users: [],
      revenue: [],
      performance: []
    };

    const months = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = currentDate.toLocaleDateString('th-TH', { month: 'short' });
      months.push({ key: monthKey, name: monthName, date: new Date(currentDate) });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Calculate monthly statistics
    for (const month of months) {
      const monthStart = new Date(month.date.getFullYear(), month.date.getMonth(), 1);
      const monthEnd = new Date(month.date.getFullYear(), month.date.getMonth() + 1, 0, 23, 59, 59);

      // Users count for this month (ไม่รวม SuperAdmin)
      const usersCount = await User.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd },
        isActive: true,
        role: { $ne: 'superadmin' }
      });

      // Total users up to this month (ไม่รวม SuperAdmin)
      const totalUsers = await User.countDocuments({
        createdAt: { $lte: monthEnd },
        isActive: true,
        role: { $ne: 'superadmin' }
      });

      // Revenue calculation - should connect to real payment system - ไม่รวม SuperAdmin
      const premiumUsers = await User.countDocuments({
        'membership.tier': { $in: ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver'] },
        'membership.updatedAt': { $gte: monthStart, $lte: monthEnd },
        role: { $ne: 'superadmin' }
      });
      
      // Revenue calculation - placeholder for future payment system integration
      const revenue = 0; // Note: Would calculate from actual payment records when payment system is implemented

      // Performance calculation - placeholder for future monitoring system integration
      const performance = 0; // Note: Would calculate from actual system metrics when monitoring is implemented

      monthlyData.users.push({
        month: month.name,
        value: totalUsers,
        growth: month.key === months[0].key ? 0 : Math.floor(Math.random() * 20) + 5
      });

      monthlyData.revenue.push({
        month: month.name,
        value: revenue,
        growth: month.key === months[0].key ? 0 : Math.floor(Math.random() * 25) + 10
      });

      monthlyData.performance.push({
        month: month.name,
        value: Math.round(performance),
        growth: month.key === months[0].key ? 0 : Math.floor(Math.random() * 5) + 1
      });
    }

    // Calculate summary statistics (ไม่รวม SuperAdmin)
    const totalUsers = await User.countDocuments({ 
      isActive: true,
      role: { $ne: 'superadmin' }
    });
    const premiumUsers = await User.countDocuments({
      'membership.tier': { $in: ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver'] },
      role: { $ne: 'superadmin' }
    });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { 
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: now
      },
      isActive: true,
      role: { $ne: 'superadmin' }
    });

    // Revenue calculation - placeholder for future payment system integration
    const totalRevenue = 0; // Note: Would sum from actual payment transactions when payment system is implemented

    // Performance calculation - placeholder for future monitoring system integration
    const avgPerformance = 0; // Note: Would calculate from actual system metrics when monitoring is implemented

    const summary = {
      totalUsers,
      totalRevenue,
      avgPerformance,
      newUsersThisMonth,
      premiumUsers
    };

    res.json({
      monthlyData,
      summary,
      period
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent activities
router.get('/activities', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // ดึงข้อมูลกิจกรรมล่าสุดแบบง่าย
    const allActivities = [];

    // 1. Recent registrations (ไม่รวม SuperAdmin)
    const recentUsers = await User.find({ role: { $ne: 'superadmin' } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName createdAt');

    recentUsers.forEach(user => {
      allActivities.push({
        id: `${user._id}-register-${user.createdAt.getTime()}`,
        type: 'account_created',
        message: `ผู้ใช้ใหม่สมัครสมาชิก: ${user.firstName} ${user.lastName}`,
        timestamp: user.createdAt,
        status: 'success'
      });
    });

    // 2. Premium users (ไม่รวม SuperAdmin)
    const premiumUsers = await User.find({
      'membership.tier': { $in: ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver'] },
      role: { $ne: 'superadmin' }
    })
      .sort({ 'membership.updatedAt': -1 })
      .limit(5)
      .select('firstName lastName membership');

    premiumUsers.forEach(user => {
      if (user.membership && user.membership.updatedAt) {
        allActivities.push({
          id: `${user._id}-upgrade-${user.membership.updatedAt.getTime()}`,
          type: 'membership_upgrade',
          message: `อัพเกรดเป็น Premium: ${user.firstName} ${user.lastName}`,
          timestamp: user.membership.updatedAt,
          status: 'premium'
        });
      }
    });

    // 3. Banned users (ไม่รวม SuperAdmin)
    const bannedUsers = await User.find({ 
      isBanned: true,
      role: { $ne: 'superadmin' }
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('firstName lastName banReason updatedAt');

    bannedUsers.forEach(user => {
      allActivities.push({
        id: `${user._id}-banned-${user.updatedAt.getTime()}`,
        type: 'account_banned',
        message: `แบนบัญชี: ${user.firstName} ${user.lastName} (เหตุผล: ${user.banReason || 'ไม่ระบุเหตุผล'})`,
        timestamp: user.updatedAt,
        status: 'warning'
      });
    });

    // เรียงลำดับตามเวลา
    allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // จำกัดจำนวนและ pagination
    const startIndex = skip;
    const endIndex = skip + limit;
    const paginatedActivities = allActivities.slice(startIndex, endIndex);

    res.json({
      activities: paginatedActivities,
      pagination: {
        page,
        limit,
        total: allActivities.length,
        pages: Math.ceil(allActivities.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reset user password (admin only)
router.patch('/users/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ 
        message: 'New password is required' 
      });
    }

    // Validate password requirements
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    
    if (!hasUpperCase || !hasNumber) {
      return res.status(400).json({ 
        message: 'Password must contain at least 1 uppercase letter and 1 number' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // ตรวจสอบว่าผู้ใช้ที่จะรีเซ็ตรหัสผ่านเป็น SuperAdmin หรือไม่
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Admin ไม่สามารถรีเซ็ตรหัสผ่านของ SuperAdmin ได้
    if (req.user.role === 'admin' && targetUser.role === 'superadmin') {
      return res.status(403).json({ 
        message: 'Cannot reset SuperAdmin password',
        error: 'Admin users cannot reset SuperAdmin passwords'
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
      { new: true }
    ).select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates')
     .populate('membership.planId');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Password reset successfully',
      user: user
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Password Reset Route
router.post('/users/:id/reset-password', requireAdminPermissions([ADMIN_PERMISSIONS.PASSWORD_RESET]), async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { id } = req.params;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'รีเซ็ตรหัสผ่านสำเร็จ'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน'
    });
  }
});

// Admin Create Premium User Route
router.post('/users/premium', requireAdminPermissions([ADMIN_PERMISSIONS.PREMIUM_MANAGEMENT]), async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      lookingFor,
      location,
      tier = 'platinum'
    } = req.body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName || !dateOfBirth || !gender || !lookingFor || !location) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'อีเมลหรือชื่อผู้ใช้นี้มีผู้ใช้งานแล้ว'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create premium user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      lookingFor,
      location,
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563] // Default Bangkok coordinates
      },
      role: 'user',
      isActive: true,
      isVerified: true,
      membership: {
        tier: tier,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        updatedAt: new Date()
      }
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'สร้างผู้ใช้ระดับพิเศษสำเร็จ',
      data: {
        user: newUser.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Create premium user error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้'
    });
  }
});

// Admin Message Management Routes
router.get('/messages', requireAdminPermissions([ADMIN_PERMISSIONS.MESSAGE_MANAGEMENT]), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await ChatMessage.find()
      .populate('sender', 'username email firstName lastName profileImages')
      .populate('chatRoom', 'name description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ChatMessage.countDocuments();

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลข้อความ'
    });
  }
});

// Admin Delete Message Route (soft delete)
router.delete('/messages/:id', requireAdminPermissions([ADMIN_PERMISSIONS.MESSAGE_MANAGEMENT]), async (req, res) => {
  try {
    const message = await ChatMessage.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบข้อความ'
      });
    }

    // Soft delete - mark as deleted by admin
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    await message.save();

    res.json({
      success: true,
      message: 'ลบข้อความสำเร็จ'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบข้อความ'
    });
  }
});

// Admin Chatroom Management Routes
router.get('/chatrooms', requireAdminPermissions([ADMIN_PERMISSIONS.CHATROOM_MANAGEMENT]), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const chatrooms = await ChatRoom.find()
      .populate('createdBy', 'username email firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ChatRoom.countDocuments();

    res.json({
      success: true,
      data: {
        chatrooms,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get chatrooms error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลห้องแชท'
    });
  }
});

// POST /api/admin/reset-spin-wheel - รีเซ็ตการหมุนวงล้อ (เฉพาะ Admin)
router.post('/reset-spin-wheel', requireAdmin, async (req, res) => {
  try {
    console.log('🎪 Reset spin wheel request received:', req.body);
    const { userId } = req.body;

    if (!userId) {
      console.log('❌ Missing userId in request');
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    console.log('🔍 Looking for user with ID:', userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('👤 Found user:', user.username, 'Current lastSpinWheelTime:', user.dailyUsage?.lastSpinWheelTime);

    // รีเซ็ตเวลาหมุนวงล้อ โดยลบ lastSpinWheelTime หรือตั้งเป็น null
    user.dailyUsage.lastSpinWheelTime = null;
    await user.save();

    console.log('✅ Spin wheel reset successfully for user:', user.username);
    res.json({
      success: true,
      message: 'Spin wheel reset successfully',
      data: {
        userId: user._id,
        username: user.username,
        canSpinWheel: user.canSpinWheel()
      }
    });

  } catch (error) {
    console.error('Error resetting spin wheel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset spin wheel',
      error: error.message
    });
  }
});

// Admin Create Chatroom Route
router.post('/chatrooms', requireAdminPermissions([ADMIN_PERMISSIONS.CHATROOM_MANAGEMENT]), async (req, res) => {
  try {
    const { name, description, isPrivate = false, maxMembers = 100 } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อห้องแชท'
      });
    }

    const newChatroom = new ChatRoom({
      name,
      description,
      isPrivate,
      maxMembers,
      createdBy: req.user._id,
      members: [req.user._id]
    });

    await newChatroom.save();

    res.status(201).json({
      success: true,
      message: 'สร้างห้องแชทสำเร็จ',
      data: {
        chatroom: newChatroom
      }
    });
  } catch (error) {
    console.error('Create chatroom error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างห้องแชท'
    });
  }
});

// Admin Delete Chatroom Route
router.delete('/chatrooms/:id', requireAdminPermissions([ADMIN_PERMISSIONS.CHATROOM_MANAGEMENT]), async (req, res) => {
  try {
    const chatroom = await ChatRoom.findByIdAndDelete(req.params.id);
    
    if (!chatroom) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชท'
      });
    }

    // Delete all messages in this chatroom
    await ChatMessage.deleteMany({ chatRoom: req.params.id });

    res.json({
      success: true,
      message: 'ลบห้องแชทสำเร็จ'
    });
  } catch (error) {
    console.error('Delete chatroom error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบห้องแชท'
    });
  }
});

// Admin Join Any Chatroom Route (Unlimited Access)
router.post('/chatrooms/:id/join', requireAdminPermissions([ADMIN_PERMISSIONS.UNLIMITED_CHAT_ACCESS]), async (req, res) => {
  try {
    const chatroom = await ChatRoom.findById(req.params.id);
    
    if (!chatroom) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชท'
      });
    }

    // Add admin to chatroom members if not already a member
    if (!chatroom.members.includes(req.user._id)) {
      chatroom.members.push(req.user._id);
      await chatroom.save();
    }

    res.json({
      success: true,
      message: 'เข้าร่วมห้องแชทสำเร็จ',
      data: {
        chatroom
      }
    });
  } catch (error) {
    console.error('Join chatroom error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าร่วมห้องแชท'
    });
  }
});

// Get user statistics for System Monitor
router.get('/users/stats', requireAdmin, async (req, res) => {
  try {
    // Total users (excluding superadmin)
    const total = await User.countDocuments({ role: { $ne: 'superadmin' } });
    
    // Online users (isOnline: true and lastActive within last 5 minutes)
    // เคลียร์ ghost users ก่อนนับ
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // เคลียร์ ghost users อัตโนมัติ
    const ghostUsersCount = await User.countDocuments({
      isOnline: true,
      lastActive: { $lt: fiveMinutesAgo },
      role: { $ne: 'superadmin' }
    });
    
    if (ghostUsersCount > 0) {
      await User.updateMany(
        {
          isOnline: true,
          lastActive: { $lt: fiveMinutesAgo },
          role: { $ne: 'superadmin' }
        },
        {
          $set: { isOnline: false }
        }
      );
      console.log(`🧹 Auto-cleared ${ghostUsersCount} ghost users from users/stats`);
    }
    
    // นับผู้ใช้ออนไลน์จริงๆ
    const online = await User.countDocuments({
      isOnline: true,
      lastActive: { $gte: fiveMinutesAgo },
      role: { $ne: 'superadmin' },
      isBanned: false,
      isActive: true
    });
    
    // Premium users (excluding superadmin)
    const premium = await User.countDocuments({
      'membership.tier': { $in: ['platinum', 'diamond', 'vip2', 'vip1', 'vip', 'gold', 'silver'] },
      role: { $ne: 'superadmin' },
      isBanned: false
    });

    res.json({
      success: true,
      total,
      online,
      premium
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติผู้ใช้',
      error: error.message
    });
  }
});

// Get message statistics for System Monitor
router.get('/messages/stats', requireAdmin, async (req, res) => {
  try {
    // Total messages
    const total = await ChatMessage.countDocuments({});
    
    // Messages today (from start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await ChatMessage.countDocuments({
      createdAt: { $gte: today }
    });

    res.json({
      success: true,
      total,
      today: todayCount
    });
  } catch (error) {
    console.error('Error fetching message stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติข้อความ',
      error: error.message
    });
  }
});

// Clear ghost users (users marked as online but inactive)
router.post('/clear-ghost-users', requireAdmin, async (req, res) => {
  try {
    // Users marked as online but lastActive is more than 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const ghostUsers = await User.find({
      isOnline: true,
      lastActive: { $lt: fiveMinutesAgo },
      role: { $ne: 'superadmin' }
    });

    const clearedCount = ghostUsers.length;
    
    // Update ghost users to offline
    if (clearedCount > 0) {
      await User.updateMany(
        {
          isOnline: true,
          lastActive: { $lt: fiveMinutesAgo },
          role: { $ne: 'superadmin' }
        },
        {
          $set: { isOnline: false }
        }
      );
    }

    // Count real online users (active within last 5 minutes)
    const realOnlineUsers = await User.countDocuments({
      isOnline: true,
      lastActive: { $gte: fiveMinutesAgo },
      role: { $ne: 'superadmin' },
      isBanned: false
    });

    console.log(`🧹 Cleared ${clearedCount} ghost users. Real online users: ${realOnlineUsers}`);

    res.json({
      success: true,
      clearedCount,
      realOnlineUsers,
      message: `เคลียร์ ghost users สำเร็จ - ${clearedCount} คน (ออนไลน์จริงๆ: ${realOnlineUsers} คน)`
    });
  } catch (error) {
    console.error('Error clearing ghost users:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเคลียร์ ghost users',
      error: error.message
    });
  }
});

// Get available permissions
router.get('/permissions', requireAdmin, async (req, res) => {
  try {
    const permissions = [
      {
        id: 'user_management',
        name: 'จัดการผู้ใช้',
        description: 'สามารถจัดการผู้ใช้ทั้งหมด (ดู, แก้ไข, แบน, ลบ)',
        category: 'users'
      },
      {
        id: 'message_management',
        name: 'จัดการข้อความ',
        description: 'สามารถจัดการข้อความสาธารณะ (ดู, ลบ)',
        category: 'messages'
      },
      {
        id: 'chatroom_management',
        name: 'จัดการห้องแชท',
        description: 'สามารถจัดการห้องแชททั้งหมด (ดู, สร้าง, ลบ)',
        category: 'chatrooms'
      },
      {
        id: 'premium_management',
        name: 'จัดการสมาชิก Premium',
        description: 'สามารถจัดการสมาชิก Premium และดูรายได้',
        category: 'premium'
      },
      {
        id: 'password_reset',
        name: 'รีเซ็ตรหัสผ่าน',
        description: 'สามารถรีเซ็ตรหัสผ่านของผู้ใช้',
        category: 'users'
      },
      {
        id: 'unlimited_chat_access',
        name: 'เข้าถึงแชทไม่จำกัด',
        description: 'สามารถเข้าถึงแชทได้ไม่จำกัด',
        category: 'chat'
      }
    ];

    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get role permissions mapping
router.get('/role-permissions', requireAdmin, async (req, res) => {
  try {
    const rolePermissions = {
      admin: [
        'user_management',
        'message_management',
        'chatroom_management',
        'premium_management',
        'password_reset',
        'unlimited_chat_access'
      ],
      mod: [
        'message_management',
        'chatroom_management',
        'unlimited_chat_access'
      ],
      support: [
        'user_management',
        'password_reset'
      ],
      superadmin: [
        'user_management',
        'message_management',
        'chatroom_management',
        'premium_management',
        'password_reset',
        'unlimited_chat_access'
      ]
    };

    res.json({ roles: rolePermissions });
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user permissions detail
router.get('/users/:id/permissions', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId)
      .select('-password -phoneVerificationCode -phoneVerificationExpires -coordinates');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get role permissions based on user's role
    const rolePermissionsMap = {
      admin: [
        'user_management',
        'message_management',
        'chatroom_management',
        'premium_management',
        'password_reset',
        'unlimited_chat_access'
      ],
      mod: [
        'message_management',
        'chatroom_management',
        'unlimited_chat_access'
      ],
      support: [
        'user_management',
        'password_reset'
      ],
      superadmin: [
        'user_management',
        'message_management',
        'chatroom_management',
        'premium_management',
        'password_reset',
        'unlimited_chat_access'
      ]
    };

    const rolePermissions = rolePermissionsMap[user.role] || [];
    const userPermissions = user.permissions || [];
    
    // Combine all permissions (role + user specific)
    const allPermissions = [...new Set([...rolePermissions, ...userPermissions.map(p => typeof p === 'object' ? p.name : p)])];

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      rolePermissions,
      userPermissions,
      allPermissions
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

