const mongoose = require("mongoose");

const quoteRequestSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isGuest: {
      type: Boolean,
      default: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    whatsapp: {
      type: String,
      default: "",
    },
    price: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    message: {
      type: String,
      default: "",
    },
    productUrl:{
    type:String,
    default:""
    },
    status: {
      type: String,
      enum: ["pending", "responded", "closed"],
      default: "pending",
    },
    referenceNumber: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

// Generate a unique reference number before saving
quoteRequestSchema.pre("save", async function (next) {
  if (!this.referenceNumber) {
    const date = new Date();
    const prefix = "QR";
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    this.referenceNumber = `${prefix}${date.getFullYear()}${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}-${randomPart}`;
  }
  next();
});

module.exports = mongoose.model("QuoteRequest", quoteRequestSchema);