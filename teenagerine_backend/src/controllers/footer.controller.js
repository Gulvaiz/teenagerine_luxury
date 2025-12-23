const Footer = require('../models/footer.model');
const { uploadStream } = require('../utils/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('logo');

// Middleware to handle file uploads
exports.uploadImage = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Unknown error: ${err.message}` });
    }
    next();
  });
};

exports.getFooter = async (req, res) => {
  try {
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    res.status(200).json(footer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateFooter = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Parse arrays if they are strings
    if (typeof updateData.contactInfo === 'string') {
      updateData.contactInfo = JSON.parse(updateData.contactInfo);
    }
    
    if (typeof updateData.columns === 'string') {
      updateData.columns = JSON.parse(updateData.columns);
    }
    
    if (typeof updateData.socialLinks === 'string') {
      updateData.socialLinks = JSON.parse(updateData.socialLinks);
    }
    
    // Upload logo to Cloudinary if file exists
    if (req.file) {
      try {
        const result = await uploadStream(req.file.buffer);
        updateData.logo = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Image upload failed' });
      }
    }

    const footer = await Footer.findOne();
    
    if (!footer) {
      // Create new footer if it doesn't exist
      const newFooter = new Footer(updateData);
      const savedFooter = await newFooter.save();
      return res.status(201).json(savedFooter);
    }
    
    // Update existing footer
    const updatedFooter = await Footer.findByIdAndUpdate(
      footer._id,
      updateData,
      { new: true }
    );
    
    res.status(200).json(updatedFooter);
  } catch (error) {
    console.error('Error updating footer:', error);
    res.status(400).json({ error: error.message });
  }
};

// Contact Info management
exports.addContactInfo = async (req, res) => {
  try {
    const contactData = req.body;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Get the highest order number and add 1
    const highestOrder = footer.contactInfo.length > 0 
      ? Math.max(...footer.contactInfo.map(item => item.order))
      : 0;
    
    // Add the new contact info
    footer.contactInfo.push({
      ...contactData,
      order: highestOrder + 1,
      isActive: true
    });
    
    await footer.save();
    res.status(201).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateContactInfo = async (req, res) => {
  try {
    const { contactId } = req.params;
    const updateData = req.body;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Find the contact info to update
    const contactIndex = footer.contactInfo.findIndex(item => item._id.toString() === contactId);
    if (contactIndex === -1) {
      return res.status(404).json({ message: 'Contact info not found' });
    }
    
    // Update the contact info
    footer.contactInfo[contactIndex] = { 
      ...footer.contactInfo[contactIndex].toObject(), 
      ...updateData 
    };
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteContactInfo = async (req, res) => {
  try {
    const { contactId } = req.params;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Remove the contact info
    footer.contactInfo = footer.contactInfo.filter(item => item._id.toString() !== contactId);
    
    // Update order numbers
    footer.contactInfo.forEach((item, index) => {
      item.order = index + 1;
    });
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateContactInfoOrder = async (req, res) => {
  try {
    const items = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Expected an array of items' });
    }
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Create a map of item IDs to their new order
    const orderMap = new Map();
    items.forEach((item, index) => {
      orderMap.set(item._id, index + 1);
    });
    
    // Update the order of each item
    footer.contactInfo.forEach(item => {
      if (orderMap.has(item._id.toString())) {
        item.order = orderMap.get(item._id.toString());
      }
    });
    
    // Sort items by order
    footer.contactInfo.sort((a, b) => a.order - b.order);
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.toggleContactInfoActive = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Find the contact info to update
    const contactIndex = footer.contactInfo.findIndex(item => item._id.toString() === contactId);
    if (contactIndex === -1) {
      return res.status(404).json({ message: 'Contact info not found' });
    }
    
    // Update the contact info's isActive status
    footer.contactInfo[contactIndex].isActive = isActive;
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Footer Column management
exports.addColumn = async (req, res) => {
  try {
    const columnData = req.body;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Get the highest order number and add 1
    const highestOrder = footer.columns.length > 0 
      ? Math.max(...footer.columns.map(col => col.order))
      : 0;
    
    // Add the new column
    footer.columns.push({
      ...columnData,
      links: columnData.links || [],
      order: highestOrder + 1,
      isActive: true
    });
    
    await footer.save();
    res.status(201).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateColumn = async (req, res) => {
  try {
    const { columnId } = req.params;
    const updateData = req.body;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Find the column to update
    const columnIndex = footer.columns.findIndex(col => col._id.toString() === columnId);
    if (columnIndex === -1) {
      return res.status(404).json({ message: 'Column not found' });
    }
    
    // Update the column
    footer.columns[columnIndex] = { 
      ...footer.columns[columnIndex].toObject(), 
      ...updateData 
    };
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteColumn = async (req, res) => {
  try {
    const { columnId } = req.params;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Remove the column
    footer.columns = footer.columns.filter(col => col._id.toString() !== columnId);
    
    // Update order numbers
    footer.columns.forEach((col, index) => {
      col.order = index + 1;
    });
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateColumnOrder = async (req, res) => {
  try {
    const columns = req.body;
    
    if (!Array.isArray(columns)) {
      return res.status(400).json({ error: 'Expected an array of columns' });
    }
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Create a map of column IDs to their new order
    const orderMap = new Map();
    columns.forEach((col, index) => {
      orderMap.set(col._id, index + 1);
    });
    
    // Update the order of each column
    footer.columns.forEach(col => {
      if (orderMap.has(col._id.toString())) {
        col.order = orderMap.get(col._id.toString());
      }
    });
    
    // Sort columns by order
    footer.columns.sort((a, b) => a.order - b.order);
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.toggleColumnActive = async (req, res) => {
  try {
    const { columnId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Find the column to update
    const columnIndex = footer.columns.findIndex(col => col._id.toString() === columnId);
    if (columnIndex === -1) {
      return res.status(404).json({ message: 'Column not found' });
    }
    
    // Update the column's isActive status
    footer.columns[columnIndex].isActive = isActive;
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Footer Link management
exports.addLink = async (req, res) => {
  try {
    const { columnId } = req.params;
    const linkData = req.body;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Find the column
    const columnIndex = footer.columns.findIndex(col => col._id.toString() === columnId);
    if (columnIndex === -1) {
      return res.status(404).json({ message: 'Column not found' });
    }
    
    // Get the highest order number and add 1
    const highestOrder = footer.columns[columnIndex].links.length > 0 
      ? Math.max(...footer.columns[columnIndex].links.map(link => link.order))
      : 0;
    
    // Add the new link
    footer.columns[columnIndex].links.push({
      ...linkData,
      order: highestOrder + 1,
      isActive: true
    });
    
    await footer.save();
    res.status(201).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateLink = async (req, res) => {
  try {
    const { columnId, linkId } = req.params;
    const updateData = req.body;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Find the column
    const columnIndex = footer.columns.findIndex(col => col._id.toString() === columnId);
    if (columnIndex === -1) {
      return res.status(404).json({ message: 'Column not found' });
    }
    
    // Find the link to update
    const linkIndex = footer.columns[columnIndex].links.findIndex(link => link._id.toString() === linkId);
    if (linkIndex === -1) {
      return res.status(404).json({ message: 'Link not found' });
    }
    
    // Update the link
    footer.columns[columnIndex].links[linkIndex] = { 
      ...footer.columns[columnIndex].links[linkIndex].toObject(), 
      ...updateData 
    };
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteLink = async (req, res) => {
  try {
    const { columnId, linkId } = req.params;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Find the column
    const columnIndex = footer.columns.findIndex(col => col._id.toString() === columnId);
    if (columnIndex === -1) {
      return res.status(404).json({ message: 'Column not found' });
    }
    
    // Remove the link
    footer.columns[columnIndex].links = footer.columns[columnIndex].links.filter(link => link._id.toString() !== linkId);
    
    // Update order numbers
    footer.columns[columnIndex].links.forEach((link, index) => {
      link.order = index + 1;
    });
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLinkOrder = async (req, res) => {
  try {
    const { columnId } = req.params;
    const links = req.body;
    
    if (!Array.isArray(links)) {
      return res.status(400).json({ error: 'Expected an array of links' });
    }
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Find the column
    const columnIndex = footer.columns.findIndex(col => col._id.toString() === columnId);
    if (columnIndex === -1) {
      return res.status(404).json({ message: 'Column not found' });
    }
    
    // Create a map of link IDs to their new order
    const orderMap = new Map();
    links.forEach((link, index) => {
      orderMap.set(link._id, index + 1);
    });
    
    // Update the order of each link
    footer.columns[columnIndex].links.forEach(link => {
      if (orderMap.has(link._id.toString())) {
        link.order = orderMap.get(link._id.toString());
      }
    });
    
    // Sort links by order
    footer.columns[columnIndex].links.sort((a, b) => a.order - b.order);
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.toggleLinkActive = async (req, res) => {
  try {
    const { columnId, linkId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Find the column
    const columnIndex = footer.columns.findIndex(col => col._id.toString() === columnId);
    if (columnIndex === -1) {
      return res.status(404).json({ message: 'Column not found' });
    }
    
    // Find the link to update
    const linkIndex = footer.columns[columnIndex].links.findIndex(link => link._id.toString() === linkId);
    if (linkIndex === -1) {
      return res.status(404).json({ message: 'Link not found' });
    }
    
    // Update the link's isActive status
    footer.columns[columnIndex].links[linkIndex].isActive = isActive;
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Social Link management
exports.addSocialLink = async (req, res) => {
  try {
    const socialData = req.body;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Get the highest order number and add 1
    const highestOrder = footer.socialLinks.length > 0 
      ? Math.max(...footer.socialLinks.map(link => link.order))
      : 0;
    
    // Add the new social link
    footer.socialLinks.push({
      ...socialData,
      order: highestOrder + 1,
      isActive: true
    });
    
    await footer.save();
    res.status(201).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateSocialLink = async (req, res) => {
  try {
    const { socialId } = req.params;
    const updateData = req.body;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Find the social link to update
    const socialIndex = footer.socialLinks.findIndex(link => link._id.toString() === socialId);
    if (socialIndex === -1) {
      return res.status(404).json({ message: 'Social link not found' });
    }
    
    // Update the social link
    footer.socialLinks[socialIndex] = { 
      ...footer.socialLinks[socialIndex].toObject(), 
      ...updateData 
    };
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteSocialLink = async (req, res) => {
  try {
    const { socialId } = req.params;
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Remove the social link
    footer.socialLinks = footer.socialLinks.filter(link => link._id.toString() !== socialId);
    
    // Update order numbers
    footer.socialLinks.forEach((link, index) => {
      link.order = index + 1;
    });
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSocialLinkOrder = async (req, res) => {
  try {
    const links = req.body;
    
    // console.log('Received order update request:', links);
    
    if (!Array.isArray(links)) {
      return res.status(400).json({ error: 'Expected an array of social links' });
    }
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Create a map of link IDs to their new order (use the order from request, not index)
    const orderMap = new Map();
    links.forEach((link) => {
      orderMap.set(link._id, link.order); // Use link.order instead of index + 1
    });
    
    // console.log('Order map:', Array.from(orderMap.entries()));
    
    // Update the order of each social link
    footer.socialLinks.forEach(link => {
      if (orderMap.has(link._id.toString())) {
        const newOrder = orderMap.get(link._id.toString());
        // console.log(`Updating ${link.platform} from order ${link.order} to ${newOrder}`);
        link.order = newOrder;
      }
    });
    
    // Sort social links by order
    footer.socialLinks.sort((a, b) => a.order - b.order);
    
    // console.log('Final social links order:', footer.socialLinks.map(l => ({ platform: l.platform, order: l.order })));
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    console.log('Error updating social link order:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.toggleSocialLinkActive = async (req, res) => {
  try {
    const { socialId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const footer = await Footer.findOne();
    if (!footer) {
      return res.status(404).json({ message: 'Footer not found' });
    }
    
    // Find the social link to update
    const socialIndex = footer.socialLinks.findIndex(link => link._id.toString() === socialId);
    if (socialIndex === -1) {
      return res.status(404).json({ message: 'Social link not found' });
    }
    
    // Update the social link's isActive status
    footer.socialLinks[socialIndex].isActive = isActive;
    
    await footer.save();
    res.status(200).json(footer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Seed initial data
exports.seedFooter = async (req, res) => {
  try {
    const count = await Footer.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Footer already exists' });
    }

    const initialFooter = {
      logo: "/Tangerine-Logo-200px.png",
      newsletterTitle: "SIGN UP and get 25% OFF*",
      newsletterDescription: "Sign up to our e-mails to be the first to hear about the latest trends, new arrivals and exclusive offers. Available to customers opting in for the first time or returning to opt in; offer excludes third party branded, promotional and sale items.\nYou can unsubscribe at any time.",
      newsletterButtonText: "Sign me up",
      newsletterEnabled: true,
      contactInfo: [
        {
          type: "phone",
          value: "+91 7042039009, +91 7042029009",
          icon: "faPhone",
          order: 2,
          isActive: true
        },
        {
          type: "email",
          value: "sales@tangerineluxury.com",
          icon: "faEnvelope",
          order: 3,
          isActive: true
        },
        {
          type: "hours",
          value: "Open Time: 11:00 AM - 7:00 PM",
          icon: "faClock",
          order: 4,
          isActive: true
        }
      ],
      columns: [
        {
          title: "ABOUT TANGERINE LUXURY",
          order: 1,
          isActive: true,
          links: [
            { title: "About Us", url: "/about", order: 1, isActive: true },
            { title: "Our Founder", url: "/our-founder", order: 2, isActive: true },
            { title: "Our Mission", url: "/our-mission", order: 3, isActive: true },
            { title: "Why Tangerine Luxury", url: "/why-tangerine-luxury", order: 4, isActive: true },
            { title: "Authenticity", url: "/authentication", order: 5, isActive: true },
            { title: "Product Condition Guidelines", url: "/product-condition-guidelines", order: 6, isActive: true },
            { title: "Terms and Conditions", url: "/terms-and-conditions", order: 7, isActive: true },
            { title: "Orders and Returns", url: "/order-policy", order: 8, isActive: true },
            { title: "Privacy Policy", url: "/privacy-policy", order: 9, isActive: true },
            { title: "Shipping and Delivery", url: "/shipping-and-delivery", order: 10, isActive: true },
            { title: "Contact Us", url: "/contact", order: 11, isActive: true }
          ]
        },
        {
          title: "MY ACCOUNT",
          order: 2,
          isActive: true,
          links: [
            { title: "Sign in", url: "/signin", order: 1, isActive: true },
            { title: "My Wishlist", url: "/wishlist", order: 2, isActive: true },
            { title: "Track My Order", url: "https://www.shiprocket.in/shipment-tracking/", order: 3, isActive: true }
          ]
        },
        {
          title: "FAQ's",
          order: 3,
          isActive: true,
          links: [
            { title: "Buyer's FAQ", url: "/buyer-faq", order: 1, isActive: true },
            { title: "Seller's FAQ", url: "/seller-faq", order: 2, isActive: true },
            { title: "Layaway", url: "/layaway", order: 3, isActive: true },
            { title: "TL Elite", url: "/tl-elite", order: 4, isActive: true }
          ]
        }
      ],
      socialLinks: [
        { platform: "Facebook", url: "https://www.facebook.com/tangerineluxury", icon: "faFacebook", order: 1, isActive: true },
        { platform: "Twitter", url: "https://twitter.com/tangerineluxury", icon: "faTwitter", order: 2, isActive: true },
        { platform: "Instagram", url: "https://www.instagram.com/tangerineluxury", icon: "faInstagram", order: 3, isActive: true },
        { platform: "YouTube", url: "https://www.youtube.com/tangerineluxury", icon: "faYoutube", order: 4, isActive: true },
        { platform: "Pinterest", url: "https://www.pinterest.com/tangerineluxury", icon: "faPinterest", order: 5, isActive: true }
      ],
      copyrightText: "© 2023 Tangerine Luxury. All rights reserved."
    };

    const footer = new Footer(initialFooter);
    await footer.save();
    res.status(201).json({ message: 'Footer seeded successfully', footer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};