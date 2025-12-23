const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class LocalStorage {
  constructor() {
    this.baseDir = path.join(__dirname, '../../public/media');
    this.ensureBaseDirectory();
  }

  ensureBaseDirectory() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  getYearWiseDirectory(year = new Date().getFullYear()) {
    const yearDir = path.join(this.baseDir, year.toString());
    if (!fs.existsSync(yearDir)) {
      fs.mkdirSync(yearDir, { recursive: true });
    }
    return yearDir;
  }

  generateUniqueFilename(originalName, fileBuffer) {
    const ext = path.extname(originalName);
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const timestamp = Date.now();
    return `${hash}_${timestamp}${ext}`;
  }

  async saveFile(fileBuffer, originalName, folder = 'general') {
    try {
      const year = new Date().getFullYear();
      const yearDir = this.getYearWiseDirectory(year);
      const folderDir = path.join(yearDir, folder);
      
      if (!fs.existsSync(folderDir)) {
        fs.mkdirSync(folderDir, { recursive: true });
      }

      const filename = this.generateUniqueFilename(originalName, fileBuffer);
      const filePath = path.join(folderDir, filename);

      // Save file
      fs.writeFileSync(filePath, fileBuffer);

      // Generate public URL
      const publicUrl = `/media/${year}/${folder}/${filename}`;

      return {
        filename,
        filePath,
        publicUrl,
        year,
        folder,
        size: fileBuffer.length,
        originalName,
        uploadDate: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to save file: ${error.message}`);
    }
  }

  async getFilesByFolder(folder, year = null) {
    try {
      const files = [];
      const baseSearchDir = year ? this.getYearWiseDirectory(year) : this.baseDir;
      
      const searchPaths = year ? [path.join(baseSearchDir, folder)] : 
                          this.getAllYearDirectories().map(yearDir => path.join(yearDir, folder));

      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          const folderFiles = fs.readdirSync(searchPath);
          const pathYear = year || path.basename(path.dirname(searchPath));
          
          for (const file of folderFiles) {
            const filePath = path.join(searchPath, file);
            const stats = fs.statSync(filePath);
            
            files.push({
              filename: file,
              publicUrl: `/media/${pathYear}/${folder}/${file}`,
              size: stats.size,
              uploadDate: stats.birthtime.toISOString(),
              year: pathYear,
              folder
            });
          }
        }
      }

      return files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    } catch (error) {
      throw new Error(`Failed to get files: ${error.message}`);
    }
  }

  async getAllFiles() {
    try {
      const files = [];
      const years = this.getAllYearDirectories();

      for (const yearDir of years) {
        const year = path.basename(yearDir);
        const folders = fs.readdirSync(yearDir, { withFileTypes: true })
                         .filter(dirent => dirent.isDirectory())
                         .map(dirent => dirent.name);

        for (const folder of folders) {
          const folderFiles = await this.getFilesByFolder(folder, year);
          files.push(...folderFiles);
        }
      }

      return files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    } catch (error) {
      throw new Error(`Failed to get all files: ${error.message}`);
    }
  }

  getAllYearDirectories() {
    try {
      return fs.readdirSync(this.baseDir, { withFileTypes: true })
               .filter(dirent => dirent.isDirectory() && /^\d{4}$/.test(dirent.name))
               .map(dirent => path.join(this.baseDir, dirent.name));
    } catch (error) {
      return [];
    }
  }

  deleteFile(publicUrl) {
    try {
      // Convert public URL to file path
      const relativePath = publicUrl.replace('/media/', '');
      const filePath = path.join(this.baseDir, relativePath);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  getFileInfo(publicUrl) {
    try {
      const relativePath = publicUrl.replace('/media/', '');
      const filePath = path.join(this.baseDir, relativePath);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const pathParts = relativePath.split('/');
        
        return {
          filename: path.basename(filePath),
          publicUrl,
          size: stats.size,
          uploadDate: stats.birthtime.toISOString(),
          year: pathParts[0],
          folder: pathParts[1] || 'general',
          exists: true
        };
      }
      
      return { exists: false };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }
}

module.exports = new LocalStorage();