const mongoose = require('mongoose');

const popupModalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  backgroundImage: {
    type: String,
    required: true
  },
  watermarkText: {
    type: String,
    required: true
  },
  buttonText: {
    type: String,
    required: true
  },
  closeButtonImage: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  delay: {
    type: Number,
    default: 500
  },
  followMouse: {
    type: Boolean,
    default: true
  },
  dontShowAgainOption: {
    type: Boolean,
    default: true
  },
  showOnPages: {
    type: [String],
    default: ['home']
  }
}, { timestamps: true });

module.exports = mongoose.model('PopupModal', popupModalSchema);