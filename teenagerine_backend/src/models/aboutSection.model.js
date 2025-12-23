const mongoose = require('mongoose');

const featureSchema = new mongoose.Schema({
  icon: {
    type: String,
    required: true
  },
  label: {
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

const testimonialSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  author: {
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

const aboutSectionSchema = new mongoose.Schema({
  logo: {
    type: String,
    required: true
  },
  paragraph1: {
    type: String,
    required: true
  },
  paragraph2: {
    type: String,
    required: true
  },
  testimonialTitle: {
    type: String,
    required: true
  },
  testimonialSubtitle: {
    type: String,
    required: true
  },
  features: [featureSchema],
  testimonials: [testimonialSchema]
}, { timestamps: true });

module.exports = mongoose.model('AboutSection', aboutSectionSchema);