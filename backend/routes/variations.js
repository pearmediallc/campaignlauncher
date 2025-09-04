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
  try {
    const { exportToken, userId } = req.body;
    
    if (!exportToken) {
      return res.status(400).json({ error: 'Export token is required' });
    }
    
    try {
      // First validate the token locally
      const decoded = jwt.verify(exportToken, JWT_SECRET);
      
      // Then fetch the variation data from Ad Scraper
      const response = await axios.post(`${AD_SCRAPER_URL}/api/variations/validate-token`, {
        exportToken
      });
      
      if (!response.data.success || !response.data.variation) {
        return res.status(400).json({ error: 'Failed to retrieve variation data' });
      }
      
      const variation = response.data.variation;
      
      // Store variation temporarily in session or database
      // This allows the frontend to retrieve it for form prefill
      const variationId = decoded.variationId;
      
      // Return success with variation ID for frontend to use
      return res.json({
        success: true,
        variationId,
        variation,
        redirectUrl: `/campaigns/new?prefill=${variationId}`
      });
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Export token has expired. Please generate a new one from Ad Scraper.' });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid export token' });
      }
      throw jwtError;
    }
    
  } catch (error) {
    console.error('Import variation error:', error);
    return res.status(500).json({ 
      error: 'Failed to import variation',
      details: error.message 
    });
  }
});

/**
 * Get variation data for form prefill
 * Frontend calls this after redirect to populate the campaign form
 */
router.get('/prefill/:variationId', async (req, res) => {
  try {
    const { variationId } = req.params;
    
    // In production, you might want to require authentication here
    // For now, the variation ID acts as a temporary access token
    
    // Try to fetch from Ad Scraper if not in local cache
    try {
      const response = await axios.get(`${AD_SCRAPER_URL}/api/get-variation/${variationId}`);
      
      if (response.data) {
        // Transform data to match Campaign Launcher form fields
        const prefillData = {
          headline: response.data.headline || '',
          description: response.data.description || '',
          primaryText: response.data.primaryText || '',
          mediaType: response.data.mediaType || 'single_image',
          callToAction: response.data.callToAction || 'LEARN_MORE',
          // Image URLs will need to be handled separately
          imageUrl: response.data.imageUrl,
          images: response.data.images || []
        };
        
        return res.json({
          success: true,
          prefillData
        });
      }
    } catch (fetchError) {
      console.error('Failed to fetch from Ad Scraper:', fetchError.message);
    }
    
    return res.status(404).json({ error: 'Variation not found' });
    
  } catch (error) {
    console.error('Prefill error:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve prefill data',
      details: error.message 
    });
  }
});

/**
 * Handle authentication flow with token preservation
 * This endpoint stores the import token temporarily while user logs in
 */
router.post('/store-import-token', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Store in session (you might want to use Redis in production)
    req.session.importToken = token;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to store token' });
      }
      
      return res.json({
        success: true,
        message: 'Token stored. Please complete login.'
      });
    });
    
  } catch (error) {
    console.error('Store token error:', error);
    return res.status(500).json({ 
      error: 'Failed to store import token',
      details: error.message 
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