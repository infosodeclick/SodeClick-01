const mongoose = require('mongoose');

const voteTransactionSchema = new mongoose.Schema({
  // ผู้โหวต
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // ผู้ได้รับโหวต
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // จำนวนคะแนนที่ใช้
  votePoints: {
    type: Number,
    required: true,
    min: 1
  },
  // ประเภทการโหวต
  voteType: {
    type: String,
    enum: ['popularity_male', 'popularity_female', 'popularity_combined', 'gift_ranking'],
    required: true
  },
  // บริบท
  context: {
    type: {
      type: String,
      enum: ['profile', 'ranking', 'competition'],
      default: 'profile'
    },
    contextId: {
      type: String,
      default: null
    }
  },
  // ข้อความ (ถ้ามี)
  message: {
    type: String,
    maxlength: 200,
    trim: true
  },
  // สถานะ
  status: {
    type: String,
    enum: ['active', 'expired', 'refunded'],
    default: 'active'
  },
  // เวลา
  votedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null // null = ไม่หมดอายุ
  }
}, {
  timestamps: true
});

// Index
voteTransactionSchema.index({ voter: 1 });
voteTransactionSchema.index({ candidate: 1 });
voteTransactionSchema.index({ voteType: 1 });
voteTransactionSchema.index({ candidate: 1, voteType: 1 });
voteTransactionSchema.index({ votedAt: -1 });
voteTransactionSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('VoteTransaction', voteTransactionSchema);
