const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  url: {
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
  },
  isMegaMenu: {
    type: Boolean,
    default: false
  },
  isHighlighted: {
    type: Boolean,
    default: false
  }
});

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  slug: {
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
  },
  image: {
    type: String,
    default: null
  }
});

const megaMenuSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  categories: [categorySchema],
  image: {
    type: String,
    default: null
  },
  isServiceMenu: {
    type: Boolean,
    default: false
  }
});

const navbarSchema = new mongoose.Schema({
  logo: {
    type: String,
    required: true
  },
  menuItems: [menuItemSchema],
  megaMenus: [megaMenuSchema],
  searchEnabled: {
    type: Boolean,
    default: true
  },
  wishlistEnabled: {
    type: Boolean,
    default: true
  },
  cartEnabled: {
    type: Boolean,
    default: true
  },
  userEnabled: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Navbar', navbarSchema);