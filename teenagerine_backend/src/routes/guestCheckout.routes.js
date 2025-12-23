const express = require("express");
const router = express.Router();
const guestCheckoutController = require("../controllers/guestCheckout.controller");

// Guest checkout route
router.post("/", guestCheckoutController.guestCheckout);

module.exports = router;