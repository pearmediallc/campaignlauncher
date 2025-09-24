const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const FacebookAPI = require('../services/facebookApi');
const { authenticate, requirePermission, requireResourceAccess } = require('../middleware/auth');
const { requireFacebookAuth, refreshFacebookToken } = require('../middleware/facebookAuth');
const AuditService = require('../services/AuditService');
const PermissionService = require('../services/PermissionService');
const { Resource } = require('../models');
const db = require('../models');
const { decryptToken } = require('./facebookSDKAuth');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const metascraper = require('metascraper')([
  require('metascraper-title')(),
  require('metascraper-description')(),
  require('metascraper-image')(),
  require('metascraper-publisher')()
]);
const got = require('got').default;

const validateCampaign = [
  body('campaignName').notEmpty().withMessage('Campaign name is required'),
  body('dailyBudget')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Daily budget must be at least $1'),
  body('lifetimeBudget')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Lifetime budget must be at least $1'),
  body('urlType')
    .optional()
    .isIn(['lead_gen', 'call', 'website', 'app_deeplink', 'facebook_event', 'messenger', 'whatsapp', 'none'])
    .withMessage('Invalid URL type'),
  body('url')
    .optional()
    .isURL()
    .withMessage('Valid URL is required'),
  body('primaryText').notEmpty().withMessage('Primary text is required'),
  body('headline').notEmpty().withMessage('Headline is required'),
  body('description')
    .optional()
    .notEmpty()
    .withMessage('Description is required')
];

// Make image upload optional
router.post('/create', authenticate, requireFacebookAuth, refreshFacebookToken, requirePermission('campaign', 'create'), uploadSingle, validateCampaign, async (req, res) => {
  try {
    console.log('📝 Campaign creation request received:', {
      body: req.body,
      hasFile: !!req.file,
      hasFiles: !!req.files,
      user: req.user?.id
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Get user's Facebook credentials
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId: req.user.id, isActive: true }
    });

    if (!facebookAuth || !facebookAuth.selectedAdAccount) {
      return res.status(400).json({ 
        error: 'Please select an ad account before creating campaigns' 
      });
    }

    // Check if user has selected resources
    if (!facebookAuth.selectedPage) {
      return res.status(400).json({ 
        error: 'Please select a Facebook page before creating campaigns' 
      });
    }

    // Get pixel ID - either from selected pixel or fetch from ad account
    let pixelId = facebookAuth.selectedPixel?.id;
    
    // Check if token exists
    if (!facebookAuth.accessToken) {
      return res.status(401).json({ 
        error: 'Facebook access token not found. Please reconnect your Facebook account.',
        requiresReauth: true 
      });
    }
    
    // Check if token is encrypted (starts with '{' for JSON)
    let decryptedToken;
    if (facebookAuth.accessToken.startsWith('{')) {
      // Token is encrypted, decrypt it
      decryptedToken = decryptToken(facebookAuth.accessToken);
      if (!decryptedToken) {
        return res.status(401).json({ 
          error: 'Failed to decrypt access token. Please reconnect your Facebook account.',
          requiresReauth: true 
        });
      }
    } else if (facebookAuth.accessToken.startsWith('EAA')) {
      // Token is plain text (legacy) - clear it and require reauth
      console.log('⚠️ Found legacy unencrypted token, clearing...');
      await facebookAuth.update({ accessToken: null, isActive: false });
      return res.status(401).json({ 
        error: 'Invalid token format detected. Please reconnect your Facebook account.',
        requiresReauth: true 
      });
    } else {
      return res.status(401).json({ 
        error: 'Invalid access token. Please reconnect your Facebook account.',
        requiresReauth: true 
      });
    }
    
    // If no pixel selected, fetch the ad account's pixels
    if (!pixelId) {
      try {
        const axios = require('axios');
        const pixelsResponse = await axios.get(
          `https://graph.facebook.com/v18.0/${facebookAuth.selectedAdAccount.id}/adspixels`,
          {
            params: {
              access_token: decryptedToken,
              fields: 'id,name,code,is_created_by_business'
            }
          }
        );
        
        // Use the first available pixel
        if (pixelsResponse.data.data && pixelsResponse.data.data.length > 0) {
          pixelId = pixelsResponse.data.data[0].id;
          console.log(`Using ad account's pixel: ${pixelsResponse.data.data[0].name} (${pixelId})`);
        }
      } catch (error) {
        console.log('Could not fetch pixels for ad account:', error.message);
      }
    }
    
    // Check for switched/active resource configuration FIRST
    const activeConfig = await UserResourceConfig.getActiveConfig(userId);
    let selectedAdAccountId, selectedPageId, selectedPixelId;

    if (activeConfig && (activeConfig.adAccountId || activeConfig.pageId)) {
      // User has switched resources - use the active configuration
      console.log('📋 Using switched resource configuration for campaign');
      selectedAdAccountId = activeConfig.adAccountId || facebookAuth.selectedAdAccount?.id;
      selectedPageId = activeConfig.pageId || facebookAuth.selectedPage?.id;
      selectedPixelId = activeConfig.pixelId || pixelId;

      if (selectedPixelId) {
        pixelId = selectedPixelId;
      }
    } else {
      // Use original selected resources
      selectedAdAccountId = facebookAuth.selectedAdAccount?.id;
      selectedPageId = facebookAuth.selectedPage?.id;
      selectedPixelId = facebookAuth.selectedPixel?.id || pixelId;
    }

    // Create FacebookAPI instance with selected resources
    const userFacebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: (selectedAdAccountId || facebookAuth.selectedAdAccount.id).replace('act_', ''),
      pageId: selectedPageId || facebookAuth.selectedPage.id,
      pixelId: pixelId
    });

    // Handle different media types
    let mediaPath = null;
    let imagePaths = [];
    
    console.log('📎 Upload check:', {
      mediaType: req.body.mediaType,
      hasFile: !!req.file,
      hasFiles: !!req.files,
      fileDetails: req.file ? {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      } : null
    });
    
    // Handle both req.file and req.files for single image (multer inconsistency)
    if (req.body.mediaType === 'single_image') {
      if (req.file) {
        mediaPath = req.file.path;
        console.log('✅ Single image detected (file):', mediaPath);
      } else if (req.files && req.files.length > 0) {
        mediaPath = req.files[0].path;
        console.log('✅ Single image detected (files[0]):', mediaPath);
      } else {
        console.log('⚠️ No image file detected');
      }
    } else if (req.body.mediaType === 'video') {
      if (req.file) {
        mediaPath = req.file.path;
        console.log('✅ Video detected (file):', mediaPath);
      } else if (req.files && req.files.length > 0) {
        mediaPath = req.files[0].path;
        console.log('✅ Video detected (files[0]):', mediaPath);
      }
    } else if (req.body.mediaType === 'carousel' && req.files) {
      imagePaths = req.files.map(f => f.path);
      console.log('✅ Carousel images detected:', imagePaths);
    } else {
      console.log('⚠️ No media file detected for mediaType:', req.body.mediaType);
    }

    console.log('Received campaign data:', {
      budgetType: req.body.budgetType,
      lifetimeBudget: req.body.lifetimeBudget,
      schedule: req.body.schedule
    });
    
    // Get current/switched resources for the user
    const { FacebookAuth, UserResourceConfig } = db;
    const userId = req.userId || req.user.id;
    
    // First check for switched resources
    const activeConfig = await UserResourceConfig.getActiveConfig(userId);
    let selectedPageId, selectedAdAccountId, selectedPixelId;
    
    if (activeConfig) {
      // Use switched resources
      selectedPageId = activeConfig.pageId;
      selectedAdAccountId = activeConfig.adAccountId;
      selectedPixelId = activeConfig.pixelId;
      console.log('Using switched resources:', { selectedPageId, selectedAdAccountId, selectedPixelId });
    } else {
      // Fall back to originally selected resources
      const facebookAuth = await FacebookAuth.findOne({ where: { userId } });
      if (facebookAuth) {
        selectedPageId = facebookAuth.selectedPageId;
        selectedAdAccountId = facebookAuth.selectedAdAccountId;
        selectedPixelId = facebookAuth.selectedPixelId;
        console.log('Using original resources:', { selectedPageId, selectedAdAccountId, selectedPixelId });
      }
    }
    
    // Use request body only as last resort (backward compatibility)
    if (!selectedPageId && req.body.selectedPageId) {
      selectedPageId = req.body.selectedPageId;
    }
    
    const campaignData = {
      campaignName: req.body.campaignName,
      budgetType: req.body.budgetType || 'daily',
      dailyBudget: req.body.budgetType === 'daily' ? parseFloat(req.body.dailyBudget) : undefined,
      lifetimeBudget: req.body.budgetType === 'lifetime' ? parseFloat(req.body.lifetimeBudget) : undefined,
      urlType: req.body.urlType,
      url: req.body.url,
      primaryText: req.body.primaryText,
      headline: req.body.headline,
      description: req.body.description,
      mediaType: req.body.mediaType || 'single_image',
      callToAction: req.body.callToAction || 'LEARN_MORE',
      conversionLocation: req.body.conversionLocation || 'website',
      schedule: req.body.schedule ? JSON.parse(req.body.schedule) : null,
      targeting: req.body.targeting ? JSON.parse(req.body.targeting) : null,
      placements: req.body.placements ? JSON.parse(req.body.placements) : null,
      selectedPageId: selectedPageId,
      selectedAdAccountId: selectedAdAccountId,
      selectedPixelId: selectedPixelId,
      imagePath: req.body.mediaType === 'single_image' ? mediaPath : null,
      videoPath: req.body.mediaType === 'video' ? mediaPath : null,
      imagePaths: req.body.mediaType === 'carousel' ? imagePaths : null
    };
    
    console.log('🎨 Media paths in campaign data:', {
      mediaType: campaignData.mediaType,
      imagePath: campaignData.imagePath,
      videoPath: campaignData.videoPath,
      imagePaths: campaignData.imagePaths
    });
    
    console.log('Parsed campaign data:', {
      budgetType: campaignData.budgetType,
      lifetimeBudget: campaignData.lifetimeBudget,
      schedule: campaignData.schedule,
      conversionLocation: campaignData.conversionLocation
    });

    const result = await userFacebookApi.createCampaignStructure(campaignData);
    
    // Create resource entry for the new campaign
    if (result && result.campaign) {
      await Resource.create({
        type: 'campaign',
        externalId: result.campaign.id,
        name: campaignData.campaignName,
        metadata: {
          adSetId: result.adSet?.id,
          adIds: result.ads?.map(ad => ad.id),
          createdBy: req.userId
        }
      });

      // Automatically grant access to creator
      const campaignResource = await Resource.findOne({
        where: { 
          type: 'campaign',
          externalId: result.campaign.id
        }
      });

      if (campaignResource) {
        await PermissionService.grantResourceAccess(
          req.userId,
          campaignResource.id,
          ['read', 'write', 'delete'],
          req.userId
        );
      }
    }

    await AuditService.logRequest(req, 'campaign.create', 'campaign', result.campaign?.id);
    
    res.json({
      success: true,
      message: 'Campaign created successfully',
      data: result
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    await AuditService.logRequest(req, 'campaign.create', null, null, 'failure', error.message);
    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/create-bulk', authenticate, requireFacebookAuth, refreshFacebookToken, requirePermission('campaign', 'create'), uploadMultiple, async (req, res) => {
  try {
    const campaignData = JSON.parse(req.body.campaignData);
    const variations = JSON.parse(req.body.variations || '[]');
    
    if (!campaignData.campaignName || !campaignData.dailyBudget) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name and daily budget are required'
      });
    }

    if (campaignData.dailyBudget < 1) {
      return res.status(400).json({
        success: false,
        error: 'Daily budget must be at least $1'
      });
    }

    // Process main campaign media
    let mainMediaPath = null;
    let mainImagePaths = [];
    
    // Organize uploaded files by field name
    const filesByField = {};
    if (req.files) {
      req.files.forEach(file => {
        if (!filesByField[file.fieldname]) {
          filesByField[file.fieldname] = [];
        }
        filesByField[file.fieldname].push(file);
      });
    }
    
    // Process main campaign media
    if (campaignData.mediaType === 'single_image' && filesByField.mainImage) {
      mainMediaPath = filesByField.mainImage[0].path;
    } else if (campaignData.mediaType === 'video' && filesByField.mainVideo) {
      mainMediaPath = filesByField.mainVideo[0].path;
    } else if (campaignData.mediaType === 'carousel' && filesByField.mainImages) {
      mainImagePaths = filesByField.mainImages.map(f => f.path);
    }
    
    // Process variation media
    const processedVariations = variations.map((variation, index) => {
      const processed = { ...variation };
      
      if (variation.mediaType === 'single_image' && filesByField[`variationImage_${index}`]) {
        processed.imagePath = filesByField[`variationImage_${index}`][0].path;
      } else if (variation.mediaType === 'video' && filesByField[`variationVideo_${index}`]) {
        processed.videoPath = filesByField[`variationVideo_${index}`][0].path;
      } else if (variation.mediaType === 'carousel' && filesByField[`variationImages_${index}`]) {
        processed.imagePaths = filesByField[`variationImages_${index}`].map(f => f.path);
      }
      
      return processed;
    });

    const fullCampaignData = {
      ...campaignData,
      variations: processedVariations,
      imagePath: campaignData.mediaType === 'single_image' ? mainMediaPath : null,
      videoPath: campaignData.mediaType === 'video' ? mainMediaPath : null,
      imagePaths: campaignData.mediaType === 'carousel' ? mainImagePaths : null
    };

    const result = await facebookApi.createCampaignStructure(fullCampaignData);
    
    res.json({
      success: true,
      message: `Campaign created with ${processedVariations.length} ad variations`,
      data: result
    });
  } catch (error) {
    console.error('Bulk campaign creation error:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/validate-token', async (req, res) => {
  try {
    const axios = require('axios');
    const response = await axios.get(
      `https://graph.facebook.com/${process.env.FB_API_VERSION}/me`,
      { params: { access_token: process.env.FB_ACCESS_TOKEN } }
    );
    
    res.json({
      success: true,
      message: 'Access token is valid',
      data: response.data
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired access token'
    });
  }
});

// Link preview endpoint
router.post('/link-preview', authenticate, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.match(/^https?:\/\/.+/)) {
      return res.status(400).json({
        success: false,
        error: 'Valid URL is required'
      });
    }
    
    const { body: html } = await got(url);
    const metadata = await metascraper({ html, url });
    
    res.json({
      success: true,
      data: {
        title: metadata.title || '',
        description: metadata.description || '',
        image: metadata.image || '',
        siteName: metadata.publisher || ''
      }
    });
  } catch (error) {
    console.error('Link preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch link preview'
    });
  }
});

module.exports = router;