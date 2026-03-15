const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  icon: {
    type: String,
    required: true // emoji หรือ URL รูปภาพ
  },
  animation: {
    type: String, // URL animation หรือ CSS class
    default: null
  },
  // ราคา
  price: {
    coins: {
      type: Number,
      default: 0,
      min: 0
    },
    money: {
      type: Number,
      default: 0,
      min: 0
    },
    votePoints: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  // คุณค่าของขวัญ (สำหรับคำนวณความฮอต)
  value: {
    type: Number,
    required: true,
    min: 0
  },
  // หมวดหมู่
  category: {
    type: String,
    enum: ['flower', 'jewelry', 'food', 'drink', 'luxury', 'special', 'seasonal'],
    default: 'flower'
  },
  // ระดับความหายาก
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  // การตั้งค่า
  isActive: {
    type: Boolean,
    default: true
  },
  isLimited: {
    type: Boolean,
    default: false
  },
  limitedQuantity: {
    type: Number,
    default: null
  },
  // เวลา
  availableFrom: {
    type: Date,
    default: Date.now
  },
  availableUntil: {
    type: Date,
    default: null
  },
  // สถิติ
  stats: {
    totalSent: {
      type: Number,
      default: 0
    },
    totalValue: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index
giftSchema.index({ category: 1 });
giftSchema.index({ rarity: 1 });
giftSchema.index({ isActive: 1 });
giftSchema.index({ 'price.coins': 1 });
giftSchema.index({ value: -1 });

module.exports = mongoose.model('Gift', giftSchema);
