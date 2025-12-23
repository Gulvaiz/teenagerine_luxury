const baseTemplate = require('./base');

const sellWithUsConfirmation = (data) => {
  const {
    name,
    brand,
    category,
    condition,
    images = [],
    createdAt
  } = data;

  // Create a simple image preview for customer
  const imagePreviewHtml = images.length > 0 ? `
    <div style="margin: 25px 0;">
      <h3 style="color: #2d3748; font-size: 18px; margin-bottom: 15px;">
        📸 Your Submitted Images (${images.length})
      </h3>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
        ${images.slice(0, 4).map((imageUrl, index) => `
          <div style="flex: 0 0 auto;">
            <img 
              src="${imageUrl}" 
              alt="Your Product Image ${index + 1}"
              style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;"
            />
          </div>
        `).join('')}
        ${images.length > 4 ? `
          <div style="
            width: 120px; 
            height: 120px; 
            background: linear-gradient(135deg, #f7931e 0%, #ff6b35 100%); 
            border-radius: 8px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
          ">
            +${images.length - 4}
          </div>
        ` : ''}
      </div>
    </div>
  ` : '';

  const content = `
    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px 20px; text-align: center; border-radius: 15px 15px 0 0;">
      <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        Submission Received!
      </h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
        Thank you for choosing Tangerine Luxury
      </p>
    </div>

    <div style="padding: 30px;">
      <!-- Welcome Message -->
      <div style="text-align: center; margin-bottom: 35px;">
        <h2 style="color: #2d3748; font-size: 24px; margin: 0 0 15px 0;">
          Hello ${name}! 👋
        </h2>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0;">
          We've successfully received your submission to sell your <strong>${brand} ${category}</strong> 
          and our team is excited to review it!
        </p>
      </div>

      <!-- Submission Summary -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 5px solid #f7931e;">
        <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px;">
          📋 Your Submission Summary
        </h3>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #64748b; font-weight: 500;">Brand:</span>
            <span style="color: #2d3748; font-weight: 600;">${brand}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #64748b; font-weight: 500;">Category:</span>
            <span style="color: #2d3748;">${category}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #64748b; font-weight: 500;">Condition:</span>
            <span style="color: #2d3748; 
              ${condition === 'New' ? 'background: #dcfce7; color: #16a34a;' : 
                condition === 'Like New' ? 'background: #dbeafe; color: #2563eb;' : 
                'background: #fef3cd; color: #f59e0b;'}
              padding: 4px 8px; border-radius: 4px; font-weight: 600;">${condition}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0;">
            <span style="color: #64748b; font-weight: 500;">Submitted:</span>
            <span style="color: #2d3748;">${new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <!-- Images Preview -->
      ${imagePreviewHtml}

      <!-- What Happens Next -->
      <div style="background: linear-gradient(135deg, #fefbff 0%, #f3e8ff 100%); border-radius: 12px; padding: 25px; margin: 30px 0; border-left: 5px solid #a855f7;">
        <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px;">
          🚀 What Happens Next?
        </h3>
        <div style="space-y: 15px;">
          <div style="display: flex; align-items: flex-start; gap: 15px; margin-bottom: 15px;">
            <div style="background: #f7931e; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">1</div>
            <div>
              <h4 style="color: #2d3748; margin: 0 0 5px 0; font-size: 16px;">Expert Review</h4>
              <p style="color: #64748b; margin: 0; font-size: 14px;">Our luxury experts will carefully evaluate your item within 24-48 hours.</p>
            </div>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 15px; margin-bottom: 15px;">
            <div style="background: #22c55e; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">2</div>
            <div>
              <h4 style="color: #2d3748; margin: 0 0 5px 0; font-size: 16px;">Personal Contact</h4>
              <p style="color: #64748b; margin: 0; font-size: 14px;">We'll reach out via phone or email to discuss pricing and next steps.</p>
            </div>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 15px;">
            <div style="background: #3b82f6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">3</div>
            <div>
              <h4 style="color: #2d3748; margin: 0 0 5px 0; font-size: 16px;">Quick Transaction</h4>
              <p style="color: #64748b; margin: 0; font-size: 14px;">Once agreed, we'll arrange for pickup or shipping and process your payment.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact Information -->
      <div style="text-align: center; margin: 30px 0; padding: 25px; background: #f8fafc; border-radius: 12px; border: 2px dashed #e5e7eb;">
        <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px;">
          💬 Questions? We're Here to Help!
        </h3>
        <p style="color: #64748b; margin: 0 0 20px 0;">
          Have questions about your submission? Our team is ready to assist you.
        </p>
        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
          <a href="mailto:consign@tangerineluxury.com" style="
            background: linear-gradient(135deg, #f7931e 0%, #ff6b35 100%);
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            font-size: 14px;
          ">
            📧 Email Us
          </a>
          <a href="tel:+1234567890" style="
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            display: inline-block;
            font-size: 14px;
          ">
            📞 Call Us
          </a>
        </div>
      </div>

      <!-- Footer Message -->
      <div style="text-align: center; margin-top: 40px; padding: 20px; border-top: 2px solid #f1f5f9;">
        <p style="color: #64748b; margin: 0 0 10px 0; font-size: 16px;">
          <strong>Thank you for trusting Tangerine Luxury with your luxury items!</strong>
        </p>
        <p style="color: #94a3b8; margin: 0; font-size: 14px;">
          We look forward to working with you and making this process as smooth as possible.
        </p>
      </div>
    </div>
  `;

  return baseTemplate(content, {
    title: `Submission Received - ${brand} ${category}`,
    preheader: `Thank you ${name}! We've received your ${brand} ${category} submission and will be in touch soon.`
  });
};

module.exports = sellWithUsConfirmation;