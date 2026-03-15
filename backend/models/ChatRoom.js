const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  // Room name (for group chats)
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  
  // Room description
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Room type
  type: {
    type: String,
    enum: ['direct', 'group', 'channel'],
    default: 'direct',
    required: true
  },
  
  // Room participants
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['member', 'admin', 'moderator'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage'
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isMuted: {
      type: Boolean,
      default: false
    },
    isBlocked: {
      type: Boolean,
      default: false
    }
  }],
  
  // Room creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Room settings
  settings: {
    allowInvites: {
      type: Boolean,
      default: true
    },
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    allowVoiceMessages: {
      type: Boolean,
      default: true
    },
    allowReactions: {
      type: Boolean,
      default: true
    },
    allowEditing: {
      type: Boolean,
      default: true
    },
    allowDeleting: {
      type: Boolean,
      default: true
    },
    messageRetentionDays: {
      type: Number,
      default: 30 // Keep messages for 30 days
    },
    maxParticipants: {
      type: Number,
      default: 100
    }
  },
  
  // Room avatar/image
  avatar: {
    type: String, // URL to avatar image
    default: null
  },
  
  // Paid room settings
  isPaidRoom: {
    type: Boolean,
    default: false
  },
  entryFee: {
    type: Number,
    default: 0 // coins required to join
  },
  
  // Room owner/creator
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Last message in the room
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  
  // Room status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isArchived: {
    type: Boolean,
    default: false
  },
  
  archivedAt: {
    type: Date
  },
  
  // Room tags (for categorization)
  tags: [{
    type: String,
    trim: true
  }],
  
  // Room metadata
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
chatRoomSchema.index({ type: 1, isActive: 1 });
chatRoomSchema.index({ 'participants.user': 1 });
chatRoomSchema.index({ createdBy: 1 });
chatRoomSchema.index({ lastMessageAt: -1 });
chatRoomSchema.index({ isArchived: 1 });

// Virtual for participant count
chatRoomSchema.virtual('participantCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Virtual for unread message count (per user)
chatRoomSchema.virtual('unreadCount').get(function() {
  // This would need to be calculated based on user's lastReadMessage
  return 0;
});

// Pre-save middleware
chatRoomSchema.pre('save', function(next) {
  // Set archivedAt when room is archived
  if (this.isModified('isArchived') && this.isArchived) {
    this.archivedAt = new Date();
  }
  
  // Ensure at least one participant
  if (this.participants.length === 0) {
    return next(new Error('Room must have at least one participant'));
  }
  
  next();
});

// Static method to find or create direct message room
chatRoomSchema.statics.findOrCreateDirectRoom = function(user1Id, user2Id) {
  return this.findOne({
    type: 'direct',
    'participants.user': { $all: [user1Id, user2Id] },
    isActive: true
  })
  .populate('participants.user', 'username firstName lastName profileImage')
  .populate('lastMessage')
  .then(room => {
    if (room) {
      return room;
    }
    
    // Create new direct message room
    return this.create({
      type: 'direct',
      participants: [
        { user: user1Id, role: 'member' },
        { user: user2Id, role: 'member' }
      ],
      createdBy: user1Id
    });
  });
};

// Static method to get user's rooms
chatRoomSchema.statics.getUserRooms = function(userId, limit = 50, skip = 0) {
  return this.find({
    'participants.user': userId,
    isActive: true,
    isArchived: false
  })
  .populate('participants.user', 'username firstName lastName profileImage')
  .populate('lastMessage')
  .populate('createdBy', 'username firstName lastName')
  .sort({ lastMessageAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to search rooms
chatRoomSchema.statics.searchRooms = function(query, userId, limit = 20) {
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    $or: [
      { name: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } }
    ],
    'participants.user': userId,
    isActive: true,
    isArchived: false
  })
  .populate('participants.user', 'username firstName lastName profileImage')
  .populate('lastMessage')
  .sort({ lastMessageAt: -1 })
  .limit(limit);
};

// Instance method to add participant
chatRoomSchema.methods.addParticipant = function(userId, role = 'member') {
  const existingParticipant = this.participants.find(p => 
    p.user.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    if (!existingParticipant.isActive) {
      existingParticipant.isActive = true;
      existingParticipant.joinedAt = new Date();
    }
    return this.save();
  }
  
  this.participants.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Instance method to remove participant
chatRoomSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString()
  );
  
  if (participant) {
    participant.isActive = false;
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Instance method to update participant role
chatRoomSchema.methods.updateParticipantRole = function(userId, newRole) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString()
  );
  
  if (participant) {
    participant.role = newRole;
    return this.save();
  }
  
  return Promise.reject(new Error('Participant not found'));
};

// Instance method to mute/unmute participant
chatRoomSchema.methods.toggleMute = function(userId) {
  const participant = this.participants.find(p => 
    p.user.toString() === userId.toString()
  );
  
  if (participant) {
    participant.isMuted = !participant.isMuted;
    return this.save();
  }
  
  return Promise.reject(new Error('Participant not found'));
};

// Instance method to update last message
chatRoomSchema.methods.updateLastMessage = function(messageId) {
  this.lastMessage = messageId;
  this.lastMessageAt = new Date();
  return this.save();
};

module.exports = mongoose.model('ChatRoom', chatRoomSchema);

