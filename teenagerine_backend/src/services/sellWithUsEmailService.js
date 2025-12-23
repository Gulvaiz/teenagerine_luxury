const emailService = require('./emailService');

class SellWithUsEmailService {
  /**
   * Send notification email for new sell with us submission
   * @param {Object} sellWithUsData - The sell with us submission data
   * @returns {Promise<Object>} Result of email sending
   */
  async sendSubmissionNotification(sellWithUsData) {
    try {
      const result = await emailService.sendEmail({
        to: process.env.ADMIN_EMAIL || 'consign@tangerineluxury.com',
        subject: `🛍️ New Sell With Us Submission - ${sellWithUsData.name}`,
        template: 'sellWithUsNotification',
        data: sellWithUsData
      });

      return result;
    } catch (error) {
      console.error('Error sending sell with us notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send confirmation email to the customer who submitted
   * @param {Object} sellWithUsData - The sell with us submission data
   * @returns {Promise<Object>} Result of email sending
   */
  async sendCustomerConfirmation(sellWithUsData) {
    try {
      const result = await emailService.sendEmail({
        to: sellWithUsData.email,
        subject: '✅ Your Sell With Us Submission Received - Tangerine Luxury',
        template: 'sellWithUsConfirmation',
        data: sellWithUsData
      });

      return result;
    } catch (error) {
      console.error('Error sending sell with us confirmation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send both notification and confirmation emails
   * @param {Object} sellWithUsData - The sell with us submission data
   * @returns {Promise<Object>} Results of both email sends
   */
  async sendAllEmails(sellWithUsData) {
    const results = {};

    // Send notification to admin
    results.notification = await this.sendSubmissionNotification(sellWithUsData);
    
    // Send confirmation to customer
    results.confirmation = await this.sendCustomerConfirmation(sellWithUsData);

    return {
      success: results.notification.success && results.confirmation.success,
      notification: results.notification,
      confirmation: results.confirmation
    };
  }
}

module.exports = new SellWithUsEmailService();