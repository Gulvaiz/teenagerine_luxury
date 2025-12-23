const ContactUs= require('../models/contactUs.model');
exports.createContactUs = async (req, res) => {
    try {
        const contactUs = new ContactUs(req.body);
        const savedContactUs = await contactUs.save();

        // --- EMAIL AUTOMATION: Send contact us details to sales@tangerineluxury.com ---
        try {
            const nodemailer = require("nodemailer");
            // Create a test account for dev, use env for prod
            const testAccount = process.env.EMAIL_USER ? null : await nodemailer.createTestAccount();
            const transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || "smtp.ethereal.email",
                port: process.env.EMAIL_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER || (testAccount && testAccount.user),
                    pass: process.env.EMAIL_PASS || (testAccount && testAccount.pass),
                },
            });
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || 'contact@tangerineluxury.com',
                to: 'sales@tangerineluxury.com',
                subject: `New Contact Us Submission from ${savedContactUs.name}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>New Contact Us Submission</h2>
                        <p><strong>Name:</strong> ${savedContactUs.name}</p>
                        <p><strong>Email:</strong> ${savedContactUs.email}</p>
                        <p><strong>Phone:</strong> ${savedContactUs.phone}</p>
                        <p><strong>Message:</strong><br>${savedContactUs.message}</p>
                        <p><strong>Submitted At:</strong> ${new Date(savedContactUs.createdAt).toLocaleString()}</p>
                    </div>
                `
            });
        } catch (emailError) {
            console.error('Error sending contact us email:', emailError);
            // Do not fail the submission if email fails
        }
        // --- END EMAIL AUTOMATION ---

        res.status(201).json(savedContactUs);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
};

exports.getAllContactUs = async (req, res) => {
    try {
        const contactUsEntries = await ContactUs.find();
        res.status(200).json(contactUsEntries);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

exports.getContactUsById = async (req, res) => {
    try {
        const contactUs = await ContactUs.findById(req.params.id);
        if (!contactUs) {
            return res.status(404).json({ message: 'Contact Us entry not found' });
        }
        res.status(200).json(contactUs);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

exports.deleteContactUs = async (req, res) => {
    try {
        const contactUs = await ContactUs.findByIdAndDelete(req.params.id);
        if (!contactUs) {
            return res.status(404).json({ message: 'Contact Us entry not found' });
        }
        res.status(204).json({ message: 'Contact Us entry deleted successfully' });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
}

exports.updateContactUs = async (req, res) => {
    try {
        const contactUs = await ContactUs.findByIdAndUpdate(req
.params.id, req.body, { new: true });
        if (!contactUs) {
            return res.status(404).json({ message: 'Contact Us entry not found' });
        }
        res.status(200).json(contactUs);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
}
