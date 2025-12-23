const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    shippingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    billingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
    deliveryCharge: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["Credit Card", "PayPal","Cash on Delivery", "Bank Transfer", "CCAvenue"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "initiated", "completed", "failed", "cancelled"],
      default: "pending",
    },
    paymentInitiatedAt: {
      type: Date,
    },
    paymentCompletedAt: {
      type: Date,
    },
    paymentFailedAt: {
      type: Date,
    },
    paymentCancelledAt: {
      type: Date,
    },
    paymentResponse: {
      trackingId: String,
      bankRefNo: String,
      orderStatus: String,
      failureMessage: String,
      paymentMode: String,
      cardName: String,
      statusMessage: String,
      responseTime: String,
      rawResponse: Object,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    coupon: {
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
      },
      code: {
        type: String,
      },
      discountAmount: {
        type: Number,
        default: 0,
      },
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing","Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    tracking: {
      trackingNumber: {
        type: String,
        sparse: true
      },
      carrier: {
        type: String,
        default: "DHL"
      },
      trackingUrl: String,
      shippedAt: Date,
      estimatedDelivery: Date,
      lastUpdated: Date
    },
    invoice: {
      url: String,
      publicId: String,
      localPath: String,
      generatedAt: Date,
      invoiceNumber: {
        type: String,
        unique: true,
        sparse: true
      }
    },
    blueDartPickup: {
      tokenNumber: String,
      status: String,
      registeredAt: Date,
      pickupDate: String,
      pickupTime: String,
      referenceNumber: String,
      areaCode: String,
      numberOfPieces: Number,
      weight: Number,
      productCode: String,
      remarks: String,
      cancelled: {
        type: Boolean,
        default: false
      },
      cancelledAt: Date,
      cancellationReason: String,
      cancellationStatus: String
    },
    blueDartWaybill: {
      awbNumber: String,
      status: String,
      generatedAt: Date,
      waybillData: Object
    },
    blueDartErrors: [{
      type: String,
      error: String,
      timestamp: Date
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
