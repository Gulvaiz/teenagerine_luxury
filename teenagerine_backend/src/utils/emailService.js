const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });
    }

    async sendContactSubmissionEmail(submissionData) {
        try {
            // Load email template
            const templatePath = path.join(__dirname, '../templates/contactSubmissionTemplate.html');
            let emailTemplate = fs.readFileSync(templatePath, 'utf8');

            // Replace placeholders with actual data
            emailTemplate = emailTemplate
                .replace('{{name}}', submissionData.name)
                .replace('{{email}}', submissionData.email)
                .replace('{{subject}}', submissionData.subject)
                .replace('{{message}}', submissionData.message)
                .replace('{{date}}', new Date().toLocaleDateString());

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to:process.env.EMAIL_USER ,
                subject: `New Contact Form Submission: ${submissionData.subject}`,
                html: emailTemplate
            };

            const result = await this.transporter.sendMail(mailOptions);
            // console.log('Contact submission email sent:', result.messageId);
            return result;
        } catch (error) {
            // console.error('Error sending contact submission email:', error);
            throw error;
        }
    }

    async sendAutoReplyEmail(submissionData) {
        try {
            const templatePath = path.join(__dirname, '../templates/autoReplyTemplate.html');
            let emailTemplate = fs.readFileSync(templatePath, 'utf8');

            emailTemplate = emailTemplate
                .replace('{{name}}', submissionData.name)
                .replace('{{subject}}', submissionData.subject);

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: submissionData.email,
                subject: 'Thank you for contacting us',
                html: emailTemplate
            };

            const result = await this.transporter.sendMail(mailOptions);
            // console.log('Auto-reply email sent:', result.messageId);
            return result;
        } catch (error) {
            // console.error('Error sending auto-reply email:', error);
            throw error;
        }
    }

    async sendProductRequestAdminEmail(requestData) {
        try {
            const templatePath = path.join(__dirname, '../templates/productRequestAdminTemplate.html');
            let emailTemplate = fs.readFileSync(templatePath, 'utf8');

            emailTemplate = emailTemplate
                .replace('{{productName}}', requestData.name)
                .replace('{{customerEmail}}', requestData.contactEmail)
                .replace('{{customerPhone}}', requestData.contactPhone || 'Not provided')
                .replace('{{budget}}', requestData.budget.toLocaleString())
                .replace('{{description}}', requestData.description)
                .replace('{{referenceImage}}', requestData.referenceImage || 'No image provided')
                .replace('{{date}}', new Date().toLocaleDateString())
                .replace('{{isGuest}}', requestData.isGuest ? 'Guest User' : 'Registered User');

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to:process.env.EMAIL_CONSIGNL,
                subject: `New Product Request: ${requestData.name}`,
                html: emailTemplate
            };

            const result = await this.transporter.sendMail(mailOptions);
            return result;
        } catch (error) {
            throw error;
        }
    }

    async sendProductRequestConfirmationEmail(requestData) {
        try {
            const templatePath = path.join(__dirname, '../templates/productRequestConfirmationTemplate.html');
            let emailTemplate = fs.readFileSync(templatePath, 'utf8');

            emailTemplate = emailTemplate
                .replace('{{productName}}', requestData.name)
                .replace('{{budget}}', requestData.budget.toLocaleString())
                .replace('{{description}}', requestData.description);

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: requestData.contactEmail,
                subject: 'Product Request Confirmation - Tangerine Luxury',
                html: emailTemplate
            };

            const result = await this.transporter.sendMail(mailOptions);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new EmailService();