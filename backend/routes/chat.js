const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');
const mongoose = require('mongoose');
const { chatFileStorage, CLOUDINARY_ENABLED, cloudinary } = require('../config/cloudinary');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-2025';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ token การยืนยันตัวตน'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token ไม่ถูกต้อง'
    });
  }
};

// Apply authentication middleware to all routes
router.use(authenticateToken);

// ========= Chat File Upload Helpers =========
const chatUploadsPath = path.join(__dirname, '..', 'uploads', 'chat-files');

const ensureChatUploadDir = () => {
  if (!fs.existsSync(chatUploadsPath)) {
    fs.mkdirSync(chatUploadsPath, { recursive: true });
    console.log('📁 Created chat uploads directory:', chatUploadsPath);
  }
};

const localChatFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureChatUploadDir();
    cb(null, chatUploadsPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `chat-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const chatFileUpload = multer({
  storage: CLOUDINARY_ENABLED ? chatFileStorage : localChatFileStorage,
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

const handleChatUploadError = (err, req, res) => {
  console.error('❌ Chat file upload error:', err);

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

  return res.status(400).json({
    success: false,
    message: err.message || 'อัปโหลดไฟล์ไม่สำเร็จ'
  });
};

const uploadChatFileMiddleware = (req, res, next) => {
  chatFileUpload.single('file')(req, res, (err) => {
    if (err) {
      return handleChatUploadError(err, req, res);
    }
    next();
  });
};

// Get chat messages between two users
router.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID ผู้ใช้ไม่ถูกต้อง'
      });
    }

    // Check if the other user exists
    const otherUser = await User.findById(userId).select('username firstName lastName');
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    // TODO: Implement actual message retrieval from database
    // For now, return empty array
    res.json({
      success: true,
      messages: [],
      otherUser: {
        id: otherUser._id,
        username: otherUser.username,
        firstName: otherUser.firstName,
        lastName: otherUser.lastName
      }
    });

  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อความ'
    });
  }
});

// Send a message
router.post('/send', async (req, res) => {
  try {
    const { recipientId, message, messageType = 'text' } = req.body;
    const senderId = req.user._id;

    // Validate required fields
    if (!recipientId || !message) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    // Validate recipientId
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({
        success: false,
        message: 'ID ผู้รับไม่ถูกต้อง'
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId).select('username firstName lastName');
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้รับข้อความ'
      });
    }

    // TODO: Implement actual message saving to database
    // For now, return success response
    res.json({
      success: true,
      message: 'ส่งข้อความสำเร็จ',
      data: {
        messageId: new mongoose.Types.ObjectId(),
        senderId,
        recipientId,
        message,
        messageType,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการส่งข้อความ'
    });
  }
});

// Get chat list (conversations)
router.get('/conversations', async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // TODO: Implement actual conversation list retrieval from database
    // For now, return empty array
    res.json({
      success: true,
      conversations: []
    });

  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการแชท'
    });
  }
});

// Mark messages as read
router.put('/mark-read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID ผู้ใช้ไม่ถูกต้อง'
      });
    }

    // TODO: Implement actual mark as read functionality
    // For now, return success response
    res.json({
      success: true,
      message: 'ทำเครื่องหมายว่าอ่านแล้ว'
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการทำเครื่องหมายว่าอ่านแล้ว'
    });
  }
});

// Upload chat file (image, video, etc.)
router.post('/upload-file', uploadChatFileMiddleware, async (req, res) => {
  try {
    if (!req.file) {
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
      : `${localHost}/uploads/chat-files/${generatedFileName}`;

    if (CLOUDINARY_ENABLED && fileUrl && !/^https?:\/\//i.test(fileUrl) && generatedFileName) {
      try {
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

    const responsePayload = {
      fileUrl,
      fileName: req.file.originalname || generatedFileName,
      fileSize: req.file.size || null,
      mimeType: req.file.mimetype || null,
      publicId: generatedFileName,
      secureUrl: (uploadedPath && /^https?:\/\//i.test(uploadedPath)) ? uploadedPath : fileUrl,
      thumbnailUrl: (uploadedPath && /^https?:\/\//i.test(uploadedPath)) ? uploadedPath : fileUrl
    };

    res.json({
      success: true,
      message: 'อัปโหลดไฟล์สำเร็จ',
      data: responsePayload
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์'
    });
  }
});

// Get messages from public or community room
router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    // Validate roomId - allow 'public', 'community', or ObjectId
    if (roomId !== 'public' && roomId !== 'community' && !mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID'
      });
    }

    // Get messages from database (include deleted messages to show admin deletion notice)
    const messages = await ChatMessage.find({
      chatRoom: roomId
      // Removed isDeleted: false to show deleted messages with admin notice
    })
      .populate('sender', 'username displayName profileImages membershipTier membership')
      .populate('replyTo')
      .populate('deletedBy', 'username displayName')
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.json({
      success: true,
      messages,
      roomId
    });

  } catch (error) {
    console.error('Error getting room messages:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อความ'
    });
  }
});

// Get list of community rooms
router.get('/rooms', async (req, res) => {
  try {
    const { limit = 50, skip = 0, search = '' } = req.query;
    const query = {
      type: 'group',
      isActive: true,
      isArchived: false
    };

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const rooms = await ChatRoom.find(query)
      .populate('createdBy', 'username displayName')
      .select('_id name description createdBy createdAt avatar lastMessageAt isPaidRoom entryFee')
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean(); // Use lean() to get plain objects

    res.json({
      success: true,
      rooms: rooms
    });

  } catch (error) {
    console.error('❌ Error getting community rooms:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการห้องแชท',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new community room
router.post('/rooms', async (req, res) => {
  try {
    const { name, description, avatar, isPaidRoom, entryFee } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อห้องแชท'
      });
    }

    // Get user's membership limits
    const membershipTier = req.user.membership?.tier || 'member';
    
    // Check if user can create room (based on membership tier)
    const tierLimits = {
      member: { chatRoomLimit: 0 }, // Cannot create
      silver: { chatRoomLimit: 1 },
      gold: { chatRoomLimit: 2 },
      vip: { chatRoomLimit: 3 },
      vip1: { chatRoomLimit: 5 },
      vip2: { chatRoomLimit: 10 },
      diamond: { chatRoomLimit: -1 }, // Unlimited
      platinum: { chatRoomLimit: -1 } // Unlimited
    };

    const limits = tierLimits[membershipTier] || tierLimits.member;

    // Check if user has reached room limit
    if (limits.chatRoomLimit !== -1) {
      const userRoomCount = await ChatRoom.countDocuments({
        createdBy: userId,
        type: 'group',
        isActive: true
      });

      if (userRoomCount >= limits.chatRoomLimit) {
        return res.status(403).json({
          success: false,
          message: `สมาชิกประเภท ${membershipTier} สามารถสร้างห้องได้เพียง ${limits.chatRoomLimit} ห้อง กรุณาอัพเกรดสมาชิก`
        });
      }
    }

    // Validate paid room settings
    if (isPaidRoom && (!entryFee || entryFee < 1)) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุค่าเข้าห้องที่ถูกต้อง (ขั้นต่ำ 1 เหรียญ)'
      });
    }

    // Create new room
    const newRoom = await ChatRoom.create({
      name: name.trim(),
      description: description?.trim() || '',
      type: 'group',
      createdBy: userId,
      owner: userId,
      avatar: avatar || null,
      isPaidRoom: isPaidRoom || false,
      entryFee: isPaidRoom ? parseInt(entryFee) : 0,
      participants: [
        {
          user: userId,
          role: 'admin',
          joinedAt: new Date()
        }
      ],
      settings: {
        allowInvites: true,
        allowFileSharing: true,
        allowVoiceMessages: true,
        allowReactions: true,
        allowEditing: true,
        allowDeleting: true
      }
    });

    // Populate createdBy
    await newRoom.populate('createdBy', 'username displayName');

    res.json({
      success: true,
      message: 'สร้างห้องแชทสำเร็จ',
      room: newRoom
    });

  } catch (error) {
    console.error('Error creating community room:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างห้องแชท'
    });
  }
});

// Join community room
router.post('/rooms/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: 'ID ห้องแชทไม่ถูกต้อง'
      });
    }

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชท'
      });
    }

    // Check if room is active
    if (!room.isActive) {
      return res.status(403).json({
        success: false,
        message: 'ห้องแชทนี้ถูกปิดใช้งานแล้ว'
      });
    }

    // Check if user is already a participant
    const isParticipant = room.participants.some(p => p.user.toString() === userId.toString());
    
    // Get user info to check payment status
    const user = await User.findById(userId);
    
    // Check if room requires payment (paid rooms)
    if (room.isPaidRoom && room.entryFee > 0) {
      // Check if user already paid for this room
      const hasPaid = user.paidRooms && user.paidRooms.some(
        paidRoom => paidRoom.roomId.toString() === roomId.toString()
      );

      if (!isParticipant && !hasPaid) {
        // Check if user has enough coins
        if (user.coins < room.entryFee) {
          return res.status(403).json({
            success: false,
            message: `คุณมีเหรียญไม่พอ ต้องการ ${room.entryFee} เหรียญ`,
            requiredCoins: room.entryFee,
            currentCoins: user.coins,
            requiresPayment: true
          });
        }

        // Return payment required status (don't auto-deduct, let frontend handle confirmation)
        return res.status(200).json({
          success: false,
          message: `ห้องนี้ต้องจ่ายค่าเข้าห้อง ${room.entryFee} เหรียญ`,
          requiresPayment: true,
          entryFee: room.entryFee,
          currentCoins: user.coins,
          room: room
        });
      }
    }
    
    if (!isParticipant) {
      // User has already paid or room is free, proceed with joining
      // If it's a paid room and user already paid, they can join
      // If it's a paid room and they haven't paid yet (shouldn't happen), deduct coins
      if (room.isPaidRoom && room.entryFee > 0) {
        const hasPaid = user.paidRooms && user.paidRooms.some(
          paidRoom => paidRoom.roomId.toString() === roomId.toString()
        );
        
        if (!hasPaid) {
          // This shouldn't happen if frontend handled payment correctly, but handle it anyway
          if (user.coins >= room.entryFee) {
            user.coins -= room.entryFee;
            user.paidRooms.push({
              roomId: room._id,
              paidAt: new Date(),
              amount: room.entryFee
            });
            await user.save();
            console.log(`💰 User ${userId} paid ${room.entryFee} coins to join room ${roomId}`);
          }
        }
      }
      
      // Add user as participant
      room.participants.push({
        user: userId,
        role: 'member',
        joinedAt: new Date()
      });
      await room.save();
    }

    res.json({
      success: true,
      message: 'เข้าร่วมห้องแชทสำเร็จ',
      room: room
    });

  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าร่วมห้องแชท'
    });
  }
});

// Confirm payment and join paid room
router.post('/rooms/:roomId/confirm-payment', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: 'ID ห้องแชทไม่ถูกต้อง'
      });
    }

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชท'
      });
    }

    // Check if room is active
    if (!room.isActive) {
      return res.status(403).json({
        success: false,
        message: 'ห้องแชทนี้ถูกปิดใช้งานแล้ว'
      });
    }

    // Check if room requires payment
    if (!room.isPaidRoom || room.entryFee <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ห้องนี้ไม่ต้องจ่ายค่าเข้าห้อง'
      });
    }

    const user = await User.findById(userId);
    
    // Check if user already paid
    const hasPaid = user.paidRooms && user.paidRooms.some(
      paidRoom => paidRoom.roomId.toString() === roomId.toString()
    );

    if (hasPaid) {
      // User already paid, just join the room
      const isParticipant = room.participants.some(p => p.user.toString() === userId.toString());
      if (!isParticipant) {
        room.participants.push({
          user: userId,
          role: 'member',
          joinedAt: new Date()
        });
        await room.save();
      }
      
      return res.json({
        success: true,
        message: 'เข้าร่วมห้องแชทสำเร็จ',
        room: room
      });
    }

    // Check if user has enough coins
    if (user.coins < room.entryFee) {
      return res.status(403).json({
        success: false,
        message: `คุณมีเหรียญไม่พอ ต้องการ ${room.entryFee} เหรียญ`,
        requiredCoins: room.entryFee,
        currentCoins: user.coins
      });
    }

    // Deduct coins
    user.coins -= room.entryFee;
    user.paidRooms.push({
      roomId: room._id,
      paidAt: new Date(),
      amount: room.entryFee
    });
    await user.save();

    console.log(`💰 User ${userId} paid ${room.entryFee} coins to join room ${roomId}`);

    // Add user as participant
    const isParticipant = room.participants.some(p => p.user.toString() === userId.toString());
    if (!isParticipant) {
      room.participants.push({
        user: userId,
        role: 'member',
        joinedAt: new Date()
      });
      await room.save();
    }

    res.json({
      success: true,
      message: `จ่ายค่าเข้าห้อง ${room.entryFee} เหรียญและเข้าร่วมห้องแชทสำเร็จ`,
      room: room,
      coinsRemaining: user.coins
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการยืนยันการจ่ายเงิน'
    });
  }
});

// Helper function to get role level for comparison
const getRoleLevel = (role) => {
  const roleLevels = {
    'user': 1,
    'dj': 2,
    'admin': 3,
    'superadmin': 4
  };
  return roleLevels[role] || 1;
};

// Search users for private chat
router.get('/users/search', async (req, res) => {
  try {
    const { query } = req.query;
    const currentUser = req.user;

    if (!query || !query.trim()) {
      return res.json({
        success: true,
        users: []
      });
    }

    const searchTerm = query.trim();

    // Build search query for firstName, lastName, username, and email
    const searchQuery = {
      $or: [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { username: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ],
      isActive: true,
      isBanned: false,
      _id: { $ne: currentUser._id } // Exclude current user
    };

    // Get current user's role level
    const currentUserRoleLevel = getRoleLevel(currentUser.role);

    // Find users matching search criteria
    const users = await User.find(searchQuery)
      .select('_id username firstName lastName displayName email profileImages role isOnline lastActive')
      .lean();

    // Filter users based on role hierarchy
    // Users can only search accounts at the same level or lower
    const filteredUsers = users.filter(user => {
      const userRoleLevel = getRoleLevel(user.role);
      // Only include users with same or lower role level
      return userRoleLevel <= currentUserRoleLevel;
    });

    // Format response
    const formattedUsers = filteredUsers.map(user => ({
      _id: user._id,
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      email: user.email,
      profileImages: user.profileImages || [],
      role: user.role,
      isOnline: user.isOnline || false,
      lastActive: user.lastActive
    }));

    res.json({
      success: true,
      users: formattedUsers
    });

  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาผู้ใช้'
    });
  }
});

// Create or get direct chat room between two users
router.post('/rooms/direct/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID ผู้ใช้ไม่ถูกต้อง'
      });
    }

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถสร้างห้องแชทกับตัวเองได้'
      });
    }

    // Check if the target user exists
    const targetUser = await User.findById(userId).select('_id username displayName firstName lastName profileImages role isActive isBanned');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้'
      });
    }

    if (!targetUser.isActive || targetUser.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'ไม่สามารถสร้างห้องแชทกับผู้ใช้นี้ได้'
      });
    }

    // Check role level - users can only chat with same or lower level accounts
    const currentUserRoleLevel = getRoleLevel(req.user.role);
    const targetUserRoleLevel = getRoleLevel(targetUser.role);
    
    if (targetUserRoleLevel > currentUserRoleLevel) {
      return res.status(403).json({
        success: false,
        message: 'ไม่สามารถสร้างห้องแชทกับบัญชีระดับสูงกว่าได้'
      });
    }

    // Find or create direct room
    const room = await ChatRoom.findOrCreateDirectRoom(currentUserId, userId);
    
    // Populate participants
    await room.populate('participants.user', 'username displayName firstName lastName profileImages isOnline lastActive');

    res.json({
      success: true,
      room: {
        _id: room._id,
        id: room._id,
        type: room.type,
        participants: room.participants,
        createdAt: room.createdAt,
        lastMessageAt: room.lastMessageAt
      },
      otherUser: {
        _id: targetUser._id,
        id: targetUser._id,
        username: targetUser.username,
        displayName: targetUser.displayName || `${targetUser.firstName} ${targetUser.lastName}`,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        profileImages: targetUser.profileImages || [],
        isOnline: targetUser.isOnline || false,
        lastActive: targetUser.lastActive
      }
    });

  } catch (error) {
    console.error('Error creating/getting direct room:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างห้องแชท'
    });
  }
});

// Get list of user's direct (private) chat rooms
router.get('/rooms/direct', async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get all direct rooms where user is a participant
    const rooms = await ChatRoom.find({
      type: 'direct',
      'participants.user': currentUserId,
      isActive: true,
      isArchived: false
    })
      .populate('participants.user', 'username displayName firstName lastName profileImages role isOnline lastActive')
      .populate('lastMessage', 'content sender createdAt messageType')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    // Format response - get the other user from each room
    const formattedRooms = await Promise.all(rooms.map(async (room) => {
      const otherParticipant = room.participants.find(
        p => p.user._id.toString() !== currentUserId.toString()
      );
      
      if (!otherParticipant || !otherParticipant.user) {
        return null;
      }

      const otherUser = otherParticipant.user;
      
      // Get last message content
      let lastMessageContent = null;
      let hasUnreadMessage = false;
      
      if (room.lastMessage) {
        // Check if last message is from other user (not current user)
        const lastMessageSenderId = room.lastMessage.sender?.toString() || room.lastMessage.sender?._id?.toString();
        const isFromOtherUser = lastMessageSenderId && lastMessageSenderId !== currentUserId.toString();
        
        if (isFromOtherUser) {
          // Check if user has read this message (compare with lastReadAt)
          const userParticipant = room.participants.find(
            p => p.user._id.toString() === currentUserId.toString()
          );
          
          if (userParticipant) {
            const lastReadAt = userParticipant.lastReadAt ? new Date(userParticipant.lastReadAt) : null;
            const messageCreatedAt = room.lastMessage.createdAt ? new Date(room.lastMessage.createdAt) : null;
            
            // If message is newer than last read time, it's unread
            if (!lastReadAt || (messageCreatedAt && messageCreatedAt > lastReadAt)) {
              hasUnreadMessage = true;
            }
          } else {
            // If no lastReadAt, consider it unread
            hasUnreadMessage = true;
          }
        }
        
        // Get message content
        if (room.lastMessage.messageType === 'image' || room.lastMessage.messageType === 'file') {
          lastMessageContent = '📎 ส่งไฟล์';
        } else if (room.lastMessage.content) {
          lastMessageContent = room.lastMessage.content;
        }
      }
      
      return {
        _id: room._id,
        id: room._id,
        roomId: room._id,
        otherUser: {
          _id: otherUser._id,
          id: otherUser._id,
          username: otherUser.username,
          displayName: otherUser.displayName || `${otherUser.firstName} ${otherUser.lastName}`,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          profileImages: otherUser.profileImages || [],
          isOnline: otherUser.isOnline || false,
          lastActive: otherUser.lastActive
        },
        lastMessage: lastMessageContent,
        lastMessageAt: room.lastMessageAt,
        hasUnreadMessage: hasUnreadMessage,
        createdAt: room.createdAt
      };
    }));

    const filteredRooms = formattedRooms.filter(room => room !== null); // Remove null entries

    res.json({
      success: true,
      rooms: filteredRooms
    });

  } catch (error) {
    console.error('Error getting direct rooms:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงรายการห้องแชทส่วนตัว'
    });
  }
});

// Delete a direct chat room
router.delete('/rooms/direct/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: 'ID ห้องแชทไม่ถูกต้อง'
      });
    }

    const room = await ChatRoom.findById(roomId);

    if (!room || room.type !== 'direct') {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชทส่วนตัว'
      });
    }

    const isParticipant = room.participants.some(
      (participant) => participant.user.toString() === currentUserId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์ลบห้องแชทนี้'
      });
    }

    await ChatMessage.deleteMany({ chatRoom: roomId });
    await ChatRoom.deleteOne({ _id: roomId });

    res.json({
      success: true,
      message: 'ลบแชทส่วนตัวสำเร็จ',
      roomId
    });
  } catch (error) {
    console.error('Error deleting direct room:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบห้องแชทส่วนตัว'
    });
  }
});

// Mark messages as read in a room
router.post('/rooms/:roomId/mark-read', async (req, res) => {
  try {
    const { roomId } = req.params;
    const currentUserId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: 'ID ห้องแชทไม่ถูกต้อง'
      });
    }

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบห้องแชท'
      });
    }

    // Check if user is a participant
    const participant = room.participants.find(
      p => p.user.toString() === currentUserId.toString()
    );

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทนี้'
      });
    }

    // Update lastReadAt to current time
    participant.lastReadAt = new Date();
    participant.lastReadMessage = room.lastMessage || null;
    await room.save();

    res.json({
      success: true,
      message: 'ทำเครื่องหมายว่าอ่านแล้ว'
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการทำเครื่องหมายว่าอ่านแล้ว'
    });
  }
});

module.exports = router;

