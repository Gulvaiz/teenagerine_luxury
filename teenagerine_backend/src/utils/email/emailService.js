const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
    });
  }

  async sendEmail({ to, subject, html, attachments = [] }) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'info@tangerineluxury.com',
        to,
        subject,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendBulkEmails(emails) {
    const results = [];
    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push({ ...email, ...result });
    }
    return results;
  }
}

module.exports = new EmailService();