const mongoose=require("mongoose");

const contactUsSchema=new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'closed'],
        default: 'pending'
    }
}, { timestamps: true });

const ContactUs = mongoose.model('ContactUs', contactUsSchema);

module.exports = ContactUs;