const mongoose = require("mongoose");
const returnSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Requested"
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    resolvedAt: Date
}, { timestamps: true });

module.exports = mongoose.model("Return", returnSchema);