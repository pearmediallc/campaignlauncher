const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Create upload middleware for campaign media (images and videos)
const campaignMediaUpload = multer({
  storage: storage,
  limits: {
    fileSize: 4 * 1024 * 1024 * 1024, // 4GB max for videos
    files: 20
  },
  fileFilter: (req, file, cb) => {
    // Accept image formats
    const imageMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'image/tiff',
      'image/tif',
      'image/svg+xml'
    ];
    
    // Accept video formats
    const videoMimeTypes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/webm',
      'video/ogg',
      'video/3gpp',
      'video/3gpp2'
    ];
    
    const allMimeTypes = [...imageMimeTypes, ...videoMimeTypes];
    
    // Check file extension as backup
    const ext = path.extname(file.originalname).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.svg'];
    const videoExtensions = ['.mp4', '.mpeg', '.mpg', '.mov', '.avi', '.wmv', '.webm', '.ogv', '.3gp', '.3g2'];
    const allExtensions = [...imageExtensions, ...videoExtensions];
    
    if (allMimeTypes.includes(file.mimetype) || allExtensions.includes(ext)) {
      cb(null, true);
    } else {
      // Silently reject unsupported files without throwing error
      cb(null, false);
    }
  }
});

module.exports = {
  uploadSingle: campaignMediaUpload.any(),
  uploadMultiple: campaignMediaUpload.any(),
  uploadFields: campaignMediaUpload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: 10 },
    { name: 'video', maxCount: 1 },
    { name: 'mainImage', maxCount: 1 },
    { name: 'mainImages', maxCount: 10 },
    { name: 'mainVideo', maxCount: 1 },
    // Support up to 10 variations with their media
    ...Array.from({ length: 10 }, (_, i) => [
      { name: `variationImage_${i}`, maxCount: 1 },
      { name: `variationImages_${i}`, maxCount: 10 },
      { name: `variationVideo_${i}`, maxCount: 1 }
    ]).flat()
  ])
};