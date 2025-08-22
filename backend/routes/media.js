const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const facebookApi = require('../services/facebookApi');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

router.post('/upload', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const imageHash = await facebookApi.uploadImage(req.file.path);
    
    res.json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        hash: imageHash,
        filename: req.file.filename,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/upload-multiple', upload.array('media', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const uploadedMedia = [];
    
    for (const file of req.files) {
      const imageHash = await facebookApi.uploadImage(file.path);
      uploadedMedia.push({
        hash: imageHash,
        filename: file.filename,
        originalName: file.originalname
      });
    }
    
    res.json({
      success: true,
      message: `${uploadedMedia.length} files uploaded successfully`,
      data: uploadedMedia
    });
  } catch (error) {
    console.error('Multiple media upload error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;