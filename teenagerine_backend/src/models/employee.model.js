const mongoose = require("mongoose");
const EmployeeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  code1: {
    type: String,
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
  status: {
    type: String,
    default: 'Active'
  },
  postdate: {
    type: String,
    default: Date.now
  },
  posttime: {
    type: String,
    default: new Date().toLocaleTimeString()
  },
  postby: {
    type: String
  },
  updatedate: {
    type: String
  },
  updatetime: {
    type: String
  },
  updateby: {
    type: String
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  }
});
