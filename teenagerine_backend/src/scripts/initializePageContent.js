const mongoose = require('mongoose');
const Content = require('../models/content.model');
require('dotenv').config();

// Default admin user ID - replace with a real admin ID from your database
const ADMIN_ID = '6000000000000000000000aa';

// Content for each page
const pageContents = [
  {
    type: 'product-condition-guidelines',
    title: 'Product Condition Guidelines',
    content: `
<div class="bg-gradient-to-b from-white to-orange-50 py-24">
  <div class="max-w-6xl mx-auto px-6">
    <h1 class="text-5xl font-bold text-center mb-16 text-gray-800 tracking-tight">
      PRODUCT CONDITION GUIDELINES
    </h1>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
      <div class="bg-white shadow-xl rounded-2xl overflow-hidden">
        <div class="relative h-72 overflow-hidden">
          <img
            src="https://tangerineluxury.com/media/wp-content/uploads/2023/11/with-tags-1024x1024.jpg"
            alt="New With Tags"
            class="w-full h-full object-cover object-center"
          />
        </div>
        <div class="p-6">
          <h2 class="text-2xl font-bold mb-4 text-gray-800 border-b-4 border-orange-500 pb-2">
            New With Tags
          </h2>
          <p class="text-gray-600 leading-relaxed">
            Products under the Condition New, have never been used. They come with tags, packaging and dustbags.
          </p>
        </div>
      </div>
      
      <div class="bg-white shadow-xl rounded-2xl overflow-hidden">
        <div class="relative h-72 overflow-hidden">
          <img
            src="https://tangerineluxury.com/media/wp-content/uploads/2023/11/without-tags-1-1024x1024.jpg"
            alt="New Without Tags"
            class="w-full h-full object-cover object-center"
          />
        </div>
        <div class="p-6">
          <h2 class="text-2xl font-bold mb-4 text-gray-800 border-b-4 border-orange-500 pb-2">
            New Without Tags
          </h2>
          <p class="text-gray-600 leading-relaxed">
            Products under this category are new, have never been used or worn. They are in mint condition. Tags might be missing.
          </p>
        </div>
      </div>
      
      <div class="bg-white shadow-xl rounded-2xl overflow-hidden">
        <div class="relative h-72 overflow-hidden">
          <img
            src="https://tangerineluxury.com/media/wp-content/uploads/2023/11/pristine-1-1024x1024.jpg"
            alt="Pristine"
            class="w-full h-full object-cover object-center"
          />
        </div>
        <div class="p-6">
          <h2 class="text-2xl font-bold mb-4 text-gray-800 border-b-4 border-orange-500 pb-2">
            Pristine
          </h2>
          <p class="text-gray-600 leading-relaxed">
            Products are as good as new with insignificant sign of usage or no visible sign of usage. They are in pristine condition.
          </p>
        </div>
      </div>
      
      <div class="bg-white shadow-xl rounded-2xl overflow-hidden">
        <div class="relative h-72 overflow-hidden">
          <img
            src="https://tangerineluxury.com/media/wp-content/uploads/2023/11/fasdasd111111-1-1-1-1-1024x682.jpg"
            alt="Good Condition"
            class="w-full h-full object-cover object-center"
          />
        </div>
        <div class="p-6">
          <h2 class="text-2xl font-bold mb-4 text-gray-800 border-b-4 border-orange-500 pb-2">
            Good Condition
          </h2>
          <p class="text-gray-600 leading-relaxed">
            Products under this condition are previously worn with minor or no visible flaws and/or no significant wear & tear.
          </p>
        </div>
      </div>
      
      <div class="bg-white shadow-xl rounded-2xl overflow-hidden">
        <div class="relative h-72 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1611010344444-5f9e4d86a6e1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=764&q=80"
            alt="Gently Used"
            class="w-full h-full object-cover object-center"
          />
        </div>
        <div class="p-6">
          <h2 class="text-2xl font-bold mb-4 text-gray-800 border-b-4 border-orange-500 pb-2">
            Gently Used
          </h2>
          <p class="text-gray-600 leading-relaxed">
            Products under this condition are previously worn with minor visible flaws and little wear & tear.
          </p>
        </div>
      </div>
      
      <div class="bg-white shadow-xl rounded-2xl overflow-hidden">
        <div class="relative h-72 overflow-hidden">
          <img
            src="https://tangerineluxury.com/media/wp-content/uploads/2023/11/good-condition-1024x1024.jpg"
            alt="Used Fairly Well"
            class="w-full h-full object-cover object-center"
          />
        </div>
        <div class="p-6">
          <h2 class="text-2xl font-bold mb-4 text-gray-800 border-b-4 border-orange-500 pb-2">
            Used Fairly Well
          </h2>
          <p class="text-gray-600 leading-relaxed">
            Products under this category are fairly used and have some signs of usage. Some fading or cracks on the products are visible.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
    `
  },
  {
    type: 'terms-and-conditions',
    title: 'Terms and Conditions',
    content: `
<div class="container mx-auto px-6 py-24">
  <h1 class="text-4xl font-bold text-center mb-8">Terms and Conditions</h1>
  
  <div class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-800 mb-4">User Terms</h2>
    <p class="text-lg text-gray-700">
      The subscriber is not expected to breach any laws by complying with conditions.<br>
      In the event of a conflict between such Terms and these Terms & Conditions of Use, the Terms shall govern.<br><br>
      Any modification to the terms and conditions of this website shall be effective as of the date and time of its publication as a part hereof, and shall be deemed given to the user upon such publication.<br><br>
      You have agreed to the updated Terms if you continue to use the service after any such changes.<br><br>
      The brands whose used and refurbished products are sold on or through www.tangerineluxury.com are not affiliated with Tangerine luxury in any way.
    </p>
  </div>
  
  <div class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-800 mb-4">Terms and Conditions</h2>
    <p class="text-lg text-gray-700">
      According to the Information Technology Act of 2000, these "Terms & Conditions of Use" are an electronic record.<br><br>
      The Information Technology Act of 2000's Section 2(1)(w) defines us as an "intermediary," and this is what we do.<br><br>
      This Agreement is published in accordance with the requirements of Rule 3 (1) of the Information Technology (Intermediaries guidelines) Rules, 2011, which mandates the publication of the terms for accessing or using the services as well as the rules and regulations, privacy policy, and other related information.<br><br>
      The terms "User," "Client," "You" and "Your" refer to the user who accesses this website and agrees to be bound by the terms and conditions of Tangerine Luxury.<br><br>
      In accordance with and subject to applicable Indian law, all terms refer to the offer, acceptance, and consideration of payment necessary to carry out the process of our assistance to the User/Client in the most appropriate manner to satisfy the Client's specific needs for provision of the Tangerine Luxury's stated services.
    </p>
  </div>
  
  <div class="mb-8">
    <h2 class="text-2xl font-semibold text-gray-800 mb-4">Company Model</h2>
    <p class="text-lg text-gray-700">
      Tangerine luxury is your go-to source for previously owned and refurbished goods (apparel and accessories) that go through a rigorous procedure encompassing inspection, verification, and refurbishing to assure successful reuse. The company will plant one tree and maintain it for three years for every 50 goods sold as part of its contribution to environmental protection.<br><br>
      The linear "take-make-waste" approach is replaced by the circular "close-the-loop" model, which calls for each product to be ethically used and to have a responsible usage and end-of-life.
    </p>
  </div>
  
  <!-- Additional sections omitted for brevity -->
</div>
    `
  },
  {
    type: 'order-policy',
    title: 'Order Policy',
    content: `
<div class="container mx-auto px-6 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Order Policy</h1>
  
  <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
    <h2 class="text-2xl font-semibold mb-4">Order Processing</h2>
    <p class="mb-6">
      All orders are processed within 1-2 business days after payment confirmation. You will receive an order confirmation email with your order details and tracking information once your order has been processed.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Payment Methods</h2>
    <p class="mb-6">
      We accept all major credit cards, PayPal, and bank transfers. All payments are processed securely through our payment gateway. Your payment information is never stored on our servers.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Shipping</h2>
    <p class="mb-6">
      We offer standard shipping (3-5 business days), express shipping (1-2 business days), and same-day delivery in select areas. International orders typically take 7-14 business days for delivery. Additional customs fees may apply for international orders.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Order Cancellation</h2>
    <p class="mb-6">
      Orders can be cancelled within 24 hours of placement. Please contact our customer service team to request a cancellation. Orders that have already been shipped cannot be cancelled.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Returns & Exchanges</h2>
    <p class="mb-6">
      We offer a 30-day return policy for most items. Products must be in their original condition with all tags attached. Please see our Returns page for more details.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Backorders</h2>
    <p class="mb-6">
      If an item is on backorder, we will notify you and provide an estimated delivery date. You may choose to wait or cancel your order.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Pre-Orders</h2>
    <p class="mb-6">
      Pre-ordered items will be shipped as soon as they become available. Your card will be charged at the time of order placement.
    </p>
  </div>
</div>
    `
  },
  {
    type: 'privacy-policy',
    title: 'Privacy Policy',
    content: `
<div class="container mx-auto px-6 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Privacy Policy</h1>
  
  <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
    <p class="mb-6">
      Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Information We Collect</h2>
    <p class="mb-6">
      We collect information you provide directly to us, such as your name, address, email, and payment information when you register, make a purchase, or sign up for our newsletter. We also automatically collect certain information about your device and how you interact with our website.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">How We Use Your Information</h2>
    <p class="mb-6">
      We use the information we collect to provide, maintain, and improve our services, process transactions, send communications, and for other legitimate business purposes. This includes:
      <ul class="list-disc pl-6 mt-2">
        <li>Processing and fulfilling your orders</li>
        <li>Sending order confirmations and updates</li>
        <li>Responding to your comments, questions, and requests</li>
        <li>Sending promotional communications</li>
        <li>Improving our website and services</li>
      </ul>
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Information Sharing</h2>
    <p class="mb-6">
      We may share your information with third-party service providers who perform services on our behalf, such as payment processing and delivery. We may also share information when required by law or to protect our rights.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Data Security</h2>
    <p class="mb-6">
      We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Cookies</h2>
    <p class="mb-6">
      We use cookies to enhance your experience on our website. You can set your browser to refuse all or some browser cookies, but this may prevent you from accessing certain features of our website.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Your Rights</h2>
    <p class="mb-6">
      You have the right to access, correct, or delete your personal information. You may also opt out of receiving promotional communications from us by following the instructions in those communications.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Changes to This Privacy Policy</h2>
    <p class="mb-6">
      We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Contact Us</h2>
    <p class="mb-6">
      If you have any questions about this Privacy Policy, please contact us at privacy@tangerineluxury.com.
    </p>
  </div>
</div>
    `
  },
  {
    type: 'shipping-and-delivery',
    title: 'Shipping & Delivery',
    content: `
<div class="container mx-auto px-6 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Shipping & Delivery</h1>
  
  <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
    <h2 class="text-2xl font-semibold mb-4">Domestic Shipping</h2>
    <p class="mb-6">
      We offer the following shipping options for domestic orders:
      <ul class="list-disc pl-6 mt-2">
        <li><strong>Standard Shipping:</strong> 3-5 business days (₹99)</li>
        <li><strong>Express Shipping:</strong> 1-2 business days (₹199)</li>
        <li><strong>Same-Day Delivery:</strong> Available in select areas (₹299)</li>
      </ul>
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">International Shipping</h2>
    <p class="mb-6">
      International orders typically take 7-14 business days for delivery. Shipping costs vary by location. Additional customs fees may apply and are the responsibility of the customer.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Order Tracking</h2>
    <p class="mb-6">
      Once your order ships, you will receive a tracking number via email to monitor your package's progress. You can also track your order by logging into your account and navigating to the "Order History" section.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Delivery Issues</h2>
    <p class="mb-6">
      If you experience any issues with your delivery, please contact our customer service team within 48 hours of the scheduled delivery date. We will work with our shipping partners to resolve any problems as quickly as possible.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Free Shipping</h2>
    <p class="mb-6">
      Orders over ₹5,000 qualify for free standard shipping within India. International orders over ₹15,000 qualify for free standard international shipping.
    </p>
    
    <h2 class="text-2xl font-semibold mb-4">Shipping Restrictions</h2>
    <p class="mb-6">
      We currently do not ship to certain countries due to shipping restrictions. Please contact our customer service team to confirm if we ship to your location.
    </p>
  </div>
</div>
    `
  },
  {
    type: 'buyer-faq',
    title: 'Buyer FAQ',
    content: `
<div class="container mx-auto px-6 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Buyer Frequently Asked Questions</h1>
  
  <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">How do I create an account?</h2>
      <p>
        Click on the "Sign Up" button in the top right corner of our website. Fill in your details and follow the instructions to create your account.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">How can I track my order?</h2>
      <p>
        You can track your order by logging into your account and navigating to the "Order History" section. Click on the specific order to view its tracking information.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">What payment methods do you accept?</h2>
      <p>
        We accept major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">Can I change or cancel my order?</h2>
      <p>
        Orders can be changed or cancelled within 24 hours of placement. Please contact our customer service team as soon as possible.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">What is your return policy?</h2>
      <p>
        We offer a 30-day return policy for most items. Products must be in their original condition with all tags attached. Please see our Returns page for more details.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">Do you offer international shipping?</h2>
      <p>
        Yes, we ship to most countries worldwide. Shipping costs and delivery times vary by location.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">How do I know if a product is authentic?</h2>
      <p>
        All products on our platform go through a rigorous authentication process before being listed. We guarantee the authenticity of every item we sell.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">What if I receive a damaged item?</h2>
      <p>
        If you receive a damaged item, please contact our customer service team within 48 hours of delivery with photos of the damage. We will arrange for a return or replacement.
      </p>
    </div>
  </div>
</div>
    `
  },
  {
    type: 'seller-faq',
    title: 'Seller FAQ',
    content: `
<div class="container mx-auto px-6 py-12">
  <h1 class="text-4xl font-bold text-center mb-8">Seller Frequently Asked Questions</h1>
  
  <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">How do I become a seller on Tangerine Luxury?</h2>
      <p>
        To become a seller, click on the "Sell With Us" link at the bottom of our homepage. Fill out the application form and our team will review your submission.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">What types of products can I sell?</h2>
      <p>
        We accept luxury fashion items, accessories, jewelry, and home decor. All items must be authentic and meet our quality standards.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">How do I list my products?</h2>
      <p>
        Once approved as a seller, you can log into your seller dashboard and click "Add New Product." Fill in all required information and upload high-quality images.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">What are the seller fees?</h2>
      <p>
        We charge a 15% commission on each sale. There are no listing fees or monthly subscription costs.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">When will I get paid?</h2>
      <p>
        Payments are processed 7 days after an order is delivered and confirmed by the buyer. Funds are transferred to your designated bank account.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">How do I handle returns?</h2>
      <p>
        Returns are managed by our customer service team. If a return is approved, the item will be sent back to you, and the sale amount will be deducted from your next payment.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">How is my product authenticated?</h2>
      <p>
        Our authentication team will verify the authenticity of your product using a combination of physical inspection, documentation review, and brand-specific authentication techniques.
      </p>
    </div>
    
    <div class="mb-6">
      <h2 class="text-2xl font-semibold mb-2">What happens if my product doesn't sell?</h2>
      <p>
        If your product doesn't sell within 90 days, you can choose to lower the price, keep it listed, or have it returned to you (shipping fees may apply).
      </p>
    </div>
  </div>
</div>
    `
  }
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
    // Convert admin ID string to ObjectId
    const adminId = mongoose.Types.ObjectId(ADMIN_ID);
    
    for (const content of pageContents) {
      // Check if content already exists
      const existingContent = await Content.findOne({ type: content.type });
      
      if (!existingContent) {
        // Create new content
        await Content.create({
          ...content,
          updatedBy: adminId,
          lastUpdated: new Date()
        });
        console.log(`Created content for ${content.type}`);
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