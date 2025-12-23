const mongoose = require('mongoose');
const globalControllerSchema = new mongoose.Schema({
    brands: {
        type: Boolean,
        default: true
    },
    categories: {
        type: Boolean,
        default: true
    },
    products: {
        type: Boolean,
        default: true
    },
    users: {
        type: Boolean,
        default: true
    },
    orders: {
        type: Boolean,
        default: true
    },
    contactUs: {
        type: Boolean,
        default: true
    },
    reviews: {
        type: Boolean,
        default: true
    },
    settings: {
        type: Boolean,
        default: true
    },
    coupons: {
        type: Boolean,
        default: true
    },
    notifications: {
        type: Boolean,
        default: true
    },
    messages: {
        type: Boolean,
        default: true
    },
    faqs: {
        type: Boolean,
        default: true
    },
    banners: {
        type: Boolean,
        default: true
    },
    pages: {
        type: Boolean,
        default: true
    },
    blogs: {
        type: Boolean,
        default: true
    },
    events: {
        type: Boolean,
        default: true
    },
    testimonials: {
        type: Boolean,
        default: true
    },

}, { timestamps: true });

const globalController = mongoose.model('globalController', globalControllerSchema);
module.exports = globalController;