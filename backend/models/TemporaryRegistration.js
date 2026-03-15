const mongoose = require('mongoose');

const temporaryRegistrationSchema = new mongoose.Schema({
  // Registration Data
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
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
  location: {
    type: String,
    required: true
  },
  
  // OTP Verification
  verificationCode: {
    type: String,
    required: true
  },
  referenceCode: {
    type: String,
    required: true,
    unique: true
  },
  verificationExpires: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired documents
  },
  verificationAttempts: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1800 // Auto-delete after 30 minutes (1800 seconds)
  }
}, {
  timestamps: true
});

// Index for faster lookups
temporaryRegistrationSchema.index({ email: 1 });
temporaryRegistrationSchema.index({ referenceCode: 1 });
temporaryRegistrationSchema.index({ verificationExpires: 1 });

// Method to check if expired
temporaryRegistrationSchema.methods.isExpired = function() {
  return new Date() > this.verificationExpires;
};

// Method to check if max attempts reached
temporaryRegistrationSchema.methods.hasMaxAttempts = function() {
  return this.verificationAttempts >= 5;
};

const TemporaryRegistration = mongoose.model('TemporaryRegistration', temporaryRegistrationSchema);

module.exports = TemporaryRegistration;

