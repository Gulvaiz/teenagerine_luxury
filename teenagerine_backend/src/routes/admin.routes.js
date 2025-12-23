const express = require("express");
const router = express.Router();
const upload = require("../utils/multer");

const {
  getDashboardStats,
  getLowStockProducts,
  getOutOfStockProducts,
  getSalesByProduct,
  getCourierServiceStatus,
  testCourierServices
} = require("../controllers/admin.controller");

const {
  getAllUser,
  createUser,
  deleteUser,
} = require("../controllers/user.controller");

const { getAllOrders, updateOrderStatus } = require("../controllers/order.controller");
const {
  getAllProductsForAdmin,
  deleteProduct,
  createProduct,
  getProductLetterCounts,
} = require("../controllers/product.controller");

const {
  getAllBrandsForAdmin,
  createBrand,
  deleteBrand,
  updateBrand,
  getBrandLetterCounts,
} = require("../controllers/brand.controller");

const {
  getCategories,
  addCategory,
  deleteCategory,
  updateCategory,
  getCategoryLetterCounts,
} = require("../controllers/category.controller");

const {
  uploadProductImage,
  uploadBrandsImage,
  uploadCategoriesImage,
  uploadAvatarImage,
} = require("../controllers/upload.controller");

const { protect, restrictTo } = require("../middlewares/auth.middleware");

const {
  getAllInformation,
  createInformation,
  updateInformation,
  deleteInformation,
  toggleInformationStatus
} = require("../controllers/information.controller");

// Dashboard & stats
router.get("/dashboard", protect, restrictTo("admin"), getDashboardStats);
router.get("/low-stock", protect, restrictTo("admin"), getLowStockProducts);
router.get("/out-of-stock", protect, restrictTo("admin"), getOutOfStockProducts);
router.get("/sales-by-product", protect, restrictTo("admin"), getSalesByProduct);

// Users
router.get("/users", protect, restrictTo("admin"), getAllUser);
router.post("/users/create", protect, restrictTo("admin"), createUser);
router.delete("/users/:id", protect, restrictTo("admin"), deleteUser);

// Orders
router.get("/orders", protect, restrictTo("admin"), getAllOrders);
router.patch("/orders/:id", protect, restrictTo("admin"),updateOrderStatus );

// Products
router.get("/products", protect, restrictTo("admin"), getAllProductsForAdmin);
router.get("/products/letter-counts", protect, restrictTo("admin"), getProductLetterCounts);
router.post("/products/create", protect, restrictTo("admin"), createProduct);
router.delete("/products/:id", protect, restrictTo("admin"), deleteProduct);

// Brands
router.get("/brands", protect, restrictTo("admin"), getAllBrandsForAdmin);
router.get("/brands/letter-counts", protect, restrictTo("admin"), getBrandLetterCounts);
router.post("/brands/create", protect, restrictTo("admin"), createBrand);
router.patch("/brands/:id", protect, restrictTo("admin"), updateBrand);
router.delete("/brands/:id", protect, restrictTo("admin"), deleteBrand);

// Categories
router.get("/categories", protect, restrictTo("admin"), getCategories);
router.get("/categories/letter-counts", protect, restrictTo("admin"), getCategoryLetterCounts);
router.post("/categories/create", protect, restrictTo("admin"), addCategory);
router.delete("/categories/:id", protect, restrictTo("admin"), deleteCategory);
router.patch("/categories/:id", protect, restrictTo("admin"), updateCategory);

// Uploads
router.post("/products/upload", protect, restrictTo("admin"), upload.single("image"), uploadProductImage);
router.post("/brands/upload", protect, restrictTo("admin"), upload.single("image"), uploadBrandsImage);
router.post("/categories/upload", protect, restrictTo("admin"), upload.single("image"), uploadCategoriesImage);
router.post("/users/upload", protect, restrictTo("admin"), upload.single("image"), uploadAvatarImage);

// Information management
router.get("/information", protect, restrictTo("admin"), getAllInformation);
router.post("/information/create", protect, restrictTo("admin"), createInformation);
router.patch("/information/:id", protect, restrictTo("admin"), updateInformation);
router.delete("/information/:id", protect, restrictTo("admin"), deleteInformation);
router.patch("/information/:id/toggle", protect, restrictTo("admin"), toggleInformationStatus);

// Courier service management
router.get("/courier-status", protect, restrictTo("admin"), getCourierServiceStatus);
router.post("/courier-test", protect, restrictTo("admin"), testCourierServices);

module.exports = router;
