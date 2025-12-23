const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middlewares/auth.middleware");
const localStorage = require("../utils/localStorage");
const upload = require("../utils/multer");

// Test route for blog upload
router.get("/blog/test", protect, restrictTo("admin"), (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Blog upload route is working",
    user: req.user?.email,
    role: req.user?.role
  });
});

// Blog image upload route
router.post("/blog", protect, restrictTo("admin"), upload.single("image"), async (req, res) => {
  console.log("Blog image upload request received");
  console.log("User:", req.user?.email, "Role:", req.user?.role);
  console.log("File:", req.file?.originalname, "Size:", req.file?.size);

  try {
    if (!req.file) {
      console.log("No file provided");
      return res.status(400).json({ status: "fail", message: "No image file provided" });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      console.log("Invalid file type:", req.file.mimetype);
      return res.status(400).json({
        status: "fail",
        message: "Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed."
      });
    }

    console.log("Uploading to local storage");

    // Upload to local storage
    const result = await localStorage.saveFile(req.file.buffer, req.file.originalname, "blog");

    console.log("Local storage upload successful:", result.publicUrl);

    res.status(200).json({
      status: "success",
      url: result.publicUrl,
      filename: result.filename,
      size: result.size,
      uploadDate: result.uploadDate,
      folder: result.folder,
      year: result.year,
      message: "Image uploaded successfully"
    });
  } catch (error) {
    console.error("Error uploading blog image:", error);

    res.status(500).json({
      status: "error",
      message: error.message || "Failed to upload image"
    });
  }
});

// Product image upload route
router.post("/product", protect, restrictTo("admin"), upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: "fail", message: "No image file provided" });
    }

    // Upload to local storage
    const result = await localStorage.saveFile(req.file.buffer, req.file.originalname, "products");

    res.status(200).json({
      status: "success",
      url: result.publicUrl,
      filename: result.filename,
      size: result.size,
      uploadDate: result.uploadDate,
      folder: result.folder,
      year: result.year
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

// Generic upload route for any media type
router.post("/media", protect, restrictTo("admin"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: "fail", message: "No file provided" });
    }

    const folder = req.body.folder || "general";
    
    // Upload to local storage
    const result = await localStorage.saveFile(req.file.buffer, req.file.originalname, folder);

    // Get recent files from the same folder for gallery preview
    const recentFiles = await localStorage.getFilesByFolder(folder);
    const galleryFiles = recentFiles.slice(0, 6); // Last 6 files for preview

    res.status(200).json({
      status: "success",
      message: "File uploaded successfully",
      data: {
        uploadedFile: result,
        recentFiles: galleryFiles
      }
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

module.exports = router;