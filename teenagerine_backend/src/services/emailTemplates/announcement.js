const baseTemplate = require('./base');

const announcementTemplate = (data) => {
  const { 
    title, 
    content, 
    type = 'general', // general, product-launch, event, policy-update
    announcementDate = new Date(),
    images = [],
    callToAction = null,
    priority = 'normal' // high, normal, low
  } = data;
  
  const getTypeIcon = (type) => {
    const icons = {
      'product-launch': '🚀',
      'event': '🎪',
      'policy-update': '📋',
      'general': '📢'
    };
    return icons[type] || '📢';
  };
  
  const getTypeColor = (type) => {
    const colors = {
      'product-launch': '#FF6B35',
      'event': '#9b59b6',
      'policy-update': '#3498db',
      'general': '#2c3e50'
    };
    return colors[type] || '#2c3e50';
  };
  
  const priorityStyles = priority === 'high' ? {
    borderColor: '#e74c3c',
    backgroundColor: '#ffeaea',
    textColor: '#c0392b'
  } : {};
  
  const typeColor = getTypeColor(type);
  const typeIcon = getTypeIcon(type);
  
  const emailContent = `
    ${priority === 'high' ? `
    <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 0 0 30px 0;">
      <h3 style="color: white; margin: 0; font-size: 18px;">🚨 IMPORTANT ANNOUNCEMENT</h3>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 20px 0;">
      <div style="font-size: 48px; margin-bottom: 15px;">${typeIcon}</div>
      <h2 style="color: ${typeColor}; font-size: 32px; margin: 0; line-height: 1.2;">${title || 'Important Announcement'}</h2>
      <div style="color: #666; font-size: 14px; margin-top: 10px;">
        ${new Date(announcementDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>
    </div>
    
    ${content ? `
    <div class="highlight-box" style="background: linear-gradient(135deg, #f8f9ff 0%, ${typeColor}10 100%); border-left: 4px solid ${typeColor};">
      ${content}
    </div>
    ` : ''}
    
    ${images.length > 0 ? `
    <div class="divider"></div>
    
    <div style="margin: 30px 0;">
      ${images.length === 1 ? `
        <div style="text-align: center;">
          <img src="${images[0].src}" alt="${images[0].alt || 'Announcement image'}" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);">
          ${images[0].caption ? `<p style="text-align: center; color: #666; font-size: 14px; margin-top: 15px; font-style: italic;">${images[0].caption}</p>` : ''}
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
          ${images.map(image => `
            <div style="text-align: center;">
              <img src="${image.src}" alt="${image.alt || 'Announcement image'}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
              ${image.caption ? `<p style="color: #666; font-size: 12px; margin-top: 10px; font-style: italic;">${image.caption}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>
    ` : ''}
    
    ${type === 'product-launch' ? `
    <div class="divider"></div>
    
    <div style="background: linear-gradient(135deg, #FF6B35 0%, #FF8A50 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
      <h3 style="color: white; margin: 0 0 15px 0; font-size: 24px;">🎉 New Product Launch!</h3>
      <p style="font-size: 16px; margin: 0 0 20px 0; opacity: 0.9;">Be among the first to experience our latest innovation</p>
      <a href="${callToAction?.url || '#'}" class="btn" style="background: white; color: #FF6B35; font-weight: bold; padding: 16px 32px;">${callToAction?.text || 'Explore Now'}</a>
    </div>
    ` : ''}
    
    ${type === 'event' ? `
    <div class="divider"></div>
    
    <div style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
      <h3 style="color: white; margin: 0 0 15px 0; font-size: 24px;">🎪 Special Event</h3>
      <p style="font-size: 16px; margin: 0 0 20px 0; opacity: 0.9;">Join us for an exclusive experience</p>
      <a href="${callToAction?.url || '#'}" class="btn" style="background: white; color: #9b59b6; font-weight: bold; padding: 16px 32px;">${callToAction?.text || 'Learn More'}</a>
    </div>
    ` : ''}
    
    ${type === 'policy-update' ? `
    <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 25px; margin: 30px 0;">
      <h4 style="color: #0c5460; margin: 0 0 15px 0;">📋 Policy Update Summary</h4>
      <p style="color: #0c5460; margin: 0 0 15px 0;">This update affects the following areas:</p>
      <ul style="color: #0c5460; margin: 0 0 15px 0; padding-left: 20px;">
        <li>Terms of Service</li>
        <li>Privacy Policy</li>
        <li>Return & Exchange Policy</li>
      </ul>
      <p style="color: #0c5460; margin: 0; font-size: 14px;"><strong>Effective Date:</strong> ${new Date(announcementDate).toLocaleDateString()}</p>
    </div>
    ` : ''}
    
    ${callToAction && type === 'general' ? `
    <div style="text-align: center; margin: 40px 0;">
      <a href="${callToAction.url}" class="btn" style="background: ${typeColor}; font-size: 18px; padding: 18px 36px;">${callToAction.text}</a>
    </div>
    ` : ''}
    
    <div class="divider"></div>
    
    <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; border-left: 4px solid ${typeColor};">
      <h4 style="color: ${typeColor}; margin: 0 0 15px 0;">📞 Questions or Feedback?</h4>
      <p style="margin: 0 0 15px 0;">We value your thoughts and are here to help with any questions you may have about this announcement.</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
        <div>
          <strong>📧 Email:</strong><br>
          <a href="mailto:info@tangerineluxury.com" style="color: ${typeColor};">info@tangerineluxury.com</a>
        </div>
        <div>
          <strong>📱 Phone:</strong><br>
          <a href="tel:+1234567890" style="color: ${typeColor};">+1 (234) 567-890</a>
        </div>
        <div>
          <strong>💬 Live Chat:</strong><br>
          <a href="#" style="color: ${typeColor};">Available 24/7</a>
        </div>
      </div>
    </div>
    
    ${priority === 'high' ? `
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
      <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Action Required</h4>
      <p style="color: #856404; margin: 0; font-size: 14px;">Please review this announcement carefully as it may require action on your part.</p>
    </div>
    ` : ''}
    
    <p style="text-align: center; margin: 40px 0 20px 0; color: #666;">
      Thank you for being a valued member of the Tangerine Luxury community.
    </p>
    
    <p style="text-align: center; color: #666; font-style: italic;">
      Best regards,<br>
      <strong style="color: ${typeColor};">The Tangerine Luxury Team</strong>
    </p>
  `;

  return baseTemplate(emailContent, {
    title: `${title || 'Announcement'} - Tangerine Luxury`,
    preheader: `Important ${type.replace('-', ' ')} announcement from Tangerine Luxury`,
    headerColor: typeColor
  });
};

module.exports = announcementTemplate;