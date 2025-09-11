const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');

/**
 * Proxy endpoint to download images from external URLs
 * This bypasses CSP restrictions by downloading images server-side
 * and returning them as base64 data to the frontend
 */
router.post('/proxy-download', authenticate, async (req, res) => {
  console.log('=== IMAGE PROXY DOWNLOAD REQUEST START ===');
  console.log('📥 Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { imageUrl } = req.body;
    
    console.log('🔍 Image URL Analysis:', {
      hasImageUrl: !!imageUrl,
      urlType: typeof imageUrl,
      urlLength: imageUrl?.length,
      urlStart: imageUrl?.substring(0, 100) + '...'
    });
    
    if (!imageUrl) {
      console.log('❌ Missing image URL');
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    // Validate URL format
    try {
      new URL(imageUrl);
    } catch (urlError) {
      console.log('❌ Invalid URL format:', urlError.message);
      return res.status(400).json({ error: 'Invalid image URL format' });
    }
    
    console.log('🌐 Starting image download from:', imageUrl);
    
    // Download image from external URL with comprehensive error handling
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      maxContentLength: 10 * 1024 * 1024, // 10MB max file size
      headers: {
        'User-Agent': 'Campaign-Launcher/1.0',
        'Accept': 'image/*'
      }
    });
    
    console.log('📨 Download Response:', {
      status: response.status,
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      dataSize: response.data.length
    });
    
    // Validate content type
    const contentType = response.headers['content-type'] || 'image/png';
    if (!contentType.startsWith('image/')) {
      console.log('❌ Invalid content type:', contentType);
      return res.status(400).json({ error: 'URL does not point to a valid image' });
    }
    
    // Convert to base64
    console.log('🔄 Converting to base64...');
    const base64 = Buffer.from(response.data).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;
    
    console.log('✅ Image conversion successful:', {
      originalSize: response.data.length,
      base64Size: base64.length,
      contentType: contentType
    });
    
    console.log('=== IMAGE PROXY DOWNLOAD SUCCESS ===');
    
    res.json({
      success: true,
      imageData: dataUrl,
      contentType: contentType,
      originalSize: response.data.length,
      base64Size: base64.length
    });
    
  } catch (error) {
    console.log('=== CRITICAL ERROR IN IMAGE PROXY DOWNLOAD ===');
    console.error('💥 Image Proxy Download Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      isAxiosError: error.isAxiosError,
      responseStatus: error.response?.status,
      responseHeaders: error.response?.headers,
      responseData: error.response?.data
    });
    console.log('=== END CRITICAL ERROR ===');
    
    // Provide specific error messages based on error type
    let errorMessage = 'Failed to download image';
    let statusCode = 500;
    
    if (error.isAxiosError) {
      if (error.code === 'ENOTFOUND') {
        errorMessage = 'Image URL not found or domain does not exist';
        statusCode = 404;
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Image download timed out';
        statusCode = 408;
      } else if (error.response?.status === 403) {
        errorMessage = 'Access forbidden to image URL';
        statusCode = 403;
      } else if (error.response?.status === 404) {
        errorMessage = 'Image not found at the provided URL';
        statusCode = 404;
      }
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;