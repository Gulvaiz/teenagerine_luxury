const Navbar = require('../models/navbar.model');
const { uploadStream } = require('../utils/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'megaMenuImage', maxCount: 1 }
]);

// Middleware to handle file uploads
exports.uploadImages = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Unknown error: ${err.message}` });
    }
    next();
  });
};

exports.getNavbar = async (req, res) => {
  try {
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    res.status(200).json(navbar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateNavbar = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Parse arrays if they are strings
    if (typeof updateData.menuItems === 'string') {
      updateData.menuItems = JSON.parse(updateData.menuItems);
    }
    
    if (typeof updateData.megaMenus === 'string') {
      updateData.megaMenus = JSON.parse(updateData.megaMenus);
    }
    
    // Upload logo to Cloudinary if file exists
    if (req.files && req.files.logo) {
      try {
        const result = await uploadStream(req.files.logo[0].buffer);
        updateData.logo = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Logo upload failed' });
      }
    }

    const navbar = await Navbar.findOne();
    
    if (!navbar) {
      // Create new navbar if it doesn't exist
      const newNavbar = new Navbar(updateData);
      const savedNavbar = await newNavbar.save();
      return res.status(201).json(savedNavbar);
    }
    
    // Update existing navbar
    const updatedNavbar = await Navbar.findByIdAndUpdate(
      navbar._id,
      updateData,
      { new: true }
    );
    
    res.status(200).json(updatedNavbar);
  } catch (error) {
    console.error('Error updating navbar:', error);
    res.status(400).json({ error: error.message });
  }
};

// Menu Item management
exports.addMenuItem = async (req, res) => {
  try {
    const menuItemData = req.body;
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Get the highest order number and add 1
    const highestOrder = navbar.menuItems.length > 0 
      ? Math.max(...navbar.menuItems.map(item => item.order))
      : 0;
    
    // Add the new menu item
    navbar.menuItems.push({
      ...menuItemData,
      order: highestOrder + 1,
      isActive: true
    });
    
    await navbar.save();
    res.status(201).json(navbar);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const updateData = req.body;
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Find the menu item to update
    const menuItemIndex = navbar.menuItems.findIndex(item => item._id.toString() === menuItemId);
    if (menuItemIndex === -1) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // Update the menu item
    navbar.menuItems[menuItemIndex] = { 
      ...navbar.menuItems[menuItemIndex].toObject(), 
      ...updateData 
    };
    
    await navbar.save();
    res.status(200).json(navbar);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Remove the menu item
    navbar.menuItems = navbar.menuItems.filter(item => item._id.toString() !== menuItemId);
    
    // Also remove any mega menu associated with this menu item
    navbar.megaMenus = navbar.megaMenus.filter(menu => menu.menuItemId.toString() !== menuItemId);
    
    // Update order numbers
    navbar.menuItems.forEach((item, index) => {
      item.order = index + 1;
    });
    
    await navbar.save();
    res.status(200).json(navbar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMenuItemOrder = async (req, res) => {
  try {
    const items = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Expected an array of menu items' });
    }
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Create a map of item IDs to their new order
    const orderMap = new Map();
    items.forEach((item, index) => {
      orderMap.set(item._id, index + 1);
    });
    
    // Update the order of each menu item
    navbar.menuItems.forEach(item => {
      if (orderMap.has(item._id.toString())) {
        item.order = orderMap.get(item._id.toString());
      }
    });
    
    // Sort menu items by order
    navbar.menuItems.sort((a, b) => a.order - b.order);
    
    await navbar.save();
    res.status(200).json(navbar);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.toggleMenuItemActive = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Find the menu item to update
    const menuItemIndex = navbar.menuItems.findIndex(item => item._id.toString() === menuItemId);
    if (menuItemIndex === -1) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // Update the menu item's isActive status
    navbar.menuItems[menuItemIndex].isActive = isActive;
    
    await navbar.save();
    res.status(200).json(navbar);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Mega Menu management
exports.addMegaMenu = async (req, res) => {
  try {
    const megaMenuData = { ...req.body };
    
    // Parse categories if it's a string
    if (typeof megaMenuData.categories === 'string') {
      megaMenuData.categories = JSON.parse(megaMenuData.categories);
    }
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Upload image to Cloudinary if file exists
    if (req.files && req.files.megaMenuImage) {
      try {
        const result = await uploadStream(req.files.megaMenuImage[0].buffer);
        megaMenuData.image = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Image upload failed' });
      }
    }
    
    // Check if a mega menu already exists for this menu item
    const existingIndex = navbar.megaMenus.findIndex(
      menu => menu.menuItemId.toString() === megaMenuData.menuItemId
    );
    
    if (existingIndex !== -1) {
      // Update existing mega menu
      navbar.megaMenus[existingIndex] = {
        ...navbar.megaMenus[existingIndex].toObject(),
        ...megaMenuData,
        categories: megaMenuData.categories || navbar.megaMenus[existingIndex].categories
      };
    } else {
      // Add new mega menu
      navbar.megaMenus.push({
        ...megaMenuData,
        categories: megaMenuData.categories || []
      });
      
      // Also update the menu item to indicate it has a mega menu
      const menuItemIndex = navbar.menuItems.findIndex(
        item => item._id.toString() === megaMenuData.menuItemId
      );
      
      if (menuItemIndex !== -1) {
        navbar.menuItems[menuItemIndex].isMegaMenu = true;
      }
    }
    
    await navbar.save();
    res.status(201).json(navbar);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateMegaMenu = async (req, res) => {
  try {
    const { megaMenuId } = req.params;
    const updateData = { ...req.body };
    
    // Parse categories if it's a string
    if (typeof updateData.categories === 'string') {
      updateData.categories = JSON.parse(updateData.categories);
    }
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Upload image to Cloudinary if file exists
    if (req.files && req.files.megaMenuImage) {
      try {
        const result = await uploadStream(req.files.megaMenuImage[0].buffer);
        updateData.image = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Image upload failed' });
      }
    }
    
    // Find the mega menu to update
    const megaMenuIndex = navbar.megaMenus.findIndex(menu => menu._id.toString() === megaMenuId);
    if (megaMenuIndex === -1) {
      return res.status(404).json({ message: 'Mega menu not found' });
    }
    
    // Update the mega menu
    navbar.megaMenus[megaMenuIndex] = { 
      ...navbar.megaMenus[megaMenuIndex].toObject(), 
      ...updateData,
      categories: updateData.categories || navbar.megaMenus[megaMenuIndex].categories
    };
    
    await navbar.save();
    res.status(200).json(navbar);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteMegaMenu = async (req, res) => {
  try {
    const { megaMenuId } = req.params;
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Find the mega menu to delete
    const megaMenu = navbar.megaMenus.find(menu => menu._id.toString() === megaMenuId);
    if (!megaMenu) {
      return res.status(404).json({ message: 'Mega menu not found' });
    }
    
    // Update the corresponding menu item
    const menuItemIndex = navbar.menuItems.findIndex(
      item => item._id.toString() === megaMenu.menuItemId.toString()
    );
    
    if (menuItemIndex !== -1) {
      navbar.menuItems[menuItemIndex].isMegaMenu = false;
    }
    
    // Remove the mega menu
    navbar.megaMenus = navbar.megaMenus.filter(menu => menu._id.toString() !== megaMenuId);
    
    await navbar.save();
    res.status(200).json(navbar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Category management
exports.addCategory = async (req, res) => {
  try {
    const { megaMenuId } = req.params;
    const categoryData = req.body;
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Find the mega menu
    const megaMenuIndex = navbar.megaMenus.findIndex(menu => menu._id.toString() === megaMenuId);
    if (megaMenuIndex === -1) {
      return res.status(404).json({ message: 'Mega menu not found' });
    }
    
    // Get the highest order number and add 1
    const highestOrder = navbar.megaMenus[megaMenuIndex].categories.length > 0 
      ? Math.max(...navbar.megaMenus[megaMenuIndex].categories.map(cat => cat.order))
      : 0;
    
    // Add the new category
    navbar.megaMenus[megaMenuIndex].categories.push({
      ...categoryData,
      order: highestOrder + 1,
      isActive: true
    });
    
    await navbar.save();
    res.status(201).json(navbar);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { megaMenuId, categoryId } = req.params;
    const updateData = req.body;
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Find the mega menu
    const megaMenuIndex = navbar.megaMenus.findIndex(menu => menu._id.toString() === megaMenuId);
    if (megaMenuIndex === -1) {
      return res.status(404).json({ message: 'Mega menu not found' });
    }
    
    // Find the category to update
    const categoryIndex = navbar.megaMenus[megaMenuIndex].categories.findIndex(
      cat => cat._id.toString() === categoryId
    );
    if (categoryIndex === -1) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Update the category
    navbar.megaMenus[megaMenuIndex].categories[categoryIndex] = { 
      ...navbar.megaMenus[megaMenuIndex].categories[categoryIndex].toObject(), 
      ...updateData 
    };
    
    await navbar.save();
    res.status(200).json(navbar);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { megaMenuId, categoryId } = req.params;
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Find the mega menu
    const megaMenuIndex = navbar.megaMenus.findIndex(menu => menu._id.toString() === megaMenuId);
    if (megaMenuIndex === -1) {
      return res.status(404).json({ message: 'Mega menu not found' });
    }
    
    // Remove the category
    navbar.megaMenus[megaMenuIndex].categories = navbar.megaMenus[megaMenuIndex].categories.filter(
      cat => cat._id.toString() !== categoryId
    );
    
    // Update order numbers
    navbar.megaMenus[megaMenuIndex].categories.forEach((cat, index) => {
      cat.order = index + 1;
    });
    
    await navbar.save();
    res.status(200).json(navbar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCategoryOrder = async (req, res) => {
  try {
    const { megaMenuId } = req.params;
    const categories = req.body;
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'Expected an array of categories' });
    }
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Find the mega menu
    const megaMenuIndex = navbar.megaMenus.findIndex(menu => menu._id.toString() === megaMenuId);
    if (megaMenuIndex === -1) {
      return res.status(404).json({ message: 'Mega menu not found' });
    }
    
    // Create a map of category IDs to their new order
    const orderMap = new Map();
    categories.forEach((cat, index) => {
      orderMap.set(cat._id, index + 1);
    });
    
    // Update the order of each category
    navbar.megaMenus[megaMenuIndex].categories.forEach(cat => {
      if (orderMap.has(cat._id.toString())) {
        cat.order = orderMap.get(cat._id.toString());
      }
    });
    
    // Sort categories by order
    navbar.megaMenus[megaMenuIndex].categories.sort((a, b) => a.order - b.order);
    
    await navbar.save();
    res.status(200).json(navbar);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.toggleCategoryActive = async (req, res) => {
  try {
    const { megaMenuId, categoryId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const navbar = await Navbar.findOne();
    if (!navbar) {
      return res.status(404).json({ message: 'Navbar not found' });
    }
    
    // Find the mega menu
    const megaMenuIndex = navbar.megaMenus.findIndex(menu => menu._id.toString() === megaMenuId);
    if (megaMenuIndex === -1) {
      return res.status(404).json({ message: 'Mega menu not found' });
    }
    
    // Find the category to update
    const categoryIndex = navbar.megaMenus[megaMenuIndex].categories.findIndex(
      cat => cat._id.toString() === categoryId
    );
    if (categoryIndex === -1) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Update the category's isActive status
    navbar.megaMenus[megaMenuIndex].categories[categoryIndex].isActive = isActive;
    
    await navbar.save();
    res.status(200).json(navbar);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Seed initial data
exports.seedNavbar = async (req, res) => {
  try {
    const count = await Navbar.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Navbar already exists' });
    }

    const initialNavbar = {
      logo: "/Tangerine-Logo-200px.png",
      searchEnabled: true,
      wishlistEnabled: true,
      cartEnabled: true,
      userEnabled: true,
      menuItems: [
        { name: "Home", url: "/", order: 1, isActive: true, isMegaMenu: false, isHighlighted: false },
        { name: "Just In", url: "/collections", order: 2, isActive: true, isMegaMenu: false, isHighlighted: false },
        { name: "Women", url: "#", order: 3, isActive: true, isMegaMenu: true, isHighlighted: false },
        { name: "Men", url: "#", order: 4, isActive: true, isMegaMenu: true, isHighlighted: false },
        { name: "Kids", url: "#", order: 5, isActive: true, isMegaMenu: true, isHighlighted: false },
        { name: "Services", url: "#", order: 6, isActive: true, isMegaMenu: true, isHighlighted: false },
        { name: "Sale", url: "/sale-items", order: 7, isActive: true, isMegaMenu: false, isHighlighted: true },
        { name: "Contact", url: "/contact", order: 8, isActive: true, isMegaMenu: false, isHighlighted: false },
        { name: "Sell With Us", url: "/sell-with-us", order: 9, isActive: true, isMegaMenu: false, isHighlighted: false }
      ],
      megaMenus: []
    };

    // Create the navbar first to get menu item IDs
    const navbar = new Navbar(initialNavbar);
    await navbar.save();

    // Now add mega menus with the correct menu item IDs
    const womenMenuItem = navbar.menuItems.find(item => item.name === "Women");
    const menMenuItem = navbar.menuItems.find(item => item.name === "Men");
    const kidsMenuItem = navbar.menuItems.find(item => item.name === "Kids");
    const servicesMenuItem = navbar.menuItems.find(item => item.name === "Services");

    if (womenMenuItem) {
      navbar.megaMenus.push({
        menuItemId: womenMenuItem._id,
        isServiceMenu: false,
        categories: [
          { name: "Bags", slug: "women-bags", order: 1, isActive: true },
          { name: "Shoes", slug: "women-shoes", order: 2, isActive: true },
          { name: "Clothing", slug: "women-clothing", order: 3, isActive: true },
          { name: "Accessories", slug: "women-accessories", order: 4, isActive: true },
          { name: "Jewelry", slug: "women-jewelry", order: 5, isActive: true }
        ]
      });
    }

    if (menMenuItem) {
      navbar.megaMenus.push({
        menuItemId: menMenuItem._id,
        isServiceMenu: false,
        categories: [
          { name: "Bags", slug: "men-bags", order: 1, isActive: true },
          { name: "Shoes", slug: "men-shoes", order: 2, isActive: true },
          { name: "Clothing", slug: "men-clothing", order: 3, isActive: true },
          { name: "Accessories", slug: "men-accessories", order: 4, isActive: true },
          { name: "Watches", slug: "men-watches", order: 5, isActive: true }
        ]
      });
    }

    if (kidsMenuItem) {
      navbar.megaMenus.push({
        menuItemId: kidsMenuItem._id,
        isServiceMenu: false,
        categories: [
          { name: "Bags", slug: "kids-bags", order: 1, isActive: true },
          { name: "Shoes", slug: "kids-shoes", order: 2, isActive: true },
          { name: "Clothing", slug: "kids-clothing", order: 3, isActive: true },
          { name: "Accessories", slug: "kids-accessories", order: 4, isActive: true }
        ]
      });
    }

    if (servicesMenuItem) {
      navbar.megaMenus.push({
        menuItemId: servicesMenuItem._id,
        isServiceMenu: true,
        categories: [
          { name: "Authentication", slug: "authentication", order: 1, isActive: true },
          { name: "Bio Cleaning", slug: "bio-cleaning", order: 2, isActive: true },
          { name: "Private Viewing", slug: "private-viewing", order: 3, isActive: true },
          { name: "Request Product", slug: "request-product", order: 4, isActive: true }
        ]
      });
    }

    await navbar.save();
    res.status(201).json({ message: 'Navbar seeded successfully', navbar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};