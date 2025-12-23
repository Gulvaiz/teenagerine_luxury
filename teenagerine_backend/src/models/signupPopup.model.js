const mongoose = require('mongoose');

const signupPopupSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    default: "Exclusive Offer!"
  },
  discountAmount: {
    type: Number,
    required: true,
    default: 2000
  },
  minimumOrderAmount: {
    type: Number,
    required: true,
    default: 15000
  },
  couponCode: {
    type: String,
    required: true,
    default: "WELCOME20"
  },
  offerDescription: {
    type: String,
    required: true,
    default: "Get ₹2000 off on your first order above ₹15000"
  },
  couponHelperText: {
    type: String,
    required: true,
    default: "Applied automatically at checkout"
  },
  buttonText: {
    type: String,
    required: true,
    default: "Claim My 2000 OFF"
  },
  loadingText: {
    type: String,
    required: true,
    default: "Creating Account..."
  },
  successTitle: {
    type: String,
    required: true,
    default: "🎉 Welcome!"
  },
  successMessage: {
    type: String,
    required: true,
    default: "Your ₹2000 discount is ready to use!"
  },
  successDiscountText: {
    type: String,
    required: true,
    default: "Discount code WELCOME20 activated"
  },
  successRedirectText: {
    type: String,
    required: true,
    default: "Redirecting to your dashboard..."
  },
  termsText: {
    type: String,
    required: true,
    default: "By signing up, you agree to our terms and conditions."
  },
  limitedOfferText: {
    type: String,
    required: true,
    default: "Limited time offer • New customers only"
  },
  enabled: {
    type: Boolean,
    default: true
  },
  showDelayMs: {
    type: Number,
    default: 2000
  },
  backgroundImage: {
    type: String,
    default: ""
  }
}, { timestamps: true });

module.exports = mongoose.model('SignupPopup', signupPopupSchema);