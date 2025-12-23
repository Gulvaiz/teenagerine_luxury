const mongoose = require('mongoose');

const productRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"]
  },
  description: {
    type: String,
    required: [true, "Product description is required"]
  },
  budget: {
    type: Number,
    required: [true, "Budget is required"]
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'fulfilled'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  contactEmail: {
    type: String,
    required: [true, "Contact email is required"]
  },
  contactPhone: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ProductRequest', productRequestSchema);