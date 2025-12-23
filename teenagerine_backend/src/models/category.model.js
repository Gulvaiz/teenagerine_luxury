const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema(
  {

    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "This is Category",
    },
    image: {
      type: String,
      required: [true, "Category image is required"],
      default: "./default.jpg",
    },
    link: {
      type: String,
      default: "/category",
    },
    status: {
      type: Boolean,
      default: true,
    },
    post_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    human: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
