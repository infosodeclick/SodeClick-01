const mongoose = require('mongoose');

const giftTransactionSchema = new mongoose.Schema({
  // ผู้ส่ง
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // ผู้รับ
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // ของขวัญ
  gift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gift',
    required: true
  },
  // จำนวน
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  // ราคารวม
  totalCost: {
    coins: {
      type: Number,
      default: 0
    },
    money: {
      type: Number,
      default: 0
    },
    votePoints: {
      type: Number,
      default: 0
    }
  },
  // คุณค่ารวม (สำหรับคำนวณความฮอต)
  totalValue: {
    type: Number,
    required: true
  },
  // ข้อความแนบ
  message: {
    type: String,
    maxlength: 200,
    trim: true
  },
  // บริบท (ส่งที่ไหน)
  context: {
    type: {
      type: String,
      enum: ['profile', 'chatroom', 'message'],
      required: true
    },
    contextId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false // อาจเป็น ChatRoom ID หรือ Message ID
    }
  },
  // สถานะ
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  // เวลา
  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index
giftTransactionSchema.index({ sender: 1 });
giftTransactionSchema.index({ receiver: 1 });
giftTransactionSchema.index({ gift: 1 });
giftTransactionSchema.index({ sentAt: -1 });
giftTransactionSchema.index({ 'context.type': 1, 'context.contextId': 1 });
giftTransactionSchema.index({ receiver: 1, sentAt: -1 }); // สำหรับดูของขวัญที่ได้รับ

module.exports = mongoose.model('GiftTransaction', giftTransactionSchema);
