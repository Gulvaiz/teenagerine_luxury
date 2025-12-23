const baseTemplate = require('./base');

const sellWithUsNotification = (data) => {
  const {
    name,
    email,
    phone,
    whatsapp,
    brand,
    category,
    condition,
    description,
    images = [],
    createdAt
  } = data;

  // Create image gallery HTML
  const imageGalleryHtml = images.length > 0 ? `
    <div style="margin: 30px 0;">
      <h3 style="color: #2d3748; font-size: 18px; margin-bottom: 20px; border-bottom: 2px solid #f7931e; padding-bottom: 10px;">
        📸 Product Images (${images.length})
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
        ${images.map((imageUrl, index) => `
          <div style="border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <img 
              src="${imageUrl}" 
              alt="Product Image ${index + 1}"
              style="width: 100%; height: 200px; object-fit: cover; display: block;"
            />
            <div style="padding: 10px; background-color: #f8fafc; text-align: center;">
              <small style="color: #64748b; font-size: 12px;">Image ${index + 1}</small>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="text-align: center; margin-top: 15px;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          💡 Click on images to view full size
        </p>
      </div>
    </div>
  ` : `
    <div style="margin: 30px 0; padding: 20px; background-color: #fef3cd; border-left: 4px solid #f59e0b; border-radius: 8px;">
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        ⚠️ No images were uploaded with this submission
      </p>
    </div>
  `;

  const content = `
    <div style="background: linear-gradient(135deg, #f7931e 0%, #ff6b35 100%); padding: 30px 20px; text-align: center; border-radius: 15px 15px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        🛍️ New Sell With Us Submission
      </h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
        A new customer wants to sell their luxury items
      </p>
    </div>

    <div style="padding: 30px;">
      <!-- Customer Information -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 5px solid #f7931e;">
        <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center;">
          👤 Customer Information
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
          <div>
            <strong style="color: #4a5568;">Name:</strong>
            <span style="color: #2d3748; margin-left: 8px;">${name}</span>
          </div>
          <div>
            <strong style="color: #4a5568;">Email:</strong>
            <a href="mailto:${email}" style="color: #f7931e; margin-left: 8px; text-decoration: none;">${email}</a>
          </div>
          <div>
            <strong style="color: #4a5568;">Phone:</strong>
            <a href="tel:${phone}" style="color: #f7931e; margin-left: 8px; text-decoration: none;">${phone}</a>
          </div>
          ${whatsapp ? `
          <div>
            <strong style="color: #4a5568;">WhatsApp:</strong>
            <a href="https://wa.me/${whatsapp.replace(/[^\d]/g, '')}" style="color: #25D366; margin-left: 8px; text-decoration: none;">${whatsapp}</a>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Product Information -->
      <div style="background: #f0fdf4; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 5px solid #22c55e;">
        <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center;">
          🏷️ Product Details
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div>
            <strong style="color: #4a5568;">Brand:</strong>
            <span style="color: #2d3748; margin-left: 8px; font-weight: 600; background: #dcfce7; padding: 4px 8px; border-radius: 6px;">${brand}</span>
          </div>
          <div>
            <strong style="color: #4a5568;">Category:</strong>
            <span style="color: #2d3748; margin-left: 8px;">${category}</span>
          </div>
          <div>
            <strong style="color: #4a5568;">Condition:</strong>
            <span style="color: #2d3748; margin-left: 8px; 
              ${condition === 'New' ? 'background: #dcfce7; color: #16a34a;' : 
                condition === 'Like New' ? 'background: #dbeafe; color: #2563eb;' : 
                'background: #fef3cd; color: #f59e0b;'}
              padding: 4px 8px; border-radius: 6px; font-weight: 600;">${condition}</span>
          </div>
        </div>
      </div>

      <!-- Description -->
      ${description ? `
      <div style="background: #fefbff; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 5px solid #a855f7;">
        <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 20px;">
          📝 Description
        </h2>
        <p style="color: #4a5568; line-height: 1.6; margin: 0; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
          ${description}
        </p>
      </div>
      ` : ''}

      <!-- Product Images -->
      ${imageGalleryHtml}

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 40px 0; padding: 25px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 12px;">
        <h3 style="color: #2d3748; margin: 0 0 20px 0;">Quick Actions</h3>
        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
          <a href="mailto:${email}" style="
            background: linear-gradient(135deg, #f7931e 0%, #ff6b35 100%);
            color: white;
            padding: 12px 25px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            box-shadow: 0 4px 6px rgba(247, 147, 30, 0.3);
            transition: all 0.3s ease;
          ">
            📧 Email Customer
          </a>
          <a href="tel:${phone}" style="
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 12px 25px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            box-shadow: 0 4px 6px rgba(34, 197, 94, 0.3);
            transition: all 0.3s ease;
          ">
            📞 Call Customer
          </a>
          ${whatsapp ? `
          <a href="https://wa.me/${whatsapp.replace(/[^\d]/g, '')}" style="
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            color: white;
            padding: 12px 25px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            box-shadow: 0 4px 6px rgba(37, 211, 102, 0.3);
            transition: all 0.3s ease;
          ">
            💬 WhatsApp
          </a>
          ` : ''}
        </div>
      </div>

      <!-- Submission Info -->
      <div style="text-center; margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; border-top: 3px solid #f7931e;">
        <p style="color: #64748b; font-size: 14px; margin: 0;">
          📅 Submitted on ${new Date(createdAt).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          })}
        </p>
      </div>
    </div>
  `;

  return baseTemplate(content, {
    title: `New Sell With Us Submission - ${name}`,
    preheader: `${name} wants to sell ${brand} ${category} in ${condition} condition`
  });
};

module.exports = sellWithUsNotification;