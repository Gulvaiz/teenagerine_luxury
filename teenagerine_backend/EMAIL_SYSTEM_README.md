# Email System Documentation

## Overview

The email system has been completely refactored to provide a clean, modular, and scalable solution for sending various types of emails to subscribers. The system includes professional email templates with enhanced UI and a robust service architecture.

## Features

### 🎨 Enhanced Email Templates
- **Responsive Design**: Mobile-first approach with dark mode support
- **Professional UI**: Modern gradient backgrounds, beautiful typography, and smooth animations
- **Multiple Template Types**: Newsletter, Welcome, Promotional, Announcement, Unsubscribe
- **Customizable**: Easy to modify colors, content, and layout per template type

### 📧 Email Types Supported

#### 1. Newsletter Template
- General newsletter content
- Featured products section
- Special promotions section
- Social media links
- **Usage**: Regular updates and news

#### 2. Welcome Template  
- Personalized greeting
- Welcome offer with promo code
- Product category showcase
- Customer support information
- **Usage**: New subscriber onboarding

#### 3. Promotional Template
- Eye-catching discount displays
- Featured sale items
- Promo code highlighting
- Countdown timers and urgency
- **Usage**: Sales campaigns and special offers

#### 4. Announcement Template
- Different types: product-launch, event, policy-update, general
- Priority levels: high, normal, low
- Rich media support
- Call-to-action buttons
- **Usage**: Important company updates

#### 5. Unsubscribe Template
- Confirmation message
- Resubscribe option
- Alternative connection methods
- Feedback collection
- **Usage**: Subscription management

## API Endpoints

### Basic Email Campaign
```http
POST /api/subscriptions/send-email
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "subject": "Your Newsletter Subject",
  "content": "<p>Your HTML content here</p>",
  "recipients": "all", // or array of subscriber IDs
  "template": "newsletter", // optional, defaults to "newsletter"
  "templateData": {
    "featuredProducts": [...],
    "promotions": [...]
  }
}
```

### Promotional Campaign
```http
POST /api/subscriptions/send-promotional
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "subject": "🔥 50% Off Everything!",
  "title": "Flash Sale",
  "content": "<p>Limited time offer details</p>",
  "discount": 50,
  "promoCode": "SAVE50",
  "expiryDate": "2024-12-31T23:59:59Z",
  "featuredItems": [
    {
      "name": "Premium Jacket",
      "image": "https://example.com/jacket.jpg",
      "description": "Luxury winter jacket",
      "originalPrice": 200,
      "salePrice": 100,
      "url": "https://shop.example.com/jacket"
    }
  ],
  "callToAction": {
    "text": "Shop Now",
    "url": "https://shop.example.com"
  }
}
```

### Announcement Campaign
```http
POST /api/subscriptions/send-announcement
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "subject": "🚀 New Collection Launch",
  "title": "Spring Collection 2024",
  "content": "<p>We're excited to announce...</p>",
  "type": "product-launch", // general, product-launch, event, policy-update
  "priority": "normal", // high, normal, low
  "images": [
    {
      "src": "https://example.com/collection.jpg",
      "alt": "Spring Collection",
      "caption": "New arrivals for Spring 2024"
    }
  ],
  "callToAction": {
    "text": "Explore Collection",
    "url": "https://shop.example.com/spring2024"
  }
}
```

### Template Preview
```http
POST /api/subscriptions/preview-template
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "template": "promotional",
  "data": {
    "title": "Test Promotion",
    "discount": 25,
    "promoCode": "TEST25"
  }
}
```

## Environment Configuration

Add these variables to your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM="Tangerine Luxury" <newsletter@tangerineluxury.com>

# Admin Configuration  
ADMIN_EMAIL=admin@tangerineluxury.com

# Frontend URL (for unsubscribe links)
FRONTEND_URL=http://localhost:3000
```

## File Structure

```
src/
├── services/
│   ├── emailService.js              # Main email service
│   └── emailTemplates/
│       ├── index.js                 # Template exports
│       ├── base.js                  # Base template with enhanced UI
│       ├── newsletter.js            # Newsletter template
│       ├── welcome.js               # Welcome email template
│       ├── promotional.js           # Promotional campaign template
│       ├── announcement.js          # Announcement template
│       └── unsubscribe.js          # Unsubscribe confirmation
├── controllers/
│   └── subscription.controller.js   # Updated with new methods
└── routes/
    └── subscription.routes.js       # New email endpoints
```

## Key Features

### 🚀 Bulk Email Processing
- Batch processing (50 emails per batch)
- Automatic retry logic
- Detailed success/failure reporting
- Rate limiting to respect email provider limits

### 📱 Mobile Optimization
- Responsive design across all devices
- Touch-friendly buttons and interactions
- Mobile-specific font sizing and spacing
- Optimized image loading

### 🎨 Enhanced UI Components
- Gradient backgrounds and modern design
- Smooth hover animations
- Professional typography hierarchy
- Brand-consistent color schemes
- Dark mode support

### 🛡️ Error Handling
- Graceful fallbacks for email failures
- Comprehensive error logging
- Non-blocking welcome/unsubscribe emails
- Automatic retry mechanisms

## Usage Examples

### Sending a Newsletter
```javascript
// Newsletter with featured products
const newsletterData = {
  subject: "Weekly Fashion Update",
  content: "<p>Check out this week's highlights!</p>",
  recipients: "all",
  templateData: {
    featuredProducts: [
      {
        name: "Designer Dress",
        image: "dress.jpg",
        price: 299,
        url: "/products/dress"
      }
    ]
  }
};
```

### Promotional Campaign
```javascript
// Flash sale promotion
const promoData = {
  subject: "⚡ Flash Sale - 24 Hours Only!",
  title: "Flash Sale",
  discount: 40,
  promoCode: "FLASH40",
  expiryDate: new Date(Date.now() + 24*60*60*1000) // 24 hours
};
```

## Benefits

1. **Separation of Concerns**: Clean architecture with separate template files
2. **Enhanced UI**: Professional, mobile-responsive email designs
3. **Scalability**: Bulk processing with batch management
4. **Maintainability**: Modular template system
5. **Error Resilience**: Comprehensive error handling and logging
6. **Performance**: Optimized for high-volume campaigns
7. **Brand Consistency**: Cohesive design across all email types

## Migration from Old System

The old system has been completely replaced with:
- ✅ Removed inline email creation code
- ✅ Separated email templates into dedicated files
- ✅ Added professional UI with enhanced styling
- ✅ Implemented bulk email processing
- ✅ Added multiple campaign types
- ✅ Improved error handling and reporting

## Best Practices

1. **Preview Before Sending**: Always use the preview endpoint for new templates
2. **Test with Small Groups**: Start with a subset of subscribers for new campaigns
3. **Monitor Results**: Check the success/failure reports after sending
4. **Optimize Images**: Use optimized images for better email performance
5. **Follow Brand Guidelines**: Maintain consistent branding across all templates
6. **Respect Frequency**: Don't overwhelm subscribers with too many emails

## Future Enhancements

- Email scheduling
- A/B testing capabilities
- Advanced analytics and tracking
- Custom template builder
- Subscriber segmentation
- Automated drip campaigns