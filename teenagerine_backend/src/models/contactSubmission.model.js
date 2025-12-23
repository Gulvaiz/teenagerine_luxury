const mongoose = require("mongoose");

const contactSubmissionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["new", "read", "responded"],
        default: "new"
    }
}, { timestamps: true });

const ContactSubmission = mongoose.model("ContactSubmission", contactSubmissionSchema);

module.exports = ContactSubmission;