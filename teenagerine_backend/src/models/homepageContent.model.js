const mongoose = require("mongoose");

const contentElementSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['text', 'image', 'button', 'link'],
        required: true
    },
    key: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    },
    metadata: {
        alt: String,
        href: String,
        target: String,
        className: String,
        style: Object
    }
});

const homepageContentSchema = new mongoose.Schema({
    sectionName: {
        type: String,
        required: true
    },
    sectionDisplayName: {
        type: String,
        required: true
    },
    elements: [contentElementSchema],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const HomepageContent = mongoose.model("HomepageContent", homepageContentSchema);

module.exports = HomepageContent;