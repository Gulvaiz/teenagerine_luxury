const express = require('express');
const router = express.Router();
const { 
  getFooter, 
  updateFooter, 
  addContactInfo,
  updateContactInfo,
  deleteContactInfo,
  updateContactInfoOrder,
  toggleContactInfoActive,
  addColumn,
  updateColumn,
  deleteColumn,
  updateColumnOrder,
  toggleColumnActive,
  addLink,
  updateLink,
  deleteLink,
  updateLinkOrder,
  toggleLinkActive,
  addSocialLink,
  updateSocialLink,
  deleteSocialLink,
  updateSocialLinkOrder,
  toggleSocialLinkActive,
  uploadImage,
  seedFooter
} = require('../controllers/footer.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', getFooter);

// Admin routes
router.post('/seed', protect, restrictTo('admin'), seedFooter);
router.patch('/', protect, restrictTo('admin'), uploadImage, updateFooter);

// Contact Info routes
router.post('/contact-info', protect, restrictTo('admin'), addContactInfo);
router.patch('/contact-info/:contactId', protect, restrictTo('admin'), updateContactInfo);
router.delete('/contact-info/:contactId', protect, restrictTo('admin'), deleteContactInfo);
router.patch('/contact-info-order', protect, restrictTo('admin'), updateContactInfoOrder);
router.patch('/contact-info/:contactId/toggle', protect, restrictTo('admin'), toggleContactInfoActive);

// Column routes
router.post('/columns', protect, restrictTo('admin'), addColumn);
router.patch('/columns/:columnId', protect, restrictTo('admin'), updateColumn);
router.delete('/columns/:columnId', protect, restrictTo('admin'), deleteColumn);
router.patch('/columns-order', protect, restrictTo('admin'), updateColumnOrder);
router.patch('/columns/:columnId/toggle', protect, restrictTo('admin'), toggleColumnActive);

// Link routes
router.post('/columns/:columnId/links', protect, restrictTo('admin'), addLink);
router.patch('/columns/:columnId/links/:linkId', protect, restrictTo('admin'), updateLink);
router.delete('/columns/:columnId/links/:linkId', protect, restrictTo('admin'), deleteLink);
router.patch('/columns/:columnId/links-order', protect, restrictTo('admin'), updateLinkOrder);
router.patch('/columns/:columnId/links/:linkId/toggle', protect, restrictTo('admin'), toggleLinkActive);

// Social Link routes
router.post('/social-links', protect, restrictTo('admin'), addSocialLink);
router.patch('/social-links/:socialId', protect, restrictTo('admin'), updateSocialLink);
router.delete('/social-links/:socialId', protect, restrictTo('admin'), deleteSocialLink);
router.patch('/social-links-order', protect, restrictTo('admin'), updateSocialLinkOrder);
router.patch('/social-links/:socialId/toggle', protect, restrictTo('admin'), toggleSocialLinkActive);

module.exports = router;