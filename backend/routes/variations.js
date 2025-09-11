const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');

// Ad Scraper API URL
const AD_SCRAPER_URL = process.env.AD_SCRAPER_URL || 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-shared-secret-key';

/**
 * Import variation from Ad Scraper using export token
 * This endpoint handles the initial import request
 */
router.post('/import', async (req, res) => {
  // 🔍 COMPREHENSIVE LOGGING FOR SCRAPER DEBUGGING
  console.log('=== VARIATIONS IMPORT REQUEST START ===');
  console.log('📥 Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  console.log('🔧 Environment Config:', {
    AD_SCRAPER_URL,
    JWT_SECRET: JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'NOT_SET',
    NODE_ENV: process.env.NODE_ENV
  });
  
  try {
    const { exportToken, userId } = req.body;
    
    console.log('🎫 Token Analysis:', {
      hasToken: !!exportToken,
      tokenType: typeof exportToken,
      tokenLength: exportToken?.length,
      tokenStart: exportToken?.substring(0, 50) + '...',
      userId: userId || 'not_provided'
    });
    
    if (!exportToken) {
      console.log('❌ Missing export token');
      return res.status(400).json({ error: 'Export token is required' });
    }
    
    try {
      console.log('🔐 Attempting JWT verification...');
      // First validate the token locally
      const decoded = jwt.verify(exportToken, JWT_SECRET);
      console.log('✅ JWT decoded successfully:', JSON.stringify(decoded, null, 2));
      
      console.log('🌐 Fetching variation data from scraper...');
      console.log('📡 Scraper URL:', `${AD_SCRAPER_URL}/api/variations/validate-token`);
      
      // Then fetch the variation data from Ad Scraper
      const response = await axios.post(`${AD_SCRAPER_URL}/api/variations/validate-token`, {
        exportToken
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Campaign-Launcher/1.0'
        }
      });
      
      console.log('📨 Scraper Response Status:', response.status);
      console.log('📨 Scraper Response Headers:', JSON.stringify(response.headers, null, 2));
      console.log('📨 Scraper Response Data:', JSON.stringify(response.data, null, 2));
      
      if (!response.data.success || !response.data.variation) {
        console.log('❌ Invalid scraper response:', {
          hasSuccess: !!response.data.success,
          hasVariation: !!response.data.variation,
          responseKeys: Object.keys(response.data || {})
        });
        return res.status(400).json({ error: 'Failed to retrieve variation data' });
      }
      
      const variation = response.data.variation;
      console.log('✅ Retrieved variation data:', JSON.stringify(variation, null, 2));
      
      // Store variation temporarily in session or database
      // This allows the frontend to retrieve it for form prefill
      const variationId = decoded.variationId;
      console.log('🆔 Using variation ID:', variationId);
      
      const successResponse = {
        success: true,
        variationId,
        variation,
        redirectUrl: `/campaigns/new?prefill=${variationId}`
      };
      
      console.log('✅ Sending success response:', JSON.stringify(successResponse, null, 2));
      console.log('=== VARIATIONS IMPORT SUCCESS ===');
      
      // Return success with variation ID for frontend to use
      return res.json(successResponse);
      
    } catch (jwtError) {
      console.log('🚫 JWT/Scraper Error Details:', {
        errorName: jwtError.name,
        errorMessage: jwtError.message,
        errorStack: jwtError.stack,
        isAxiosError: jwtError.isAxiosError,
        responseStatus: jwtError.response?.status,
        responseData: jwtError.response?.data
      });
      
      if (jwtError.name === 'TokenExpiredError') {
        console.log('❌ Token expired');
        return res.status(401).json({ error: 'Export token has expired. Please generate a new one from Ad Scraper.' });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        console.log('❌ Invalid JWT token');
        return res.status(401).json({ error: 'Invalid export token' });
      }
      
      // Handle Axios errors (network/scraper issues)
      if (jwtError.isAxiosError) {
        console.log('❌ Network/Scraper communication error');
        return res.status(502).json({ 
          error: 'Failed to communicate with ad scraper',
          details: jwtError.message,
          scraperUrl: AD_SCRAPER_URL
        });
      }
      
      throw jwtError;
    }
    
  } catch (error) {
    console.log('=== CRITICAL ERROR IN VARIATIONS IMPORT ===');
    console.error('💥 Unhandled Import Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      isAxiosError: error.isAxiosError,
      requestConfig: error.config,
      responseStatus: error.response?.status,
      responseHeaders: error.response?.headers,
      responseData: error.response?.data
    });
    console.log('=== END CRITICAL ERROR ===');
    
    return res.status(500).json({ 
      error: 'Failed to import variation',
      details: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get variation data for form prefill
 * Frontend calls this after redirect to populate the campaign form
 */
router.get('/prefill/:variationId', async (req, res) => {
  console.log('=== VARIATIONS PREFILL REQUEST START ===');
  console.log('📥 Prefill Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🆔 Variation ID:', req.params.variationId);
  console.log('🔧 Environment Config:', {
    AD_SCRAPER_URL,
    JWT_SECRET: JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'NOT_SET'
  });
  
  try {
    const { variationId } = req.params;
    
    console.log('🔍 Attempting to fetch variation data for ID:', variationId);
    
    // In production, you might want to require authentication here
    // For now, the variation ID acts as a temporary access token
    
    // Try to fetch from Ad Scraper if not in local cache
    try {
      const scraperUrl = `${AD_SCRAPER_URL}/api/get-variation/${variationId}`;
      console.log('🌐 Fetching from scraper URL:', scraperUrl);
      
      const response = await axios.get(scraperUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Campaign-Launcher/1.0'
        }
      });
      
      console.log('📨 Scraper Response Status:', response.status);
      console.log('📨 Scraper Response Headers:', JSON.stringify(response.headers, null, 2));
      console.log('📨 Raw Scraper Data:', JSON.stringify(response.data, null, 2));
      
      if (response.data) {
        // Log original data structure for field mapping analysis
        console.log('🔍 Data Structure Analysis:', {
          hasHeadline: !!response.data.headline,
          hasDescription: !!response.data.description,
          hasPrimaryText: !!response.data.primaryText,
          hasPrimary_text: !!response.data.primary_text, // Check scraper format
          hasMediaType: !!response.data.mediaType,
          hasCallToAction: !!response.data.callToAction,
          hasCta: !!response.data.cta, // Check scraper format
          hasImageUrl: !!response.data.imageUrl,
          hasImage_url: !!response.data.image_url, // Check scraper format
          hasImages: !!response.data.images,
          allKeys: Object.keys(response.data)
        });
        
        // Transform data to match Campaign Launcher form fields
        // Support both scraper format (snake_case) and campaign format (camelCase)
        const prefillData = {
          headline: response.data.headline || '',
          description: response.data.description || '',
          primaryText: response.data.primaryText || response.data.primary_text || '', // Support both formats
          mediaType: response.data.mediaType || response.data.media_type || 'single_image',
          callToAction: response.data.callToAction || response.data.cta || 'LEARN_MORE', // Support both formats
          // Image URLs will need to be handled separately
          imageUrl: response.data.imageUrl || response.data.image_url, // Support both formats
          images: response.data.images || []
        };
        
        console.log('✅ Transformed prefill data:', JSON.stringify(prefillData, null, 2));
        console.log('=== VARIATIONS PREFILL SUCCESS ===');
        
        return res.json({
          success: true,
          prefillData
        });
      }
    } catch (fetchError) {
      console.log('🚫 Scraper Fetch Error Details:', {
        errorName: fetchError.name,
        errorMessage: fetchError.message,
        isAxiosError: fetchError.isAxiosError,
        responseStatus: fetchError.response?.status,
        responseHeaders: fetchError.response?.headers,
        responseData: fetchError.response?.data,
        requestUrl: fetchError.config?.url
      });
      console.error('Failed to fetch from Ad Scraper:', fetchError.message);
    }
    
    return res.status(404).json({ error: 'Variation not found' });
    
  } catch (error) {
    console.log('=== CRITICAL ERROR IN VARIATIONS PREFILL ===');
    console.error('💥 Unhandled Prefill Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      isAxiosError: error.isAxiosError,
      requestConfig: error.config,
      responseStatus: error.response?.status,
      responseHeaders: error.response?.headers,
      responseData: error.response?.data
    });
    console.log('=== END CRITICAL ERROR ===');
    
    return res.status(500).json({ 
      error: 'Failed to retrieve prefill data',
      details: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Handle authentication flow with token preservation
 * This endpoint stores the import token temporarily while user logs in
 */
router.post('/store-import-token', (req, res) => {
  console.log('=== STORE IMPORT TOKEN REQUEST ===');
  console.log('📥 Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { token } = req.body;
    
    console.log('🎫 Token Analysis:', {
      hasToken: !!token,
      tokenType: typeof token,
      tokenLength: token?.length,
      sessionExists: !!req.session
    });
    
    if (!token) {
      console.log('❌ Missing token');
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Store in session (you might want to use Redis in production)
    req.session.importToken = token;
    req.session.save((err) => {
      if (err) {
        console.error('💥 Session save error:', err);
        return res.status(500).json({ error: 'Failed to store token' });
      }
      
      console.log('✅ Token stored successfully in session');
      return res.json({
        success: true,
        message: 'Token stored. Please complete login.'
      });
    });
    
  } catch (error) {
    console.log('=== CRITICAL ERROR IN STORE TOKEN ===');
    console.error('💥 Store Token Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    console.log('=== END CRITICAL ERROR ===');
    
    return res.status(500).json({ 
      error: 'Failed to store import token',
      details: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Retrieve stored import token after login
 */
router.get('/retrieve-import-token', authenticate, (req, res) => {
  try {
    const token = req.session.importToken;
    
    if (!token) {
      return res.json({ success: false, message: 'No stored token' });
    }
    
    // Clear the token from session after retrieval
    delete req.session.importToken;
    req.session.save();
    
    return res.json({
      success: true,
      token
    });
    
  } catch (error) {
    console.error('Retrieve token error:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve import token',
      details: error.message 
    });
  }
});

module.exports = router;