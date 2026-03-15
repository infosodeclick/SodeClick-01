const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Info
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true, // Allow null values
    trim: true
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allow null values
    trim: true
  },
  password: { 
    type: String, 
    required: function() { return !this.phone && !this.googleId; }, // Required only if not phone login and not Google OAuth
    minlength: 6
  },
  
  
  // Phone Verification
  phoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerificationCode: {
    type: String,
    sparse: true
  },
  phoneVerificationExpires: {
    type: Date,
    sparse: true
  },
  
  // Email Verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCode: {
    type: String,
    sparse: true
  },
  emailVerificationExpires: {
    type: Date,
    sparse: true
  },
  emailVerificationAttempts: {
    type: Number,
    default: 0
  },
  emailVerificationReference: {
    type: String,
    sparse: true
  },
  
  // Password Reset
  passwordResetToken: {
    type: String,
    sparse: true
  },
  passwordResetExpires: {
    type: Date,
    sparse: true
  },
  
  // Profile Info
  firstName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 50
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  nickname: {
    type: String,
    trim: true,
    maxlength: 50
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other']
  },
  lookingFor: {
    type: String,
    required: true,
    enum: ['male', 'female', 'both']
  },
  bio: {
    type: String,
    maxlength: 1000
  },
  location: {
    type: String,
    required: true
  },
  // Likes for AI Matching
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Notification clear timestamp
  clearedNotificationsAt: {
    type: Date,
    default: null
  },
  
  // Blur image purchases - รายการผู้ใช้ที่จ่ายเหรียญเพื่อดูรูปเบลอแล้ว
  blurImagePurchases: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // REMOVED: privateChats field - Chat functionality removed
  
  // Extended Profile Information
  occupation: {
    job: { type: String, trim: true, maxlength: 100 },
    company: { type: String, trim: true, maxlength: 100 }
  },
  education: {
    level: {
      type: String,
      enum: ['high_school', 'diploma', 'bachelor', 'master', 'doctorate', 'other'],
      default: null
    },
    institution: { type: String, trim: true, maxlength: 100 }
  },
  physicalAttributes: {
    height: { type: Number, min: 100, max: 250 }, // cm
    weight: { type: Number, min: 30, max: 300 }   // kg
  },
  religion: {
    type: String,
    enum: ['buddhist', 'christian', 'muslim', 'hindu', 'other', 'none'],
    default: null
  },
  languages: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  pets: {
    hasPets: { type: Boolean, default: false },
    petTypes: [{
      type: String,
      enum: ['dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'other']
    }]
  },
  lifestyle: {
    smoking: {
      type: String,
      enum: ['never', 'occasionally', 'regularly', 'trying_to_quit'],
      default: null
    },
    drinking: {
      type: String,
      enum: ['never', 'occasionally', 'socially', 'regularly'],
      default: null
    },
    exercise: {
      type: String,
      enum: ['never', 'rarely', 'sometimes', 'regularly', 'daily'],
      default: null
    },
    diet: {
      type: String,
      enum: ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'other'],
      default: null
    },
    sleepSchedule: {
      type: String,
      enum: ['early_bird', 'night_owl', 'flexible'],
      default: 'flexible'
    },
    travel: {
      type: String,
      enum: ['love_travel', 'occasional_travel', 'prefer_home', 'business_travel'],
      default: 'occasional_travel'
    },
    children: {
      type: String,
      enum: ['have_children', 'want_children', 'dont_want_children', 'open_to_children'],
      default: 'open_to_children'
    }
  },
  interests: [{
    category: {
      type: String,
      enum: ['sports', 'music', 'movies', 'books', 'cooking', 'travel', 'technology', 'art', 'gaming', 'fitness', 'nature', 'photography', 'dancing', 'other']
    },
    items: [{ type: String, maxlength: 50 }]
  }],
  promptAnswers: [{
    question: {
      type: String,
      enum: [
        'my_special_talent',
        'way_to_win_my_heart',
        'dream_destination',
        'last_laugh_until_tears',
        'perfect_first_date',
        'life_motto',
        'favorite_memory',
        'biggest_fear',
        'dream_job',
        'guilty_pleasure'
      ]
    },
    answer: { type: String, maxlength: 200 }
  }],
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  profileImages: [{
    type: mongoose.Schema.Types.Mixed,
    default: []
  }],
  mainProfileImageIndex: {
    type: Number,
    default: 0
  },
  isOnline: { 
    type: Boolean, 
    default: false 
  },
  lastActive: { 
    type: Date, 
    default: Date.now 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  
  // Membership & Coins
  membership: {
    tier: { type: String, required: true, default: 'member' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    autoRenew: { type: Boolean, default: false },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan' }
  },
  coins: { type: Number, default: 0 },
  paymentHistory: [{
    tier: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'THB' },
    paymentMethod: { type: String, default: 'unknown' },
    transactionId: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled', 'expired'],
      default: 'completed'
    },
    purchaseDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed }
  }],
  // ติดตามการจ่ายเหรียญเข้าห้องแชท
  paidRooms: [{
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom'
    },
    paidAt: {
      type: Date,
      default: Date.now
    },
    amount: {
      type: Number,
      required: true
    }
  }],
  votePoints: { type: Number, default: 0 },
  dailyUsage: {
    chatCount: { type: Number, default: 0 },
    imageUploadCount: { type: Number, default: 0 },
    videoUploadCount: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now },
    lastDailyBonusClaim: { type: Date },
    lastSpinWheelTime: { type: Date }
  },
  blurredPhotosViewed: [{
    photoId: { type: String },
    viewedAt: { type: Date, default: Date.now }
  }],
  profileVideoCount: { type: Number, default: 0 },
  isProfileVerified: { type: Boolean, default: false },
  specialProfileFrame: { type: String, default: null },
  pinnedPosts: [{ type: String }],
  blurredPrivatePhotos: [{ type: String }],
  // REMOVED: chatRoomLimit, createdChatRooms - Chat functionality removed
  canHideOnlineStatus: { type: Boolean, default: false },
  canTransferCoins: { type: Boolean, default: false },
  
  // Account Status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isBanned: { 
    type: Boolean, 
    default: false 
  },
  banReason: { 
    type: String 
  },
  banExpiresAt: {
    type: Date
  },
  
  // Admin Role
  role: {
    type: String,
    enum: ['user', 'admin', 'mod', 'support', 'superadmin', 'dj'],
    default: 'user'
  },
  
  // Admin Creation Tracking
  createdByAdmin: {
    type: Boolean,
    default: false,
    index: true
  },
  createdByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },
  createdByAdminAt: {
    type: Date,
    sparse: true
  },
  
  // Login History
  lastLogin: { 
    type: Date, 
    default: Date.now 
  },
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    method: { type: String, enum: ['email', 'phone', 'google'] },
    ip: String,
    userAgent: String
  }],
  
  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    privacy: {
      showOnlineStatus: { type: Boolean, default: true },
      showLastActive: { type: Boolean, default: true }
      // REMOVED: allowMessagesFrom - Chat functionality removed
    },
    discovery: {
      ageRange: {
        min: { type: Number, default: 18 },
        max: { type: Number, default: 100 }
      },
      distance: { type: Number, default: 50 }, // km
      showMe: { type: Boolean, default: true }
    }
  }
}, { 
  timestamps: true 
});

// Indexes (only for fields that don't have unique: true in schema)
userSchema.index({ coordinates: '2dsphere' });
userSchema.index({ isOnline: 1, lastActive: 1 });
userSchema.index({ gender: 1, lookingFor: 1, isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Only hash if password is not already hashed (doesn't start with $2b$)
    if (!this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Validate membership tier - more robust version
userSchema.pre('save', function(next) {
  const validTiers = ['member', 'silver', 'gold', 'vip', 'vip1', 'vip2', 'diamond', 'platinum'];
  
  // Initialize membership if it doesn't exist
  if (!this.membership) {
    this.membership = { tier: 'member' };
  }
  
  // Set default tier if not provided
  if (!this.membership.tier) {
    this.membership.tier = 'member';
  }
  
  // Validate tier
  if (!validTiers.includes(this.membership.tier)) {
    console.warn(`Invalid membership tier found: ${this.membership.tier}. Setting to 'member'`);
    this.membership.tier = 'member';
  }
  
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update last active
userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  this.isOnline = true;
  return this.save();
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.phoneVerificationCode;
  delete userObject.phoneVerificationExpires;
        delete userObject.emailVerificationCode;
        delete userObject.emailVerificationExpires;
        delete userObject.emailVerificationReference;
  delete userObject.loginHistory;
  return userObject;
};

// Method to reset daily usage if it's a new day
userSchema.methods.resetDailyUsage = function() {
  const now = new Date();
  
  // Initialize dailyUsage if it doesn't exist
  if (!this.dailyUsage) {
    this.dailyUsage = {
      chatCount: 0,
      imageUploadCount: 0,
      videoUploadCount: 0,
      lastReset: now
    };
    return;
  }
  
  const lastReset = this.dailyUsage.lastReset;
  
  if (!lastReset || this.isNewDay(lastReset, now)) {
    this.dailyUsage.chatCount = 0;
    this.dailyUsage.imageUploadCount = 0;
    this.dailyUsage.videoUploadCount = 0;
    this.dailyUsage.lastReset = now;
  }
};

// Helper method to check if it's a new day
userSchema.methods.isNewDay = function(lastDate, currentDate) {
  const last = new Date(lastDate);
  const current = new Date(currentDate);
  return last.getDate() !== current.getDate() || 
         last.getMonth() !== current.getMonth() || 
         last.getFullYear() !== current.getFullYear();
};

// Method to check if user is SuperAdmin
userSchema.methods.isSuperAdmin = function() {
  return this.role === 'superadmin';
};

// Method to check if user is Admin or SuperAdmin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin' || this.role === 'superadmin';
};

// Method to check if user is DJ
userSchema.methods.isDJ = function() {
  return this.role === 'dj';
};

// Method to check if user can access DJ mode (DJ, Admin, or SuperAdmin)
userSchema.methods.canAccessDJMode = function() {
  return this.role === 'dj' || this.role === 'admin' || this.role === 'superadmin';
};

// Method to get membership limits based on tier
userSchema.methods.getMembershipLimits = function() {
  // SuperAdmin มีสิทธิ์ไม่จำกัดทุกอย่าง
  if (this.role === 'superadmin') {
    return {
      dailyChats: -1, // ไม่จำกัด
      dailyImages: -1, // ไม่จำกัด
      dailyVideos: -1, // ไม่จำกัด
      dailyBonus: -1, // ไม่จำกัด
      spinInterval: 0, // ไม่ต้องรอ
      canTransferCoins: true,
      canHideOnlineStatus: true,
      chatRoomLimit: -1, // ไม่จำกัด
      canUploadImages: true,
      canUploadVideos: true,
      canCreatePublicRooms: true,
      canCreatePrivateRooms: true,
      canDeleteMessages: true,
      canBanUsers: true,
      canModifyTiers: true,
      isImmuneToBan: true,
      isImmuneToTierChange: true
    };
  }

  // ตรวจสอบการหมดอายุก่อน
  if (this.membership.tier !== 'member' && this.membership.endDate) {
    const now = new Date();
    if (now >= this.membership.endDate) {
      console.log(`🔄 ตรวจพบสมาชิก ${this._id} หมดอายุแล้ว (${this.membership.tier})`);
      
      // ถ้าหมดอายุแล้ว ให้ใช้สิทธิ์ของ member
      this.membership.tier = 'member';
      this.membership.endDate = null;
      this.membership.startDate = new Date();
      this.membership.planId = null;
      
      // รีเซ็ตการใช้งานรายวัน
      this.dailyUsage = {
        chatCount: 0,
        imageUploadCount: 0,
        videoUploadCount: 0,
        lastReset: new Date(),
        lastDailyBonusClaim: null,
        lastSpinWheelTime: null
      };
      
      // Save ข้อมูลทันที
      this.save().catch(err => console.error('Error saving expired membership:', err));
    }
  }

  const limits = {
    member: {
      dailyChats: 10,
      dailyImages: 3,
      dailyVideos: 1,
      dailyBonus: 500,
      spinInterval: 24 * 60 * 60 * 1000, // 24 hours
      canTransferCoins: false,
      canHideOnlineStatus: false,
      chatRoomLimit: 0,
      canCreatePrivateRooms: false,
      privateRoomMemberLimit: 0
    },
    silver: {
      dailyChats: 30,
      dailyImages: 30,
      dailyVideos: 10,
      dailyBonus: 1000,
      spinInterval: 2 * 60 * 60 * 1000, // 2 hours
      canTransferCoins: false,
      canHideOnlineStatus: false,
      chatRoomLimit: 0,
      canCreatePrivateRooms: false,
      privateRoomMemberLimit: 0
    },
    gold: {
      dailyChats: 60,
      dailyImages: 50,
      dailyVideos: 25,
      dailyBonus: 3000,
      spinInterval: 90 * 60 * 1000, // 90 minutes
      canTransferCoins: false,
      canHideOnlineStatus: false,
      chatRoomLimit: 0,
      canCreatePrivateRooms: false,
      privateRoomMemberLimit: 0
    },
    vip: {
      dailyChats: 120,
      dailyImages: 100,
      dailyVideos: 50,
      dailyBonus: 8000,
      spinInterval: 60 * 60 * 1000, // 1 hour
      canTransferCoins: false,
      canHideOnlineStatus: false,
      chatRoomLimit: 10,
      canCreatePrivateRooms: false,
      privateRoomMemberLimit: 0
    },
    vip1: {
      dailyChats: 180,
      dailyImages: 150,
      dailyVideos: 75,
      dailyBonus: 15000,
      spinInterval: 45 * 60 * 1000, // 45 minutes
      canTransferCoins: false,
      canHideOnlineStatus: true,
      chatRoomLimit: 20,
      canCreatePrivateRooms: true,
      privateRoomMemberLimit: 50
    },
    vip2: {
      dailyChats: 300,
      dailyImages: -1, // unlimited
      dailyVideos: -1, // unlimited
      dailyBonus: 30000,
      spinInterval: 30 * 60 * 1000, // 30 minutes
      canTransferCoins: false,
      canHideOnlineStatus: true,
      chatRoomLimit: 30,
      canCreatePrivateRooms: true,
      privateRoomMemberLimit: 100
    },
    diamond: {
      dailyChats: 500,
      dailyImages: -1, // unlimited
      dailyVideos: -1, // unlimited
      dailyBonus: 50000,
      spinInterval: 20 * 60 * 1000, // 20 minutes
      canTransferCoins: true,
      canHideOnlineStatus: true,
      chatRoomLimit: -1, // unlimited
      canCreatePrivateRooms: true,
      privateRoomMemberLimit: -1 // unlimited
    },
    platinum: {
      dailyChats: -1, // unlimited
      dailyImages: -1, // unlimited
      dailyVideos: -1, // unlimited
      dailyBonus: 100000,
      spinInterval: 10 * 60 * 1000, // 10 minutes
      canTransferCoins: true,
      canHideOnlineStatus: true,
      chatRoomLimit: -1, // unlimited
      canCreatePrivateRooms: true,
      privateRoomMemberLimit: -1 // unlimited
    }
  };
  
  return limits[this.membership.tier] || limits.member;
};

// Virtual to check if membership is active
userSchema.virtual('isMembershipActive').get(function() {
  if (this.membership.tier === 'member') return true;
  if (!this.membership.endDate) return false;
  return new Date() < this.membership.endDate;
});

// Method to check and handle membership expiration
userSchema.methods.checkAndHandleExpiration = async function() {
  if (this.membership.tier === 'member') return false;
  if (!this.membership.endDate) return false;
  
  const now = new Date();
  const isExpired = now >= this.membership.endDate;
  
  if (isExpired) {
    console.log(`🔄 เปลี่ยนสมาชิก ${this._id} จาก ${this.membership.tier} เป็น member (หมดอายุแล้ว)`);
    
    // เปลี่ยนเป็น member ธรรมดา
    this.membership.tier = 'member';
    this.membership.endDate = null;
    this.membership.startDate = new Date();
    this.membership.planId = null;
    
    // รีเซ็ตการใช้งานรายวัน
    this.dailyUsage = {
      chatCount: 0,
      imageUploadCount: 0,
      videoUploadCount: 0,
      lastReset: new Date(),
      lastDailyBonusClaim: null,
      lastSpinWheelTime: null
    };
    
    await this.save();
    console.log(`✅ เปลี่ยนสมาชิก ${this._id} เป็น member สำเร็จ`);
    return true; // หมดอายุแล้ว
  }
  
  return false; // ยังไม่หมดอายุ
};

// Method to check if user can perform an action
userSchema.methods.canPerformAction = function(action) {
  const limits = this.getMembershipLimits();
  
  switch (action) {
    case 'chat':
      return limits.dailyChats === -1 || this.dailyUsage.chatCount < limits.dailyChats;
    case 'uploadImage':
      return limits.dailyImages === -1 || this.dailyUsage.imageUploadCount < limits.dailyImages;
    case 'uploadVideo':
      return limits.dailyVideos === -1 || this.dailyUsage.videoUploadCount < limits.dailyVideos;
    case 'spinWheel':
      if (!this.dailyUsage.lastSpinWheelTime) return true;
      // ถ้า spinInterval เป็น 0 หรือ -1 แสดงว่าไม่จำกัดเวลา
      if (limits.spinInterval <= 0) return true;
      const timeSinceLastSpin = Date.now() - this.dailyUsage.lastSpinWheelTime.getTime();
      return timeSinceLastSpin >= limits.spinInterval;
    case 'dailyBonus':
      if (!this.dailyUsage.lastDailyBonusClaim) return true;
      const timeSinceLastBonus = Date.now() - this.dailyUsage.lastDailyBonusClaim.getTime();
      return timeSinceLastBonus >= (24 * 60 * 60 * 1000); // 24 hours
    default:
      return false;
  }
};

// Method to check if daily bonus is available
userSchema.methods.canClaimDailyBonus = function() {
  return this.canPerformAction('dailyBonus');
};

// Method to check if spin wheel is available
userSchema.methods.canSpinWheel = function() {
  return this.canPerformAction('spinWheel');
};

// Method to check if user has paid for a room
userSchema.methods.hasPaidForRoom = function(roomId) {
  console.log('🔍 hasPaidForRoom check:', {
    roomId: roomId.toString(),
    paidRooms: this.paidRooms.map(p => ({
      roomId: p.roomId?.toString(),
      amount: p.amount,
      paidAt: p.paidAt
    }))
  });
  
  const result = this.paidRooms.some(payment => 
    payment.roomId && payment.roomId.toString() === roomId.toString()
  );
  
  console.log('🔍 hasPaidForRoom result:', result);
  return result;
};

// Method to add payment record for a room
userSchema.methods.addRoomPayment = function(roomId, amount) {
  console.log('💰 Adding room payment:', {
    roomId: roomId.toString(),
    amount,
    currentPaidRooms: this.paidRooms.length
  });
  
  // เช็คว่ายังไม่มีการจ่ายห้องนี้อยู่แล้ว (ป้องกันการบันทึกซ้ำ)
  const alreadyPaid = this.paidRooms.some(payment => 
    payment.roomId && payment.roomId.toString() === roomId.toString()
  );
  
  if (!alreadyPaid) {
    this.paidRooms.push({
      roomId: roomId,
      amount: amount,
      paidAt: new Date()
    });
    console.log('💰 Room payment added. New paidRooms count:', this.paidRooms.length);
  } else {
    console.log('⚠️ Payment already exists for this room, skipping...');
  }
  
  // ไม่ save ที่นี่ ให้ caller save เอง เพื่อหลีกเลี่ยง race condition
};

// Method to get time until next daily bonus
userSchema.methods.getTimeUntilNextDailyBonus = function() {
  if (!this.dailyUsage.lastDailyBonusClaim) return 0;
  const timeSinceLastBonus = Date.now() - this.dailyUsage.lastDailyBonusClaim.getTime();
  const timeRemaining = (24 * 60 * 60 * 1000) - timeSinceLastBonus;
  return Math.max(0, timeRemaining);
};

// Method to get time until next spin wheel
userSchema.methods.getTimeUntilNextSpinWheel = function() {
  if (!this.dailyUsage.lastSpinWheelTime) return 0;
  const limits = this.getMembershipLimits();
  // ถ้า spinInterval เป็น 0 หรือ -1 แสดงว่าไม่จำกัดเวลา
  if (limits.spinInterval <= 0) return 0;
  const timeSinceLastSpin = Date.now() - this.dailyUsage.lastSpinWheelTime.getTime();
  const timeRemaining = limits.spinInterval - timeSinceLastSpin;
  return Math.max(0, timeRemaining);
};

// Virtual for backward compatibility
userSchema.virtual('membershipTier').get(function() {
  return this.membership?.tier || 'member';
});

userSchema.virtual('membershipTier').set(function(value) {
  if (!this.membership) {
    this.membership = {};
  }
  this.membership.tier = value;
});

// Ensure virtuals are included when converting to JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
