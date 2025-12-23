const express = require("express");
const cookiePreferencesController = require("../controllers/cookiePreferences.controller");

const router = express.Router();

// Get current cookie preferences (works for both authenticated and guest users)
router.get("/", cookiePreferencesController.getCookiePreferences);

// Update cookie preferences (works for both authenticated and guest users)
router.post("/update", cookiePreferencesController.updateCookiePreferences);

// Accept all cookies (convenience endpoint)
router.post("/accept-all", cookiePreferencesController.acceptAllCookies);

// Reject all non-necessary cookies (convenience endpoint)
router.post("/reject-all", cookiePreferencesController.rejectAllCookies);

// Migrate guest cookie preferences to authenticated user account
router.post("/migrate", cookiePreferencesController.migrateCookiePreferences);

module.exports = router;