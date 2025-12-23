const mongoose = require("mongoose");
const MenuSchema = new mongoose.Schema({
  code: {
    type: Number,
  },
  name: {
    type: String,
    required: true,
  },
  status: {
    type: Boolean,
    required: true,
    default: true,
  },
  slug:{
  type:String,
  required:true,
  },
  post_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    require: true,
    default: Date.now(),
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Menu", MenuSchema);