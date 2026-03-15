const mongoose = require('mongoose');

const coinPackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  // ราคา
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'THB'
  },
  // สิ่งที่ได้รับ
  rewards: {
    coins: {
      type: Number,
      required: true,
      min: 0
    },
    votePoints: {
      type: Number,
      default: 0,
      min: 0
    },
    bonusPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  // การตั้งค่า
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isBestValue: {
    type: Boolean,
    default: false
  },
  // ลำดับการแสดงผล
  order: {
    type: Number,
    default: 0
  },
  // สถิติ
  stats: {
    totalPurchases: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index
coinPackageSchema.index({ isActive: 1, order: 1 });
coinPackageSchema.index({ price: 1 });

// Virtual สำหรับคำนวณโบนัส
coinPackageSchema.virtual('bonusCoins').get(function() {
  return Math.floor(this.rewards.coins * (this.rewards.bonusPercentage / 100));
});

coinPackageSchema.virtual('totalCoins').get(function() {
  return this.rewards.coins + this.bonusCoins;
});

module.exports = mongoose.model('CoinPackage', coinPackageSchema);
