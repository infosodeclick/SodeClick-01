const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  // Message content
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  
  // Message type (text, image, video, file, etc.)
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'audio', 'location', 'sticker'],
    default: 'text'
  },
  
  // File information (for non-text messages)
  fileInfo: {
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    mimeType: String,
    thumbnailUrl: String // For images/videos
  },
  
  // Sender information
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Recipient information (for direct messages)
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Chat room (for group messages) - can be ObjectId or String (for public/community)
  chatRoom: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'ChatRoom'
  },
  
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  // Read status for each user
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reply to another message
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  
  // Message reactions
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message is edited
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editedAt: {
    type: Date
  },
  
  // Message is deleted
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: {
    type: Date
  },
  
  // Deleted by (admin or user)
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Message metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
chatMessageSchema.index({ sender: 1, createdAt: -1 });
chatMessageSchema.index({ recipient: 1, createdAt: -1 });
chatMessageSchema.index({ chatRoom: 1, createdAt: -1 });
chatMessageSchema.index({ status: 1 });
chatMessageSchema.index({ isDeleted: 1 });

// Virtual for message age
chatMessageSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for formatted content (handles deleted messages)
chatMessageSchema.virtual('displayContent').get(function() {
  if (this.isDeleted) {
    // Check if deleted by admin (deletedBy field exists)
    if (this.deletedBy) {
      return 'ถูกลบโดยผู้ดูแลระบบ';
    }
    return 'ข้อความนี้ถูกลบแล้ว';
  }
  return this.content;
});

// Pre-save middleware
chatMessageSchema.pre('save', function(next) {
  // Set editedAt when content is modified
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  
  // Set deletedAt when message is deleted
  if (this.isModified('isDeleted') && this.isDeleted) {
    this.deletedAt = new Date();
  }
  
  next();
});

// Static method to get messages between two users
chatMessageSchema.statics.getMessagesBetweenUsers = function(user1Id, user2Id, limit = 50, skip = 0) {
  return this.find({
    $or: [
      { sender: user1Id, recipient: user2Id },
      { sender: user2Id, recipient: user1Id }
    ],
    isDeleted: false
  })
  .populate('sender', 'username firstName lastName profileImage')
  .populate('recipient', 'username firstName lastName profileImage')
  .populate('replyTo')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to get messages in a chat room
chatMessageSchema.statics.getMessagesInRoom = function(roomId, limit = 50, skip = 0) {
  return this.find({
    chatRoom: roomId,
    isDeleted: false
  })
  .populate('sender', 'username firstName lastName profileImage')
  .populate('replyTo')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Instance method to mark as read by user
chatMessageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(read => read.user.toString() === userId.toString());
  
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    
    // Update status to read if all recipients have read
    if (this.recipient && this.readBy.length >= 1) {
      this.status = 'read';
    }
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Instance method to add reaction
chatMessageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(reaction => 
    reaction.user.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji,
    createdAt: new Date()
  });
  
  return this.save();
};

// Instance method to remove reaction
chatMessageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(reaction => 
    reaction.user.toString() !== userId.toString()
  );
  
  return this.save();
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

