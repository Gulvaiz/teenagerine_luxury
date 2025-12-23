const mongoose = require('mongoose');
const Content = require('../models/content.model');
require('dotenv').config();

// Default content for each page
const defaultContent = [
  {
    type: 'product-condition-guidelines',
    title: 'Product Condition Guidelines',
    content: `
      <h1>Product Condition Guidelines</h1>
      <p>At Tangerine Luxury, we take pride in offering high-quality products. Our condition ratings help you understand the exact state of each item.</p>
      
      <h2>New</h2>
      <p>Item is brand new, unused, and in original packaging with all tags attached.</p>
      
      <h2>Pristine</h2>
      <p>Item appears new and shows no signs of wear. May not include original packaging or tags.</p>
      
      <h2>Good</h2>
      <p>Item shows minimal signs of wear. Minor imperfections may be present but are not noticeable from a distance.</p>
      
      <h2>Average</h2>
      <p>Item shows moderate signs of wear consistent with regular use. Imperfections are visible but don't affect functionality.</p>
      
      <h2>Used</h2>
      <p>Item shows significant signs of wear. May have visible marks, scratches, or other imperfections.</p>
      
      <h2>Refurbished</h2>
      <p>Item has been professionally restored to working order. May have cosmetic imperfections.</p>
      
      <h2>Open-Box</h2>
      <p>Item is in excellent condition but packaging has been opened. All original accessories are included.</p>
    `,
  },
  {
    type: 'terms-and-conditions',
    title: 'Terms and Conditions',
    content: `
      <h1>Terms and Conditions</h1>
      <p>Welcome to Tangerine Luxury. By accessing or using our website, you agree to be bound by these Terms and Conditions.</p>
      
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using our website, you agree to be bound by these Terms and Conditions and all applicable laws and regulations.</p>
      
      <h2>2. Use License</h2>
      <p>Permission is granted to temporarily download one copy of the materials on Tangerine Luxury's website for personal, non-commercial transitory viewing only.</p>
      
      <h2>3. Disclaimer</h2>
      <p>The materials on Tangerine Luxury's website are provided on an 'as is' basis. Tangerine Luxury makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.</p>
      
      <h2>4. Limitations</h2>
      <p>In no event shall Tangerine Luxury or its suppliers be liable for any damages arising out of the use or inability to use the materials on Tangerine Luxury's website.</p>
      
      <h2>5. Revisions</h2>
      <p>Tangerine Luxury may revise these terms of service for its website at any time without notice.</p>
    `,
  },
  {
    type: 'order-policy',
    title: 'Order Policy',
    content: `
      <h1>Order Policy</h1>
      <p>Thank you for shopping with Tangerine Luxury. Please review our order policies below.</p>
      
      <h2>Order Processing</h2>
      <p>Orders are typically processed within 1-2 business days. You will receive a confirmation email once your order has been processed.</p>
      
      <h2>Payment</h2>
      <p>We accept major credit cards, PayPal, and bank transfers. Payment is required at the time of purchase.</p>
      
      <h2>Cancellations</h2>
      <p>Orders can be cancelled within 24 hours of placement. Please contact our customer service team to request a cancellation.</p>
      
      <h2>Backorders</h2>
      <p>If an item is on backorder, we will notify you and provide an estimated delivery date. You may choose to wait or cancel your order.</p>
      
      <h2>Pre-Orders</h2>
      <p>Pre-ordered items will be shipped as soon as they become available. Your card will be charged at the time of order placement.</p>
    `,
  },
  {
    type: 'privacy-policy',
    title: 'Privacy Policy',
    content: `
      <h1>Privacy Policy</h1>
      <p>Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.</p>
      
      <h2>Information Collection</h2>
      <p>We collect information you provide directly to us, such as your name, address, email, and payment information when you register, make a purchase, or sign up for our newsletter.</p>
      
      <h2>Use of Information</h2>
      <p>We use the information we collect to provide, maintain, and improve our services, process transactions, send communications, and for other legitimate business purposes.</p>
      
      <h2>Information Sharing</h2>
      <p>We may share your information with third-party service providers who perform services on our behalf, such as payment processing and delivery.</p>
      
      <h2>Data Security</h2>
      <p>We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.</p>
      
      <h2>Cookies</h2>
      <p>We use cookies to enhance your experience on our website. You can set your browser to refuse all or some browser cookies.</p>
    `,
  },
  {
    type: 'shipping-and-delivery',
    title: 'Shipping and Delivery',
    content: `
      <h1>Shipping and Delivery</h1>
      <p>Tangerine Luxury offers various shipping options to meet your needs.</p>
      
      <h2>Domestic Shipping</h2>
      <p>We offer standard shipping (3-5 business days), express shipping (1-2 business days), and same-day delivery in select areas.</p>
      
      <h2>International Shipping</h2>
      <p>International orders typically take 7-14 business days for delivery. Additional customs fees may apply.</p>
      
      <h2>Tracking</h2>
      <p>Once your order ships, you will receive a tracking number via email to monitor your package's progress.</p>
      
      <h2>Delivery Issues</h2>
      <p>If you experience any issues with your delivery, please contact our customer service team within 48 hours of the scheduled delivery date.</p>
      
      <h2>Free Shipping</h2>
      <p>Orders over $200 qualify for free standard shipping within the continental United States.</p>
    `,
  },
  {
    type: 'buyer-faq',
    title: 'Buyer FAQ',
    content: `
      <h1>Buyer Frequently Asked Questions</h1>
      
      <h2>How do I create an account?</h2>
      <p>Click on the "Sign Up" button in the top right corner of our website. Fill in your details and follow the instructions to create your account.</p>
      
      <h2>How can I track my order?</h2>
      <p>You can track your order by logging into your account and navigating to the "Order History" section. Click on the specific order to view its tracking information.</p>
      
      <h2>What payment methods do you accept?</h2>
      <p>We accept major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers.</p>
      
      <h2>Can I change or cancel my order?</h2>
      <p>Orders can be changed or cancelled within 24 hours of placement. Please contact our customer service team as soon as possible.</p>
      
      <h2>What is your return policy?</h2>
      <p>We offer a 30-day return policy for most items. Products must be in their original condition with all tags attached. Please see our Returns page for more details.</p>
      
      <h2>Do you offer international shipping?</h2>
      <p>Yes, we ship to most countries worldwide. Shipping costs and delivery times vary by location.</p>
    `,
  },
  {
    type: 'seller-faq',
    title: 'Seller FAQ',
    content: `
      <h1>Seller Frequently Asked Questions</h1>
      
      <h2>How do I become a seller on Tangerine Luxury?</h2>
      <p>To become a seller, click on the "Sell With Us" link at the bottom of our homepage. Fill out the application form and our team will review your submission.</p>
      
      <h2>What types of products can I sell?</h2>
      <p>We accept luxury fashion items, accessories, jewelry, and home decor. All items must be authentic and meet our quality standards.</p>
      
      <h2>How do I list my products?</h2>
      <p>Once approved as a seller, you can log into your seller dashboard and click "Add New Product." Fill in all required information and upload high-quality images.</p>
      
      <h2>What are the seller fees?</h2>
      <p>We charge a 15% commission on each sale. There are no listing fees or monthly subscription costs.</p>
      
      <h2>When will I get paid?</h2>
      <p>Payments are processed 7 days after an order is delivered and confirmed by the buyer. Funds are transferred to your designated bank account.</p>
      
      <h2>How do I handle returns?</h2>
      <p>Returns are managed by our customer service team. If a return is approved, the item will be sent back to you, and the sale amount will be deducted from your next payment.</p>
    `,
  },
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    initializeContent();
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

// Initialize content
async function initializeContent() {
  try {
    // Create admin user ID (replace with an actual admin ID from your database)
    const adminId = mongoose.Types.ObjectId('6000000000000000000000aa');
    
    for (const content of defaultContent) {
      // Check if content already exists
      const existingContent = await Content.findOne({ type: content.type });
      
      if (!existingContent) {
        // Create new content
        await Content.create({
          ...content,
          updatedBy: adminId,
          lastUpdated: new Date()
        });
        console.log(`Created default content for ${content.type}`);
      } else {
        console.log(`Content for ${content.type} already exists, skipping`);
      }
    }
    
    console.log('Content initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing content:', error);
    process.exit(1);
  }
}