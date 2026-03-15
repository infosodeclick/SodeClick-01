const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  // Payment Settings
  paymentBypass: {
    enabled: {
      type: Boolean,
      default: false
    },
    enabledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enabledAt: {
      type: Date
    },
    reason: {
      type: String,
      default: ''
    }
  },

  // Maintenance Settings
  maintenance: {
    enabled: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: 'ระบบกำลังอยู่ในระหว่างการปรับปรุง'
    },
    estimatedTime: {
      type: String,
      default: ''
    },
    enabledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enabledAt: {
      type: Date
    }
  },

  // General Settings
  siteName: {
    type: String,
    default: 'SodeClick'
  },
  siteDescription: {
    type: String,
    default: 'ระบบหาคู่และแชท'
  },

  // API Settings
  rabbitGateway: {
    enabled: {
      type: Boolean,
      default: true
    },
    apiKey: {
      type: String,
      default: ''
    },
    secretKey: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true,
  collection: 'system_settings'
});

// Static method to get settings (create if not exists)
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({});

  if (!settings) {
    settings = await this.create({});
  }

  return settings;
};

// Static method to update payment bypass settings
systemSettingsSchema.statics.updatePaymentBypass = async function(enabled, userId, reason = '') {
  const settings = await this.getSettings();

  settings.paymentBypass = {
    enabled,
    enabledBy: userId,
    enabledAt: new Date(),
    reason
  };

  return await settings.save();
};

// Static method to update maintenance settings
systemSettingsSchema.statics.updateMaintenance = async function(enabled, message = '', estimatedTime = '', userId) {
  const settings = await this.getSettings();

  settings.maintenance = {
    enabled,
    message,
    estimatedTime,
    enabledBy: userId,
    enabledAt: new Date()
  };

  return await settings.save();
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
