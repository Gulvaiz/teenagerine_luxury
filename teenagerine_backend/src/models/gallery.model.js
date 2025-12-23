const mongoose = require("mongoose");

const GallerySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required:true
  },
  post_by: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports=mongoose.model("Gallery", GallerySchema);
