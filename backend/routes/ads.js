const express = require('express');
const router = express.Router();
const facebookApi = require('../services/facebookApi');

router.post('/create-variation', async (req, res) => {
  try {
    const { adsetId, campaignName, variations } = req.body;
    
    if (!adsetId || !variations || variations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'AdSet ID and variations are required'
      });
    }

    const ads = [];
    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i];
      const ad = await facebookApi.createAd({
        name: `[REVIEW] ${campaignName} - Ad Variation ${i + 1}`,
        campaignName: campaignName,
        adsetId: adsetId,
        url: variation.url,
        adCopy: variation.adCopy,
        headline: variation.headline,
        description: variation.description,
        imageHash: variation.imageHash
      });
      ads.push(ad);
    }

    res.json({
      success: true,
      message: `${ads.length} ad variations created successfully`,
      data: { ads }
    });
  } catch (error) {
    console.error('Ad variation creation error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/adsets/:campaignId', async (req, res) => {
  try {
    const axios = require('axios');
    const url = `https://graph.facebook.com/${process.env.FB_API_VERSION}/${req.params.campaignId}/adsets`;
    
    const response = await axios.get(url, {
      params: {
        access_token: process.env.FB_ACCESS_TOKEN,
        fields: 'id,name,status,daily_budget,optimization_goal'
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching adsets:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/ads/:adsetId', async (req, res) => {
  try {
    const axios = require('axios');
    const url = `https://graph.facebook.com/${process.env.FB_API_VERSION}/${req.params.adsetId}/ads`;
    
    const response = await axios.get(url, {
      params: {
        access_token: process.env.FB_ACCESS_TOKEN,
        fields: 'id,name,status,creative'
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;