const mongoose = require("mongoose");

const homepageSectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true
    },
    component: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        required: true,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const HomepageSection = mongoose.model("HomepageSection", homepageSectionSchema);

module.exports = HomepageSection;