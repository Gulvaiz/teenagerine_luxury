const express = require('express');
const router = express.Router();
const { 
  getNavbar, 
  updateNavbar, 
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateMenuItemOrder,
  toggleMenuItemActive,
  addMegaMenu,
  updateMegaMenu,
  deleteMegaMenu,
  addCategory,
  updateCategory,
  deleteCategory,
  updateCategoryOrder,
  toggleCategoryActive,
  uploadImages,
  seedNavbar
} = require('../controllers/navbar.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', getNavbar);

// Admin routes
router.post('/seed', protect, restrictTo('admin'), seedNavbar);
router.patch('/', protect, restrictTo('admin'), uploadImages, updateNavbar);

// Menu Item routes
router.post('/menu-items', protect, restrictTo('admin'), addMenuItem);
router.patch('/menu-items/:menuItemId', protect, restrictTo('admin'), updateMenuItem);
router.delete('/menu-items/:menuItemId', protect, restrictTo('admin'), deleteMenuItem);
router.patch('/menu-items-order', protect, restrictTo('admin'), updateMenuItemOrder);
router.patch('/menu-items/:menuItemId/toggle', protect, restrictTo('admin'), toggleMenuItemActive);

// Mega Menu routes
router.post('/mega-menus', protect, restrictTo('admin'), uploadImages, addMegaMenu);
router.patch('/mega-menus/:megaMenuId', protect, restrictTo('admin'), uploadImages, updateMegaMenu);
router.delete('/mega-menus/:megaMenuId', protect, restrictTo('admin'), deleteMegaMenu);

// Category routes
router.post('/mega-menus/:megaMenuId/categories', protect, restrictTo('admin'), addCategory);
router.patch('/mega-menus/:megaMenuId/categories/:categoryId', protect, restrictTo('admin'), updateCategory);
router.delete('/mega-menus/:megaMenuId/categories/:categoryId', protect, restrictTo('admin'), deleteCategory);
router.patch('/mega-menus/:megaMenuId/categories-order', protect, restrictTo('admin'), updateCategoryOrder);
router.patch('/mega-menus/:megaMenuId/categories/:categoryId/toggle', protect, restrictTo('admin'), toggleCategoryActive);

module.exports = router;