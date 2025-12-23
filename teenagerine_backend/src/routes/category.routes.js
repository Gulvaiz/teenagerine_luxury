/**
 * Category Routes
 * @swagger
 * /api/categories:
 * Post:
 *  summary: Create a new category
 *  description: Add a new category to the system
 *  tags: [Category]
 *  /api/categories:
 * get: Get all categories
 *  description: Retrieve a list of all categories
 *  tags: [Category]
 */
const express= require("express");
const router = express.Router();

const { addCategory, getCategories, updateCategory, deleteCategory,getCategoryByName,getCategoryById } = require("../controllers/category.controller");
const { restrictTo, protect } = require("../middlewares/auth.middleware");

router.post("/add", protect, restrictTo("admin"), addCategory);
router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.put("/update/:id", protect, restrictTo("admin"), updateCategory);
router.delete("/delete/:id", protect, restrictTo("admin"), deleteCategory);
router.get("/:name", getCategoryByName);

module.exports = router;