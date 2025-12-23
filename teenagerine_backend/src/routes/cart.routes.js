/**
 * @swagger
 * /api/cart:
 *  get:
 * summary: Get my cart
 * description: Retrieve the current user's shopping cart
 * tags: [Cart]
 * security:
 *   - bearerAuth: []
 * * /api/cart/add:
 *  post:
 * summary: Add item to cart
 *  description: Add a product to the user's shopping cart
 *  tags: [Cart]
 */
const express = require("express");
const router = express.Router();
const { addToCart, getMyCart, clearCart } = require("../controllers/cart.controller");
const { protect } = require("../middlewares/auth.middleware");

router.use(protect);

router.get("/", getMyCart);
router.post("/add", addToCart);
router.delete("/clear", clearCart);

module.exports = router;
