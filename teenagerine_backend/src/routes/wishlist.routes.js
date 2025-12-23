const express= require("express");
const { addToWishlist, getWishlist, removeFromWishlist } = require("../controllers/wishlist.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");
const router = express.Router();


router.get("/", protect, getWishlist);
router.post("/", protect, addToWishlist);
router.delete("/", protect, removeFromWishlist);
router.get("/:userId", protect, restrictTo("admin"), getWishlist); // Admin can view any user's wishlist
router.post("/:userId", protect, restrictTo("admin"), addToWishlist); // Admin can add to any user's wishlist

module.exports = router;