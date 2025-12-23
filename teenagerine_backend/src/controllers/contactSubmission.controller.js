const ContactSubmission = require("../models/contactSubmission.model");
const emailService = require("../utils/emailService");

exports.createSubmission = async (req, res) => {
    try {
        const submission = new ContactSubmission(req.body);
        const savedSubmission = await submission.save();
        
        // Send email notifications (don't block the response if email fails)
        try {
            await Promise.all([
                emailService.sendContactSubmissionEmail(savedSubmission),
                emailService.sendAutoReplyEmail(savedSubmission)
            ]);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Continue with success response even if email fails
        }
        
        res.status(201).json(savedSubmission);
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
};

exports.getAllSubmissions = async (req, res) => {
    try {
        const submissions = await ContactSubmission.find().sort({ createdAt: -1 });
        res.status(200).json(submissions);
    } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateSubmissionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const submission = await ContactSubmission.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }
        
        res.status(200).json(submission);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};