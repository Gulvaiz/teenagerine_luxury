const express = require('express');
const router = express.Router();
const signupPopupController = require('../controllers/signupPopup.controller');

// Get signup popup configuration
router.get('/', signupPopupController.getSignupPopup);

// Update signup popup configuration
router.put('/', 
  signupPopupController.uploadImage,
  signupPopupController.updateSignupPopup
);

// Toggle signup popup enabled/disabled
router.patch('/toggle', signupPopupController.toggleSignupPopup);

// Seed initial signup popup data
router.post('/seed', signupPopupController.seedSignupPopup);

module.exports = router;