const mongoose = require("mongoose");

const cookiePreferencesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Allow for guest users
  },
  sessionId: {
    type: String,
    required: false, // For guests who haven't signed up
  },
  preferences: {
    necessary: {
      type: Boolean,
      default: true, // Always true as these are required
      required: true
    },
    analytics: {
      type: Boolean,
      default: false
    },
    marketing: {
      type: Boolean,
      default: false
    },
    personalization: {
      type: Boolean,
      default: false
    },
    functionality: {
      type: Boolean,
      default: false
    }
  },
  consentGiven: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  collection: 'cookiepreferences'
});

// Index for faster lookups
cookiePreferencesSchema.index({ user: 1 });
cookiePreferencesSchema.index({ sessionId: 1 });

// Method to update preferences
cookiePreferencesSchema.methods.updatePreferences = function(newPreferences) {
  this.preferences = { ...this.preferences, ...newPreferences };
  this.consentGiven = true;
  this.lastUpdated = new Date();
  return this.save();
};

// Static method to find or create preferences
cookiePreferencesSchema.statics.findOrCreate = async function(identifier) {
  const query = identifier.userId 
    ? { user: identifier.userId }
    : { sessionId: identifier.sessionId };
    
  let preferences = await this.findOne(query);
  
  if (!preferences) {
    preferences = new this({
      user: identifier.userId || undefined,
      sessionId: identifier.sessionId || undefined,
      preferences: {
        necessary: true,
        analytics: false,
        marketing: false,
        personalization: false,
        functionality: false
      },
      consentGiven: false
    });
    await preferences.save();
  }
  
  return preferences;
};

module.exports = mongoose.model("CookiePreferences", cookiePreferencesSchema);