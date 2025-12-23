const baseTemplate = require('./base');

const welcomeTemplate = (data) => {
  const { name, email, welcomeOffer = null } = data;
  
  const emailContent = `
    <div style="text-align: center; margin: 20px 0;">
      <h2 style="color: #FF6B35; font-size: 32px; margin: 0;">🎉 Welcome to Tangerine Luxury!</h2>
    </div>
    
    <p>Dear ${name || 'Valued Customer'},</p>
    
    <p>Welcome to the <strong>Tangerine Luxury</strong> family! We're thrilled to have you join our exclusive community of fashion enthusiasts who appreciate premium quality and timeless style.</p>
    
    <div class="highlight-box">
      <h3 style="color: #FF6B35; margin: 0 0 15px 0;">🌟 What You Can Expect</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>Exclusive Access:</strong> Be the first to discover our new collections</li>
        <li><strong>Special Offers:</strong> Subscriber-only discounts and promotions</li>
        <li><strong>Style Inspiration:</strong> Curated looks and fashion tips from our experts</li>
        <li><strong>VIP Treatment:</strong> Priority access to sales and limited editions</li>
      </ul>
    </div>
    
    ${welcomeOffer ? `
    <div style="background: linear-gradient(135deg, #FF6B35 0%, #FF8A50 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
      <h3 style="color: white; margin: 0 0 15px 0; font-size: 24px;">🎁 Welcome Gift Just for You!</h3>
      <p style="font-size: 18px; margin: 0 0 20px 0;">${welcomeOffer.description}</p>
      <div style="background: rgba(255, 255, 255, 0.2); padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; margin: 20px 0; border: 2px dashed rgba(255, 255, 255, 0.5);">
        CODE: ${welcomeOffer.code}
      </div>
      <a href="${welcomeOffer.url || '#'}" class="btn" style="background: white; color: #FF6B35; font-weight: bold;">Shop Now & Save</a>
    </div>
    ` : ''}
    
    <div class="divider"></div>
    
    <h3>🛍️ Start Your Luxury Journey</h3>
    <p>Ready to explore our collections? Here are some popular categories to get you started:</p>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 25px 0;">
      <div style="text-align: center; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; transition: transform 0.3s ease;">
        <div style="font-size: 40px; margin-bottom: 10px;">👗</div>
        <h4 style="color: #FF6B35; margin: 10px 0;">Women's Fashion</h4>
        <p style="font-size: 14px; color: #666; margin: 0;">Elegant dresses & accessories</p>
      </div>
      
      <div style="text-align: center; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; transition: transform 0.3s ease;">
        <div style="font-size: 40px; margin-bottom: 10px;">🕴️</div>
        <h4 style="color: #FF6B35; margin: 10px 0;">Men's Collection</h4>
        <p style="font-size: 14px; color: #666; margin: 0;">Sophisticated suits & styles</p>
      </div>
      
      <div style="text-align: center; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; transition: transform 0.3s ease;">
        <div style="font-size: 40px; margin-bottom: 10px;">👜</div>
        <h4 style="color: #FF6B35; margin: 10px 0;">Luxury Accessories</h4>
        <p style="font-size: 14px; color: #666; margin: 0;">Premium bags & jewelry</p>
      </div>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="#" class="btn" style="font-size: 18px; padding: 18px 36px;">Explore Collections</a>
    </div>
    
    <div class="divider"></div>
    
    <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; border-left: 4px solid #28a745;">
      <h4 style="color: #28a745; margin: 0 0 15px 0;">📞 Need Help Getting Started?</h4>
      <p style="margin: 0 0 15px 0;">Our customer service team is here to help you with any questions about sizing, styling, or orders.</p>
      <p style="margin: 0;">
        <strong>Email:</strong> <a href="mailto:support@tangerineluxury.com" style="color: #28a745;">support@tangerineluxury.com</a><br>
        <strong>Phone:</strong> <a href="tel:+1234567890" style="color: #28a745;">+1 (234) 567-890</a>
      </p>
    </div>
    
    <p style="text-align: center; margin: 40px 0 20px 0; font-size: 16px;">
      Once again, welcome to the Tangerine Luxury family! We can't wait to help you discover your perfect style.
    </p>
    
    <p style="text-align: center; color: #666; font-style: italic;">
      With luxury and style,<br>
      <strong style="color: #FF6B35;">The Tangerine Luxury Team</strong>
    </p>
  `;

  return baseTemplate(emailContent, {
    title: 'Welcome to Tangerine Luxury',
    preheader: 'Welcome to our exclusive community of fashion enthusiasts!',
    headerColor: '#FF6B35'
  });
};

module.exports = welcomeTemplate;