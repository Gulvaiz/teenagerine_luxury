const mongoose = require('mongoose');

const popupProductSelectionSchema = new mongoose.Schema({
  selectedProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    isSelected: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true 
});

// Ensure we only have one configuration document
popupProductSelectionSchema.index({}, { unique: true });

module.exports = mongoose.model('PopupProductSelection', popupProductSelectionSchema);