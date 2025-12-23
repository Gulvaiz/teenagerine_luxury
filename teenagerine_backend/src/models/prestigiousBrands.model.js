const mongoose = require('mongoose');

const featuredItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  image: {
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

const prestigiousBrandsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  quote: {
    type: String,
    required: true,
    // Editable quote for the Prestigious Brands section (e.g., 'MIX, MATCH & SHOP THE COMBO')
  },
  mainImage: {
    type: String,
    required: true
  },
  leftImage: {
    type: String,
    required: true
  },
  rightImage: {
    type: String,
    required: true
  },
  buttonText: {
    type: String,
    required: true
  },
  buttonLink: {
    type: String,
    required: true
  },
  featuredItems: [featuredItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('PrestigiousBrands', prestigiousBrandsSchema);