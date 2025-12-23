const mongoose = require("mongoose");

const ProductSizeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  product: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive']
  },
  post_date: {
    type: String,
    required: true
  },
  post_time: {
    type: String,
    required: true
  },
  post_by: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});
