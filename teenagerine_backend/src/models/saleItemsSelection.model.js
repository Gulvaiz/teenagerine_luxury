const mongoose = require('mongoose');

const saleItemsSelectionSchema = new mongoose.Schema({
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
saleItemsSelectionSchema.index({}, { unique: true });

module.exports = mongoose.model('SaleItemsSelection', saleItemsSelectionSchema);