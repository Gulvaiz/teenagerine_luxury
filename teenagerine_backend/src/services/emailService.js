require('dotenv').config();
const nodemailer = require('nodemailer');
const emailTemplates = require('./emailTemplates');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Gmail-optimized transporter configuration
      this.transporter = nodemailer.createTransport({
        service: 'gmail', 
        secure: true, // Gmail supports SSL
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // Password
        },
        // Gmail-specific connection settings
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 10, // Gmail allows up to 10 emails per second for apps
        // Timeout settings optimized for Gmail
        socketTimeout: 45000, // 45 seconds (Gmail recommended)
        connectionTimeout: 45000,
        greetingTimeout: 15000, // 15 seconds for greeting
        // Gmail TLS configuration
        tls: {
          rejectUnauthorized: true, // Gmail has valid certificates
          minVersion: 'TLSv1.2'
        },
        // Gmail-specific settings
        requireTLS: true,
        // Debug for Gmail troubleshooting
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
      });

      // Test connection with retry logic
      await this.testConnection();
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      if(error.errno === '-3008') {
         console.log("Please check your internet connection.");
      }
      console.error('❌ Failed to initialize email service:', error);
      
      // Fallback configurations for Gmail issues
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Gmail connection failed, trying alternative configurations...');
        
        // Try Gmail with manual host configuration
        try {
          this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            },
            tls: {
              rejectUnauthorized: false
            }
          });
          await this.transporter.verify();
          console.log('✅ Gmail working with manual configuration');
        } catch (fallbackError) {
          console.log('📧 Setting up Ethereal test account for development...');
          const testAccount = await nodemailer.createTestAccount();
          this.transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 465,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
            socketTimeout: 45000,
            connectionTimeout: 45000,
          });
          console.log('📧 Development email account ready (Ethereal)');
        }
      }
    }
  }

  async testConnection(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.transporter.verify();
        console.log('🔗 Gmail SMTP connection verified successfully');
        return true;
      } catch (error) {
        console.error(`Gmail connection test attempt ${i + 1} failed:`, error.message);
        
        // Gmail-specific error messages
        if (error.message.includes('Invalid login')) {
          console.error('❌ Gmail Authentication Error: Check your EMAIL_USER and EMAIL_PASS');
          console.error('💡 Make sure you\'re using a Gmail App Password, not your regular password');
          console.error('📖 Guide: https://support.google.com/accounts/answer/185833');
        }
        
        if (error.message.includes('Less secure app')) {
          console.error('❌ Gmail Security Error: Enable App Passwords or use OAuth2');
        }
        
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // Progressive delay
      }
    }
  }

  async sendEmail({ to, subject, template, data = {} }, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (!this.transporter) {
          await this.initializeTransporter();
        }

        const emailTemplate = emailTemplates[template];
        if (!emailTemplate) {
          throw new Error(`Template '${template}' not found`);
        }

        const htmlContent = emailTemplate(data);

        const mailOptions = {
          from: process.env.EMAIL_FROM || '"Tangerine Luxury" <newsletter@tangerineluxury.com>',
          to: Array.isArray(to) ? to.join(', ') : to,
          subject,
          html: htmlContent,
        };

        const info = await this.transporter.sendMail(mailOptions);
        
        return {
          success: true,
          messageId: info.messageId,
          previewUrl: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : null
        };
      } catch (error) {
        console.error(`Email send attempt ${attempt + 1} failed:`, error.message);
        
        // If it's a socket close error, reinitialize transporter
        if (error.message.includes('Unexpected socket close') || error.message.includes('ECONNRESET')) {
          console.log('🔄 Socket error detected, reinitializing transporter...');
          this.transporter = null;
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
        }
        
        // If final attempt or non-recoverable error
        if (attempt === retries - 1) {
          return {
            success: false,
            error: error.message
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  async sendBulkEmail({ recipients, subject, template, data = {} }) {
    try {
      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };

      // Send emails in batches to avoid overwhelming the server
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < recipients.length; i += batchSize) {
        batches.push(recipients.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const promises = batch.map(async (recipient) => {
          try {
            const result = await this.sendEmail({
              to: recipient,
              subject,
              template,
              data: { ...data, email: recipient }
            });
            
            if (result.success) {
              results.successful++;
            } else {
              results.failed++;
              results.errors.push({ email: recipient, error: result.error });
            }
          } catch (error) {
            results.failed++;
            results.errors.push({ email: recipient, error: error.message });
          }
        });

        await Promise.all(promises);
        
        // Add delay between batches to be respectful to the email provider
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to send bulk email:', error);
      throw error;
    }
  }

  async sendNewsletterEmail({ recipients, subject, content, customData = {} }) {
    return this.sendBulkEmail({
      recipients,
      subject,
      template: 'newsletter',
      data: { content, ...customData }
    });
  }

  async sendWelcomeEmail(email, name = '') {
    return this.sendEmail({
      to: email,
      subject: 'Welcome to Tangerine Luxury Newsletter',
      template: 'welcome',
      data: { name, email }
    });
  }

  async sendUnsubscribeConfirmation(email) {
    return this.sendEmail({
      to: email,
      subject: 'Unsubscribed from Tangerine Luxury Newsletter',
      template: 'unsubscribe',
      data: { email }
    });
  }
}

module.exports = new EmailService();