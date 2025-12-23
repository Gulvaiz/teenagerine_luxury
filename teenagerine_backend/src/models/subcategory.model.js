const mongoose = require("mongoose");
const SubcategorySchema = new mongoose.Schema({
 code: {
    type: String,
    required: true,
    unique: true
  },
 category: {
    type: String,
    required: true
  },
 name: {
    type: String,
    required: true
  },
 status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
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

module.exports = mongoose.model("Subcategory", SubcategorySchema);
