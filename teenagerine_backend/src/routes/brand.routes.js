/**
 * Brand Routes
 * @swagger
 * /api/brands:
 *  post:
 * summary: Create a new brand
 * description: Add a new brand to the system
 * tags: [Brand]
 * /api/brands:
 *  get: Get all brands
 * description: Retrieve a list of all brands
 * tags: [Brand]
 * /api/brands/{id}:
 * get: Get brand by ID
 * description: Retrieve a brand by its unique identifier
 * tags: [Brand]
 * /api/brands/category/{categoryId}:
 * get: Get brands by category  
 * description: Retrieve brands associated with a specific category
 * tags: [Brand]
 */

const express= require("express");
const router = express.Router();
const  { createBrand,getAllBrands,getBrandById,getBrandByCategory,updateBrand,deleteBrand,getBrandByName} = require("../controllers/brand.controller");
const { restrictTo,protect } = require("../middlewares/auth.middleware");

router.post("/add",protect,restrictTo("admin"),createBrand);
router.get("/", getAllBrands);
router.get("/:id", getBrandById);
router.get("/:categoryId", getBrandByCategory);
router.get("/:name", getBrandByName);
router.put("/update/:id",protect,restrictTo('admin'), updateBrand);
router.delete("/delete/:id", protect, restrictTo("admin"), deleteBrand);

module.exports = router;