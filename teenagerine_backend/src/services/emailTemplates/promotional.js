const baseTemplate = require('./base');

const promotionalTemplate = (data) => {
  const { 
    title, 
    content, 
    discount = null, 
    promoCode = null, 
    expiryDate = null,
    featuredItems = [],
    callToAction = { text: 'Shop Now', url: '#' }
  } = data;
  
  const emailContent = `
    <div style="text-align: center; margin: 20px 0;">
      <h2 style="color: #FF6B35; font-size: 32px; margin: 0;">🔥 ${title || 'Special Promotion'}</h2>
      ${discount ? `<div style="font-size: 48px; font-weight: bold; color: #FF6B35; margin: 15px 0;">${discount}% OFF</div>` : ''}
    </div>
    
    ${content ? `<div class="highlight-box" style="text-align: center; background: linear-gradient(135deg, #fff5f0 0%, #ffe8e0 100%); border: 2px solid #FF6B35;">
      <h3 style="color: #FF6B35; margin: 0 0 15px 0;">🎯 Limited Time Offer</h3>
      ${content}
    </div>` : ''}
    
    ${promoCode ? `
    <div style="background: linear-gradient(135deg, #FF6B35 0%, #FF8A50 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; box-shadow: 0 8px 25px rgba(255, 107, 53, 0.3);">
      <h3 style="color: white; margin: 0 0 15px 0; font-size: 24px;">💳 Your Exclusive Promo Code</h3>
      <div style="background: rgba(255, 255, 255, 0.2); padding: 20px; border-radius: 8px; margin: 20px 0; border: 3px dashed rgba(255, 255, 255, 0.7);">
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 3px; margin-bottom: 10px;">${promoCode}</div>
        ${expiryDate ? `<div style="font-size: 14px; opacity: 0.9;">Valid until ${new Date(expiryDate).toLocaleDateString()}</div>` : ''}
      </div>
      <p style="font-size: 16px; margin: 0; opacity: 0.9;">Copy this code and use it at checkout!</p>
    </div>
    ` : ''}
    
    ${featuredItems.length > 0 ? `
    <div class="divider"></div>
    
    <h3 style="text-align: center; color: #FF6B35;">🌟 Featured in This Sale</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; margin: 30px 0;">
      ${featuredItems.map(item => `
        <div style="border: 2px solid #f0f0f0; border-radius: 12px; overflow: hidden; transition: transform 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
          <div style="position: relative;">
            <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 200px; object-fit: cover;">
            ${item.discount ? `<div style="position: absolute; top: 10px; right: 10px; background: #FF6B35; color: white; padding: 8px 12px; border-radius: 20px; font-weight: bold; font-size: 14px;">-${item.discount}%</div>` : ''}
          </div>
          <div style="padding: 20px;">
            <h4 style="color: #333; margin: 0 0 10px 0; font-size: 18px; line-height: 1.3;">${item.name}</h4>
            <p style="color: #666; font-size: 14px; margin: 0 0 15px 0; line-height: 1.4;">${item.description || ''}</p>
            <div style="display: flex; align-items: center; justify-content: space-between; margin: 15px 0;">
              <div>
                ${item.originalPrice ? `<span style="text-decoration: line-through; color: #999; margin-right: 10px; font-size: 16px;">$${item.originalPrice}</span>` : ''}
                <span style="font-size: 22px; font-weight: bold; color: #FF6B35;">$${item.salePrice || item.price}</span>
              </div>
            </div>
            <a href="${item.url || '#'}" class="btn" style="display: block; text-align: center; margin-top: 15px; padding: 14px;">Shop Now</a>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <div class="divider"></div>
    
    <div style="text-align: center; background: linear-gradient(135deg, #f8f9ff 0%, #fff5f0 100%); padding: 40px; border-radius: 12px; margin: 30px 0;">
      <h3 style="color: #FF6B35; margin: 0 0 20px 0; font-size: 28px;">⏰ Don't Wait - Sale Ends Soon!</h3>
      ${expiryDate ? `<p style="font-size: 18px; color: #666; margin: 0 0 25px 0;">This exclusive offer expires on <strong style="color: #FF6B35;">${new Date(expiryDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>` : ''}
      <a href="${callToAction.url}" class="btn" style="font-size: 20px; padding: 20px 40px; background: linear-gradient(135deg, #FF6B35 0%, #FF8A50 100%); box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);">${callToAction.text}</a>
    </div>
    
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 25px; margin: 30px 0;">
      <h4 style="color: #856404; margin: 0 0 15px 0;">📝 Terms & Conditions</h4>
      <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
        <li>Valid for new and existing customers</li>
        <li>Cannot be combined with other offers</li>
        <li>Discount applies to regular-priced items only</li>
        <li>Free shipping on orders over $100</li>
        ${expiryDate ? `<li>Offer expires ${new Date(expiryDate).toLocaleDateString()}</li>` : ''}
        <li>Subject to availability</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <p style="color: #666; font-size: 16px; margin: 0 0 10px 0;">Questions about this promotion?</p>
      <p style="color: #666; margin: 0;">
        Contact us at <a href="mailto:sales@tangerineluxury.com" style="color: #FF6B35; text-decoration: none;">sales@tangerineluxury.com</a>
      </p>
    </div>
    
    <p style="text-align: center; color: #666; font-style: italic; margin-top: 30px;">
      Happy shopping!<br>
      <strong style="color: #FF6B35;">The Tangerine Luxury Team</strong>
    </p>
  `;

  return baseTemplate(emailContent, {
    title: `${title || 'Special Promotion'} - Tangerine Luxury`,
    preheader: promoCode ? `Use code ${promoCode} for exclusive savings!` : 'Exclusive savings just for you!',
    headerColor: '#FF6B35'
  });
};

module.exports = promotionalTemplate;