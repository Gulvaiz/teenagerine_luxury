const localStorage = require('../utils/localStorage');

// Get media gallery with filters
exports.getMediaGallery = async (req, res) => {
  try {
    const { folder, year, limit = 50, page = 1 } = req.query;
    let files;

    if (folder && year) {
      files = await localStorage.getFilesByFolder(folder, parseInt(year));
    } else if (folder) {
      files = await localStorage.getFilesByFolder(folder);
    } else {
      files = await localStorage.getAllFiles();
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedFiles = files.slice(startIndex, endIndex);

    // Get unique folders and years for filtering
    const folders = [...new Set(files.map(file => file.folder))];
    const years = [...new Set(files.map(file => file.year))].sort((a, b) => b - a);

    res.status(200).json({
      status: 'success',
      data: {
        files: paginatedFiles,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(files.length / parseInt(limit)),
          totalFiles: files.length,
          hasMore: endIndex < files.length
        },
        filters: {
          folders,
          years
        }
      }
    });
  } catch (error) {
    console.error('Media gallery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch media gallery',
      error: error.message
    });
  }
};

// Get files by specific folder
exports.getFilesByFolder = async (req, res) => {
  try {
    const { folder } = req.params;
    const { year, limit = 20 } = req.query;

    const files = year ? 
      await localStorage.getFilesByFolder(folder, parseInt(year)) :
      await localStorage.getFilesByFolder(folder);

    // Limit results
    const limitedFiles = files.slice(0, parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: {
        files: limitedFiles,
        folder,
        year: year || 'all',
        total: files.length
      }
    });
  } catch (error) {
    console.error('Get files by folder error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch files',
      error: error.message
    });
  }
};

// Upload with media gallery response
exports.uploadWithGallery = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        status: 'fail',
        message: "No file uploaded" 
      });
    }

    const { folder = 'general' } = req.body;
    const fileBuffer = req.file.buffer;
    const result = await localStorage.saveFile(fileBuffer, req.file.originalname, folder);

    // Get recent files from the same folder for gallery
    const recentFiles = await localStorage.getFilesByFolder(folder);
    const galleryFiles = recentFiles.slice(0, 10); // Last 10 files

    res.status(200).json({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        uploadedFile: result,
        recentFiles: galleryFiles
      }
    });
  } catch (error) {
    console.error('Upload with gallery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Upload failed',
      error: error.message
    });
  }
};

// Delete media file
exports.deleteMediaFile = async (req, res) => {
  try {
    const { publicUrl } = req.body;
    
    if (!publicUrl) {
      return res.status(400).json({
        status: 'fail',
        message: 'Public URL is required'
      });
    }

    const deleted = localStorage.deleteFile(publicUrl);
    
    if (deleted) {
      res.status(200).json({
        status: 'success',
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        status: 'fail',
        message: 'File not found'
      });
    }
  } catch (error) {
    console.error('Delete media file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete file',
      error: error.message
    });
  }
};

// Get file info
exports.getFileInfo = async (req, res) => {
  try {
    const { publicUrl } = req.query;
    
    if (!publicUrl) {
      return res.status(400).json({
        status: 'fail',
        message: 'Public URL is required'
      });
    }

    const fileInfo = localStorage.getFileInfo(publicUrl);
    
    if (fileInfo.exists) {
      res.status(200).json({
        status: 'success',
        data: fileInfo
      });
    } else {
      res.status(404).json({
        status: 'fail',
        message: 'File not found'
      });
    }
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get file info',
      error: error.message
    });
  }
};