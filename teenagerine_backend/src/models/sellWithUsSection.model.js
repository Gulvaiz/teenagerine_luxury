const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
  icon: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  desc: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const sellWithUsSectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  imageCaption: {
    type: String,
    required: true
  },
  imageSubCaption: {
    type: String,
    required: true
  },
  ctaTitle: {
    type: String,
    required: true
  },
  ctaDescription: {
    type: String,
    required: true
  },
  ctaButtonText: {
    type: String,
    required: true
  },
  ctaButtonLink: {
    type: String,
    required: true
  },
  features: [featureSchema],
  extraFeatures: [featureSchema]
}, { timestamps: true });

module.exports = mongoose.model('SellWithUsSection', sellWithUsSectionSchema);