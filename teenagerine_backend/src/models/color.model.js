const mongoose = require("mongoose");
const ColorSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  price:{
   type:Number,
   default:0.00
  },
  status: {
    type:Boolean,
    default:true
  },
  post_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"User",
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Color", ColorSchema);
