const baseTemplate = require('./base');

const unsubscribeTemplate = (data) => {
  const { email, reason = '', feedback = '' } = data;
  
  const emailContent = `
    <div style="text-align: center; margin: 20px 0;">
      <h2 style="color: #6c757d; font-size: 28px; margin: 0;">👋 We're Sorry to See You Go</h2>
    </div>
    
    <p>Hello,</p>
    
    <p>We've successfully unsubscribed <strong>${email}</strong> from our newsletter. You will no longer receive promotional emails from Tangerine Luxury.</p>
    
    <div class="highlight-box" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-left: 4px solid #6c757d;">
      <h3 style="color: #6c757d; margin: 0 0 15px 0;">✅ Unsubscription Confirmed</h3>
      <p style="margin: 0;">Your email address has been removed from our mailing list. This change is effective immediately.</p>
    </div>
    
    ${reason ? `
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h4 style="color: #856404; margin: 0 0 10px 0;">📝 Your Feedback</h4>
      <p style="color: #856404; margin: 0;"><strong>Reason:</strong> ${reason}</p>
      ${feedback ? `<p style="color: #856404; margin: 10px 0 0 0;"><strong>Additional feedback:</strong> ${feedback}</p>` : ''}
    </div>
    ` : ''}
    
    <div class="divider"></div>
    
    <h3 style="color: #6c757d;">🤔 Changed Your Mind?</h3>
    <p>If you unsubscribed by mistake or would like to receive our emails again, you can easily resubscribe at any time.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" class="btn" style="background: #28a745; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">Resubscribe to Newsletter</a>
    </div>
    
    <div class="divider"></div>
    
    <h3 style="color: #6c757d;">📧 Other Ways to Stay Connected</h3>
    <p>Even though you've unsubscribed from our newsletter, there are still other ways to stay connected with Tangerine Luxury:</p>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 25px 0;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e9ecef;">
        <div style="font-size: 32px; margin-bottom: 15px;">🌐</div>
        <h4 style="color: #6c757d; margin: 10px 0;">Visit Our Website</h4>
        <p style="font-size: 14px; color: #666; margin: 0 0 15px 0;">Browse our latest collections anytime</p>
        <a href="#" style="color: #007bff; text-decoration: none; font-weight: 500;">tangerineluxury.com</a>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e9ecef;">
        <div style="font-size: 32px; margin-bottom: 15px;">📱</div>
        <h4 style="color: #6c757d; margin: 10px 0;">Follow on Social Media</h4>
        <p style="font-size: 14px; color: #666; margin: 0 0 15px 0;">Get style inspiration daily</p>
        <div>
          <a href="#" style="color: #007bff; text-decoration: none; margin: 0 5px;">Instagram</a> |
          <a href="#" style="color: #007bff; text-decoration: none; margin: 0 5px;">Facebook</a>
        </div>
      </div>
    </div>
    
    <div class="divider"></div>
    
    <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 25px; margin: 25px 0;">
      <h4 style="color: #0c5460; margin: 0 0 15px 0;">ℹ️ Important Account Information</h4>
      <p style="color: #0c5460; margin: 0 0 15px 0;">Please note that unsubscribing from our newsletter does not affect:</p>
      <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
        <li>Order confirmation emails</li>
        <li>Shipping notifications</li>
        <li>Account security alerts</li>
        <li>Customer service communications</li>
      </ul>
      <p style="color: #0c5460; margin: 15px 0 0 0; font-size: 14px;">These essential emails will continue to be sent as needed for your account.</p>
    </div>
    
    <p style="text-align: center; margin: 40px 0 20px 0; color: #666;">
      Thank you for being part of the Tangerine Luxury community. We hope to serve you again in the future.
    </p>
    
    <p style="text-align: center; color: #666; font-style: italic;">
      Best regards,<br>
      <strong style="color: #6c757d;">The Tangerine Luxury Team</strong>
    </p>
  `;

  return baseTemplate(emailContent, {
    title: 'Unsubscription Confirmed - Tangerine Luxury',
    preheader: 'You have been successfully unsubscribed from our newsletter',
    headerColor: '#6c757d',
    showSocialLinks: false
  });
};

module.exports = unsubscribeTemplate;