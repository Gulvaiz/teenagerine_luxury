const baseTemplate = require('./base');

const newsletterTemplate = (data) => {
  const { content, subject, featuredProducts = [], promotions = [] } = data;
  
  const emailContent = `
    <h2>📧 Newsletter Update</h2>
    
    <div class="highlight-box">
      <h3>What's New at Tangerine Luxury</h3>
      ${content || '<p>Stay updated with our latest collections and exclusive offers!</p>'}
    </div>
    
    ${featuredProducts.length > 0 ? `
    <div class="divider"></div>
    
    <h3>🌟 Featured Products</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0;">
      ${featuredProducts.map(product => `
        <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; text-align: center; background: #fafafa;">
          <img src="${product.image}" alt="${product.name}" style="width: 100%; max-width: 200px; height: 150px; object-fit: cover; border-radius: 6px; margin-bottom: 15px;">
          <h4 style="color: #FF6B35; margin: 10px 0; font-size: 18px;">${product.name}</h4>
          <p style="font-size: 14px; color: #666; margin: 10px 0;">${product.description}</p>
          <div style="font-size: 20px; font-weight: bold; color: #333; margin: 10px 0;">$${product.price}</div>
          <a href="${product.url}" class="btn" style="display: inline-block; margin-top: 10px;">Shop Now</a>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    ${promotions.length > 0 ? `
    <div class="divider"></div>
    
    <h3>🎉 Special Offers</h3>
    ${promotions.map(promo => `
      <div class="highlight-box" style="background: linear-gradient(135deg, #fff5f0 0%, #ffe8e0 100%); border-left: 4px solid #FF6B35;">
        <h4 style="color: #FF6B35; margin: 0 0 10px 0; font-size: 20px;">🏷️ ${promo.title}</h4>
        <p style="margin: 0 0 15px 0; font-size: 16px;">${promo.description}</p>
        ${promo.code ? `<div style="background: #FF6B35; color: white; padding: 10px; border-radius: 6px; font-weight: bold; text-align: center; margin: 15px 0;">Use code: ${promo.code}</div>` : ''}
        ${promo.url ? `<a href="${promo.url}" class="btn">Claim Offer</a>` : ''}
      </div>
    `).join('')}
    ` : ''}
    
    <div class="divider"></div>
    
    <div style="text-align: center; background: linear-gradient(135deg, #f8f9ff 0%, #fff5f0 100%); padding: 30px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: #FF6B35; margin: 0 0 15px 0;">Stay Connected</h3>
      <p style="margin: 0 0 20px 0; color: #666;">Follow us for daily inspiration and exclusive behind-the-scenes content!</p>
      <div style="display: flex; justify-content: center; gap: 15px; margin: 20px 0;">
        <a href="#" class="btn" style="padding: 12px 20px; font-size: 14px;">Visit Our Store</a>
        <a href="#" class="btn btn-secondary" style="padding: 12px 20px; font-size: 14px;">Follow on Instagram</a>
      </div>
    </div>
    
    <p style="text-align: center; color: #888; font-size: 14px; margin-top: 30px;">
      Thank you for being a valued subscriber! 💎
    </p>
  `;

  return baseTemplate(emailContent, {
    title: subject || 'Tangerine Luxury Newsletter',
    preheader: 'Stay updated with our latest collections and exclusive offers',
    headerColor: '#FF6B35'
  });
};

module.exports = newsletterTemplate;