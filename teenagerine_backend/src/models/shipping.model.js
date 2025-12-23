const mongoose = require("mongoose");

const shippingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: "Standard Shipping"
    },
    amount: {
      type: Number,
      required: true,
      default: 500
    },
    isActive: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      default: "Standard shipping charge applied to all orders"
    },
    freeShippingThreshold: {
      type: Number,
      default: 2999 // Free shipping above this amount
    },
    estimatedDays: {
      type: String,
      default: "5-7 business days"
    }
  },
  { timestamps: true }
);

// Ensure only one active shipping configuration
shippingSchema.index({ isActive: 1 });

module.exports = mongoose.model("Shipping", shippingSchema);