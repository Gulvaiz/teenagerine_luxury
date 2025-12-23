/**
 * @swagger
 * /api/reviews/{productId}:
 * get:
 * summary: Get reviews by product ID
 * description: Retrieve all reviews for a specific product
 * tags: [Review]
 * /api/reviews/{productId}:
 * post:                
 * summary: Create a new review for a product
 * description: Add a review for a specific product
 * tags: [Review]
 * /api/reviews/{id}:
 * put:
 * summary: Update a review
*  description: Update an existing review by its unique identifier 
 * tags: [Review]
 * /api/reviews/{id}:
 * delete:
 * summary: Delete a review
 * description: Delete an existing review by its unique identifier
 * tags: [Review]  
 */
const express = require("express");
const { createReview, getReviewsByProductId, updateReview, deleteReview } = require("../controllers/review.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/:productId", getReviewsByProductId); 
router.post("/:productId", protect, restrictTo("user"), createReview); 
router.put("/:id", protect, restrictTo("user"), updateReview);
router.delete("/:id", protect, restrictTo("user"), deleteReview);
router.get("/", protect, restrictTo("admin"), getReviewsByProductId);


module.exports = router;