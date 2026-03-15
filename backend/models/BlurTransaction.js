const mongoose = require('mongoose');

const blurTransactionSchema = new mongoose.Schema({
  // ผู้จ่ายเงิน
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // เจ้าของรูป
  imageOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // รูปที่ซื้อ
  imageId: {
    type: String,
    required: true // ID ของรูปใน User.profileImages
  },
  imageUrl: {
    type: String,
    required: true
  },
  // ราคา
  cost: {
    type: Number,
    default: 10000, // 10,000 เหรียญ
    min: 0
  },
  // การแบ่งเงิน
  ownerShare: {
    type: Number,
    default: 5000, // เจ้าของรูปได้ 5,000 เหรียญ
    min: 0
  },
  systemShare: {
    type: Number,
    default: 5000, // ระบบได้ 5,000 เหรียญ
    min: 0
  },
  // สถานะ
  status: {
    type: String,
    enum: ['completed', 'failed', 'refunded'],
    default: 'completed'
  },
  // เวลา
  purchasedAt: {
    type: Date,
    default: Date.now
  },
  // ข้อมูลเพิ่มเติม
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceInfo: String
  }
}, {
  timestamps: true
});

// Index
blurTransactionSchema.index({ buyer: 1 });
blurTransactionSchema.index({ imageOwner: 1 });
blurTransactionSchema.index({ buyer: 1, imageOwner: 1, imageId: 1 }, { unique: true }); // ป้องกันซื้อซ้ำ
blurTransactionSchema.index({ purchasedAt: -1 });

module.exports = mongoose.model('BlurTransaction', blurTransactionSchema);
