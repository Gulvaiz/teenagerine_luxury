const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const path = require("path");

// 🔧 Route Imports
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const brandRoutes = require("./routes/brand.routes");
const categoryRoutes = require("./routes/category.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const reviewRoutes = require("./routes/review.routes");
const returnRoutes = require("./routes/return.routes");
const adminRoutes = require("./routes/admin.routes");
const sellWithUsRoutes = require("./routes/sellWithUs.routes");
const contactUsRoutes = require("./routes/contactUs.routes");
const contactSubmissionRoutes = require("./routes/contactSubmission.routes");
const sliderRoutes = require("./routes/slider.routes");
const instagramRoutes = require("./routes/instagram.routes");
const sellWithUsSectionRoutes = require("./routes/sellWithUsSection.routes");
const prestigiousBrandsRoutes = require("./routes/prestigiousBrands.routes");
const aboutSectionRoutes = require("./routes/aboutSection.routes");
const footerRoutes = require("./routes/footer.routes");
const navbarRoutes = require("./routes/navbar.routes");
const popupModalRoutes = require("./routes/popupModal.routes");
const homepageSectionRoutes = require("./routes/homepageSection.routes");
const addressRoutes = require("./routes/address.routes");
const menuRoutes = require("./routes/menu.routes");
const userRoutes = require("./routes/user.routes");
const couponRoutes = require("./routes/coupon.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const guestCheckoutRoutes = require("./routes/guestCheckout.routes");
const quoteRequestRoutes = require("./routes/quoteRequest.routes");
const uploadRoutes = require("./routes/upload.routes");
const mediaRoutes = require("./routes/media.routes");
const contentRoutes = require("./routes/content.routes");
const productRequestRoutes = require("./routes/productRequest.routes");
const homePage = require('./routes/home.routes');
const globalControllerRoutes = require("./routes/globalController.routes");
const shippingRoutes = require("./routes/shipping.routes");
const recommendationRoutes = require("./routes/recommendation.routes");
const blogRoutes = require("./routes/blog.routes");
const commentRoutes = require("./routes/comment.routes");
const popupProductSelectionRoutes = require("./routes/popupProductSelection.routes");
const saleItemsSelectionRoutes = require("./routes/saleItemsSelection.routes");
const cookiePreferencesRoutes = require("./routes/cookiePreferences.routes");
const informationRoutes = require("./routes/information.routes");
const signupPopupRoutes = require("./routes/signupPopup.routes");
const smsRoutes = require("./routes/sms.routes");
const ccavenueRoutes = require("./routes/ccavenue.routes");
const vendorRoutes = require("./routes/vendor.routes");
const contractRoutes = require("./routes/contract.routes");
const salesRoutes = require("./routes/sales.routes");
const recycleBinRoutes = require("./routes/recycleBin.routes");
const logsRoutes = require("./routes/logs.routes");

const app = express();

// Global Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "http://localhost:*", "http://192.168.*"],
    },
  },
}));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    'https://tangerineluxury.com',
    'https://www.tangerineluxury.com',
    'www.tangerineluxury.com'
  ],
  credentials: true
}));
app.use(morgan("dev"));

// JSON and URL-encoded Parsers (limit increased)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static File Serving for Media
app.use("/media", express.static(path.join(__dirname, "../public/media")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Rate Limiting
app.use(
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 1000,
    message: "Too many requests, please try again later.",
  })
);

// Swagger Configuration
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Teenagerine API",
      version: "1.0.0",
    },
  },
  apis: ["./routes/*.js"],
};
const swaggerSpec = swaggerJsDoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root Health Check
app.get("/", (req, res) => {
  res.json({ message: "Teenagerine Backend API" });
});

// Route Bindings
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sell-with-us", sellWithUsRoutes);
app.use("/api/contact-us", contactUsRoutes);
app.use("/api/contact-submissions", contactSubmissionRoutes);
app.use("/api/slider", sliderRoutes);
app.use("/api/instagram", instagramRoutes);
app.use("/api/sell-with-us-section", sellWithUsSectionRoutes);
app.use("/api/prestigious-brands", prestigiousBrandsRoutes);
app.use("/api/about-section", aboutSectionRoutes);
app.use("/api/footer", footerRoutes);
app.use("/api/navbar", navbarRoutes);
app.use("/api/popup-modal", popupModalRoutes);
app.use("/api/homepage-sections", homepageSectionRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/user", userRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/guest-checkout", guestCheckoutRoutes);
app.use("/api/quote-requests", quoteRequestRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/product-requests", productRequestRoutes);
app.use('/api/home', homePage);
app.use('/api/global-controller', globalControllerRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/popup-products", popupProductSelectionRoutes);
app.use("/api/sale-items", saleItemsSelectionRoutes);
app.use("/api/cookie-preferences", cookiePreferencesRoutes);
app.use("/api/information", informationRoutes);
app.use("/api/signup-popup", signupPopupRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/ccavenue", ccavenueRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/vendor/contract", contractRoutes); // Vendor contract public access
app.use("/api/sales", salesRoutes); // Enhanced sales filter endpoint
app.use("/api/recycle-bin", recycleBinRoutes); // Recycle bin management
app.use("/api/logs", logsRoutes); // Error and activity logs


module.exports = app;
