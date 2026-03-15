const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema({
  tier: {
    type: String,
    required: true,
    unique: true,
    enum: ['member', 'silver', 'gold', 'vip', 'vip1', 'vip2', 'diamond', 'platinum']
  },
  name: {
    type: String,
    required: true
  },
  price: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'THB'
    }
  },
  duration: {
    days: {
      type: Number,
      required: true,
      min: 1
    },
    description: String // เช่น "7 วัน", "15 วัน", "1 เดือน"
  },
  features: {
    dailyChats: {
      type: Number,
      default: 10
    },
    dailyImages: {
      type: Number,
      default: 3
    },
    dailyVideos: {
      type: Number,
      default: 1
    },
    spinInterval: {
      minutes: {
        type: Number,
        default: 1440 // 24 ชั่วโมง
      },
      description: String
    },
    dailyBonus: {
      type: Number,
      default: 500
    },
    votePoints: {
      type: Number,
      default: 0
    },
    profileVideos: {
      type: Number,
      default: 0
    },
    pinnedPosts: {
      type: Number,
      default: 0
    },
    blurredImages: {
      type: Number,
      default: 0
    },
    chatRooms: {
      type: Number,
      default: 0
    },
    specialFeatures: [{
      name: String,
      description: String,
      enabled: {
        type: Boolean,
        default: false
      }
    }],
    bonusCoins: {
      type: Number,
      default: 0
    }
  },
  badge: {
    color: String,
    icon: String,
    gradient: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index
membershipPlanSchema.index({ order: 1 });
membershipPlanSchema.index({ isActive: 1 });

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);
