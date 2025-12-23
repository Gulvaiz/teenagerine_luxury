const mongoose = require("mongoose");

const vendorContractSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  vendor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vendor',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  days: {
    type: Number,
    required: true
  },
  mail_shoot_date: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
  post_by: {
    type: String
  },
  post_date: {
    type: String
  },
  post_time: {
    type: String
  },
  email: {
    type: String,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  email_post_date: {
    type: String
  },
  email_post_time: {
    type: String
  },
  submit: {
    type: String
  },
  submit_post_date: {
    type: String
  },
  submit_post_time: {
    type: String
  },
  submit_post_by: {
    type: String
  }
}, {
  timestamps: true
});
