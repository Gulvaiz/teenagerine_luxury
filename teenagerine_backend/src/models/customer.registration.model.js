const mongoose = require("mongoose");
const CustomerRegistrationSchema = new mongoose.Schema({
  code: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'active'
  },
  post_date: {
    type: String
  },
  post_time: {
    type: String
  }
}, {
  timestamps: true
});
