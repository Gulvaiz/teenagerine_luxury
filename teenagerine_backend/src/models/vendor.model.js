const mongoose = require("mongoose");
const VendorSchema = new mongoose.Schema(
  {
    code: {
      type: String,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    contact: {
      type: String,
      unique: true,
      required: [true, "Contact is required"],
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      lowercase: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    pin: {
      type: Number,
      required: [true, "Pin code required"],
    },
    remarks: {
      type: String,
      required: [true, "Remarks is required"],
    },
    status: {
      type: Boolean,
      default: false,
    },
    post_by: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);
