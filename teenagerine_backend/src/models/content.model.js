const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'product-condition-guidelines',
      'terms-and-conditions',
      'order-policy',
      'privacy-policy',
      'shipping-and-delivery',
      'buyer-faq',
      'seller-faq'
    ]
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Content', contentSchema);