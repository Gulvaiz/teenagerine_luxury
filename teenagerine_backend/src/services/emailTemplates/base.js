// Base email template with enhanced UI
const baseTemplate = (content, options = {}) => {
  const {
    title = 'Tangerine Luxury',
    preheader = '',
    headerColor = '#FF6B35',
    backgroundColor = '#f8f9fa',
    showFooter = true,
    showSocialLinks = true
  } = options;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${title}</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
      <style>
        /* Reset styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          line-height: 1.6;
          color: #333333;
          background-color: ${backgroundColor};
          margin: 0;
          padding: 0;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        
        table {
          border-collapse: collapse;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .email-header {
          background: linear-gradient(135deg, ${headerColor} 0%, #FF8A50 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        
        .email-header h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.5px;
        }
        
        .email-header .tagline {
          font-size: 14px;
          margin-top: 8px;
          opacity: 0.9;
          font-weight: 300;
        }
        
        .email-body {
          padding: 40px 30px;
        }
        
        .email-content {
          font-size: 16px;
          line-height: 1.8;
          color: #444444;
        }
        
        .email-content h2 {
          color: #222222;
          font-size: 24px;
          font-weight: 600;
          margin: 30px 0 20px 0;
          line-height: 1.3;
        }
        
        .email-content h3 {
          color: #333333;
          font-size: 20px;
          font-weight: 600;
          margin: 25px 0 15px 0;
          line-height: 1.4;
        }
        
        .email-content p {
          margin: 0 0 20px 0;
        }
        
        .email-content ul {
          margin: 20px 0;
          padding-left: 30px;
        }
        
        .email-content li {
          margin: 8px 0;
        }
        
        .btn {
          display: inline-block;
          padding: 16px 32px;
          background: linear-gradient(135deg, ${headerColor} 0%, #FF8A50 100%);
          color: white !important;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 20px 0;
          transition: all 0.3s ease;
          border: none;
          box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
        }
        
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
        }
        
        .btn-secondary {
          background: #6c757d;
          box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
        }
        
        .divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #e0e0e0, transparent);
          margin: 40px 0;
        }
        
        .highlight-box {
          background: linear-gradient(135deg, #f8f9ff 0%, #fff5f0 100%);
          border-left: 4px solid ${headerColor};
          padding: 25px;
          margin: 25px 0;
          border-radius: 8px;
        }
        
        .email-footer {
          background-color: #2c3e50;
          color: #bdc3c7;
          padding: 40px 30px;
          text-align: center;
          font-size: 14px;
        }
        
        .email-footer a {
          color: #3498db;
          text-decoration: none;
        }
        
        .social-links {
          margin: 20px 0;
        }
        
        .social-links a {
          display: inline-block;
          margin: 0 10px;
          width: 40px;
          height: 40px;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          text-align: center;
          line-height: 40px;
          color: #bdc3c7;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        
        .social-links a:hover {
          background-color: ${headerColor};
          color: white;
          transform: translateY(-2px);
        }
        
        .unsubscribe {
          font-size: 12px;
          color: #95a5a6;
          margin-top: 20px;
        }
        
        .unsubscribe a {
          color: #95a5a6;
          text-decoration: underline;
        }
        
        /* Mobile Responsive */
        @media only screen and (max-width: 600px) {
          .email-container {
            margin: 10px;
            border-radius: 8px;
          }
          
          .email-header {
            padding: 30px 20px;
          }
          
          .email-header h1 {
            font-size: 24px;
          }
          
          .email-body {
            padding: 30px 20px;
          }
          
          .email-content {
            font-size: 15px;
          }
          
          .email-content h2 {
            font-size: 22px;
          }
          
          .email-content h3 {
            font-size: 18px;
          }
          
          .btn {
            display: block;
            width: 100%;
            padding: 18px;
          }
          
          .email-footer {
            padding: 30px 20px;
          }
          
          .social-links a {
            width: 35px;
            height: 35px;
            line-height: 35px;
            margin: 0 8px;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .email-container {
            background-color: #1a1a1a !important;
          }
          
          .email-content {
            color: #e0e0e0 !important;
          }
          
          .email-content h2,
          .email-content h3 {
            color: #ffffff !important;
          }
          
          .highlight-box {
            background: linear-gradient(135deg, #2a2a3a 0%, #3a2a2a 100%) !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- Preheader text -->
      ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
      
      <div style="background-color: ${backgroundColor}; padding: 20px 0;">
        <div class="email-container">
          <!-- Header -->
          <div class="email-header">
            <h1>Tangerine Luxury</h1>
            <div class="tagline">Premium Fashion & Lifestyle</div>
          </div>
          
          <!-- Body Content -->
          <div class="email-body">
            <div class="email-content">
              ${content}
            </div>
          </div>
          
          ${showFooter ? `
          <!-- Footer -->
          <div class="email-footer">
            ${showSocialLinks ? `
            <div class="social-links">
              <a href="#" title="Facebook">📘</a>
              <a href="#" title="Instagram">📷</a>
              <a href="#" title="Twitter">🐦</a>
              <a href="#" title="Pinterest">📌</a>
            </div>
            ` : ''}
            
            <p style="margin: 0;">
              <strong>Tangerine Luxury</strong><br>
              Premium Fashion & Lifestyle<br>
              <a href="mailto:info@tangerineluxury.com">info@tangerineluxury.com</a>
            </p>
            
            <div class="unsubscribe">
              <p>
                You received this email because you subscribed to our newsletter.<br>
                <a href="{{unsubscribe_url}}">Unsubscribe</a> | 
                <a href="{{preferences_url}}">Manage Preferences</a>
              </p>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = baseTemplate;