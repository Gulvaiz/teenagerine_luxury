const localStorage = require('../utils/localStorage');

const handleUpload = async (req, res, folder, label) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileBuffer = req.file.buffer;
    const result = await localStorage.saveFile(fileBuffer, req.file.originalname, folder);

    // Generate full URL with backend base URL
    const protocol = req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}${result.publicUrl}`;

    return res.status(200).json({
      message: `${label} uploaded successfully`,
      url: fullUrl,
      publicUrl: result.publicUrl,
      filename: result.filename,
      size: result.size,
      uploadDate: result.uploadDate,
      folder: result.folder,
      year: result.year
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: `${label} upload failed`,
      error: error.message,
    });
  }
};

exports.uploadProductImage = (req, res) =>
  handleUpload(req, res, "products", "Product");
exports.uploadBrandsImage = (req, res) =>
  handleUpload(req, res, "brands", "Brand");
exports.uploadCategoriesImage = (req, res) =>
  handleUpload(req, res, "categories", "Category");
exports.uploadAvatarImage = (req, res) =>
  handleUpload(req, res, "avatars", "Avatar");
