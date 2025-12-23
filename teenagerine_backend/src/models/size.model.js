const mongoose = require("mongoose");
const SizeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive']
  },
  post_date: {
    type: String,
    default: () => new Date().toLocaleDateString()
  },
  post_time: {
    type: String,
    default: () => new Date().toLocaleTimeString()
  },
  post_by: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});
