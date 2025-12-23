const mongoose = require('mongoose');

const footerLinkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const footerColumnSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  links: [footerLinkSchema],
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const socialLinkSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const contactInfoSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['address', 'phone', 'email', 'hours']
  },
  value: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const footerSchema = new mongoose.Schema({
  logo: {
    type: String,
    required: true
  },
  newsletterTitle: {
    type: String,
    required: true
  },
  newsletterDescription: {
    type: String,
    required: true
  },
  newsletterButtonText: {
    type: String,
    required: true
  },
  newsletterEnabled: {
    type: Boolean,
    default: true
  },
  contactInfo: [contactInfoSchema],
  columns: [footerColumnSchema],
  socialLinks: [socialLinkSchema],
  copyrightText: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Footer', footerSchema);