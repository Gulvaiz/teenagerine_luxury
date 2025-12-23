const mongoose = require("mongoose");

const ContactInquirySchema = new mongoose.Schema({
  contact_inq_code: {
    type: Number,
    required: true
  },
  contact_inq_name: {
    type: String,
    required: true
  },
  contact_inq_email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  contact_inq_phone: {
    type: String,
    required: true
  },
  contact_inq_subject: {
    type: String,
    required: true
  },
  contact_inq_massage: {
    type: String,
    required: true
  },
  contact_inq_post_date: {
    type: String,
    default: Date.now
  },
  contact_inq_post_time: {
    type: String,
    default: new Date().toLocaleTimeString()
  },
  contact_inq_status: {
    type: String,
    enum: ['pending', 'resolved', 'rejected'],
    default: 'pending'
  },
  contact_inq_post_by: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});
