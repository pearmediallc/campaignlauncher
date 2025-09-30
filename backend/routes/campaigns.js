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
    
    // Get userId safely
    const userId = req.user?.id || req.userId || req.user;

    // Initialize resource variables
    let selectedAdAccountId, selectedPageId, selectedPixelId;

    // Check for switched/active resource configuration with error handling
    try {
      if (UserResourceConfig && typeof UserResourceConfig.getActiveConfig === 'function' && userId) {
        const activeConfig = await UserResourceConfig.getActiveConfig(userId).catch(err => {
          console.log('⚠️ Could not fetch active config:', err.message);
          return null;
        });

        if (activeConfig && (activeConfig.adAccountId || activeConfig.pageId)) {
          console.log('📋 Using switched resource configuration for campaign');
          selectedAdAccountId = activeConfig.adAccountId || facebookAuth.selectedAdAccount?.id;
          selectedPageId = activeConfig.pageId || facebookAuth.selectedPage?.id;
          selectedPixelId = activeConfig.pixelId || pixelId;

          if (selectedPixelId) {
            pixelId = selectedPixelId;
          }
        }
      }
    } catch (error) {
      console.log('⚠️ UserResourceConfig not available, using defaults');
    }

    // Fallback to original resources if not set
    if (!selectedAdAccountId || !selectedPageId) {
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
    
    // Get current/switched resources for the user (already handled above)
    const { FacebookAuth, UserResourceConfig } = db;
    // Note: userId, selectedPageId, selectedAdAccountId, selectedPixelId
    // are already defined above when creating FacebookAPI instance

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

    await AuditService.logRequest(req, 'campaign.create', 'campaign', result.campaign?.id, 'success', null, {
      campaignId: result.campaign?.id,
      campaignName: campaignData.campaignName,
      adAccountId: selectedAdAccountId,
      objective: campaignData.objective,
      budget: campaignData.dailyBudget || campaignData.lifetimeBudget
    });

    res.json({
      success: true,
      message: 'Campaign created successfully',
      data: result
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    await AuditService.logRequest(req, 'campaign.create', null, null, 'failure', error.message, {
      adAccountId: selectedAdAccountId
    });
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

// ============= CAMPAIGN MANAGEMENT ENDPOINTS =============

// Edit campaign (name, status, budget)
router.put('/:campaignId/edit', authenticate, requireFacebookAuth, refreshFacebookToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { name, status, daily_budget, lifetime_budget } = req.body;
    const userId = req.user.id;

    // Use token from middleware (already validated and decrypted)
    const accessToken = req.facebookAuth.accessToken;
    const facebookApi = new FacebookAPI({ accessToken });

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (daily_budget) updateData.daily_budget = Math.round(daily_budget * 100); // Convert to cents
    if (lifetime_budget) updateData.lifetime_budget = Math.round(lifetime_budget * 100);

    // Update campaign on Facebook
    const updatedCampaign = await facebookApi.updateCampaign(campaignId, updateData);

    // Audit log
    await AuditService.log({
      userId,
      action: 'campaign_edit',
      resource: 'campaign',
      resourceId: campaignId,
      details: {
        campaignId,
        changes: updateData
      },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: updatedCampaign
    });
  } catch (error) {
    console.error('Campaign edit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: error.message
    });
  }
});

// Duplicate campaign
router.post('/:campaignId/duplicate', authenticate, requireFacebookAuth, refreshFacebookToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { new_name, number_of_copies } = req.body;
    const userId = req.user.id;

    if (!new_name) {
      return res.status(400).json({
        success: false,
        message: 'New campaign name is required'
      });
    }

    // Validate and parse number of copies (default to 1, max 10)
    const numberOfCopies = Math.min(Math.max(parseInt(number_of_copies) || 1, 1), 10);
    console.log(`📋 Campaign duplication request: ${numberOfCopies} copies of campaign ${campaignId}`);

    // Use token from middleware (already validated and decrypted)
    const accessToken = req.facebookAuth.accessToken;
    const facebookAuth = req.facebookAuth.authRecord;

    // CRITICAL FIX: Get user's selected resources (same as strategy150.js)
    let selectedAdAccountId, selectedPageId, selectedPixelId;

    try {
      const { UserResourceConfig } = require('../models');
      const userId = req.user?.id || req.userId;

      if (UserResourceConfig && typeof UserResourceConfig.getActiveConfig === 'function' && userId) {
        const activeConfig = await UserResourceConfig.getActiveConfig(userId).catch(err => {
          console.log('⚠️ Could not fetch active config for duplication:', err.message);
          return null;
        });

        if (activeConfig && (activeConfig.adAccountId || activeConfig.pageId)) {
          console.log('📋 Using switched resource configuration for duplication');
          selectedAdAccountId = activeConfig.adAccountId || facebookAuth.selectedAdAccount?.id;
          selectedPageId = activeConfig.pageId || facebookAuth.selectedPage?.id;
          selectedPixelId = activeConfig.pixelId || facebookAuth.selectedPixel?.id;
        }
      }
    } catch (error) {
      console.log('⚠️ UserResourceConfig not available for duplication, using defaults');
    }

    // Fallback to original resources if not set
    if (!selectedAdAccountId) {
      selectedAdAccountId = facebookAuth.selectedAdAccount?.id;
    }
    if (!selectedPageId) {
      selectedPageId = facebookAuth.selectedPage?.id;
    }
    if (!selectedPixelId) {
      selectedPixelId = facebookAuth.selectedPixel?.id;
    }

    // Create FacebookAPI instance with ALL selected resources (same as strategy150.js)
    const facebookApi = new FacebookAPI({
      accessToken: accessToken,
      adAccountId: (selectedAdAccountId || facebookAuth.selectedAdAccount.id).replace('act_', ''),
      pageId: selectedPageId || facebookAuth.selectedPage.id,
      pixelId: selectedPixelId
    });

    // Use smart duplication that handles both small and large campaigns
    // Supports multiple copies as requested
    const newCampaigns = await facebookApi.duplicateCampaign(campaignId, new_name, numberOfCopies);

    // Handle both single and multiple campaign results
    const campaigns = Array.isArray(newCampaigns) ? newCampaigns : [newCampaigns];

    // Audit log for each created campaign
    for (const campaign of campaigns) {
      await AuditService.log({
        userId,
        action: 'campaign_duplicate',
        resource: 'campaign',
        resourceId: campaign.id,
        details: {
          originalCampaignId: campaignId,
          newCampaignId: campaign.id,
          newName: campaign.name,
          adAccountId: selectedAdAccountId,
          copyNumber: campaign.copyNumber || 1,
          totalCopies: numberOfCopies
        },
        ip: req.ip
      });
    }

    // Check for errors in the results
    const failedCampaigns = campaigns.filter(c => !c.success && !c.partialSuccess);
    const partialSuccessCampaigns = campaigns.filter(c => c.partialSuccess);
    const successfulCampaigns = campaigns.filter(c => c.success);

    // Format error details for UI display
    const errorDetails = [];
    campaigns.forEach(campaign => {
      if (campaign.errors && campaign.errors.length > 0) {
        errorDetails.push({
          campaignId: campaign.originalCampaignId,
          campaignName: campaign.originalCampaignName,
          newCampaignId: campaign.campaign?.id || null,
          newCampaignName: campaign.campaign?.name || campaign.newName || 'Failed to create',
          errors: campaign.errors.map(err => ({
            stage: err.stage,
            message: err.message,
            details: err.details?.error_user_msg || err.details?.message || null
          })),
          stats: {
            adSetsCreated: campaign.totalAdSets,
            adSetsExpected: 50,
            adsCreated: campaign.totalAds,
            adsExpected: campaign.totalAdSets
          }
        });
      }
    });

    const overallSuccess = failedCampaigns.length === 0 && partialSuccessCampaigns.length === 0;

    res.json({
      success: overallSuccess,
      message: overallSuccess
        ? (numberOfCopies > 1
            ? `Successfully created ${campaigns.length} campaign copies`
            : 'Campaign duplicated successfully')
        : `Duplication completed with ${errorDetails.length} issues`,
      data: numberOfCopies === 1 ? campaigns[0] : campaigns,
      copiesCreated: successfulCampaigns.length,
      copiesPartial: partialSuccessCampaigns.length,
      copiesFailed: failedCampaigns.length,
      copiesRequested: numberOfCopies,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      requiresAttention: errorDetails.length > 0
    });
  } catch (error) {
    console.error('Campaign duplicate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate campaign',
      error: error.message
    });
  }
});

// Update campaign budget
router.put('/:campaignId/budget', authenticate, requireFacebookAuth, refreshFacebookToken, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { daily_budget, lifetime_budget, bid_amount } = req.body;
    const userId = req.user.id;

    if (!daily_budget && !lifetime_budget && !bid_amount) {
      return res.status(400).json({
        success: false,
        message: 'At least one budget parameter is required'
      });
    }

    // Use token from middleware (already validated and decrypted)
    const accessToken = req.facebookAuth.accessToken;
    const facebookApi = new FacebookAPI({ accessToken });

    // Prepare budget update
    const budgetUpdate = {};
    if (daily_budget) budgetUpdate.daily_budget = Math.round(daily_budget * 100);
    if (lifetime_budget) budgetUpdate.lifetime_budget = Math.round(lifetime_budget * 100);
    if (bid_amount) budgetUpdate.bid_amount = Math.round(bid_amount * 100);

    // Update campaign budget
    const updatedCampaign = await facebookApi.updateCampaign(campaignId, budgetUpdate);

    // Get campaign details for ad account
    const facebookAuth = req.facebookAuth.authRecord;
    const activeConfig = await UserResourceConfig.getActiveConfig(userId).catch(() => null);
    const selectedAdAccountId = activeConfig?.adAccountId || facebookAuth.selectedAdAccount?.id;

    // Audit log
    await AuditService.log({
      userId,
      action: 'campaign_budget_update',
      resource: 'campaign',
      resourceId: campaignId,
      details: {
        campaignId,
        adAccountId: selectedAdAccountId,
        budgetChanges: {
          daily_budget,
          lifetime_budget,
          bid_amount
        }
      },
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Budget updated successfully',
      data: updatedCampaign
    });
  } catch (error) {
    console.error('Budget update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update budget',
      error: error.message
    });
  }
});

// Batch operations (pause, activate, duplicate multiple campaigns)
router.post('/batch', authenticate, requireFacebookAuth, refreshFacebookToken, async (req, res) => {
  try {
    const { campaign_ids, action, options = {} } = req.body;
    const userId = req.user.id;

    if (!campaign_ids || !Array.isArray(campaign_ids) || campaign_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Campaign IDs array is required'
      });
    }

    if (!['pause', 'activate', 'duplicate'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be pause, activate, or duplicate'
      });
    }

    // Use token from middleware (already validated and decrypted)
    const accessToken = req.facebookAuth.accessToken;
    const facebookApi = new FacebookAPI({ accessToken });
    const facebookAuth = req.facebookAuth.authRecord;

    const results = [];
    const errors = [];

    // Process each campaign
    for (const campaignId of campaign_ids) {
      try {
        let result;

        switch (action) {
          case 'pause':
            result = await facebookApi.updateCampaign(campaignId, { status: 'PAUSED' });
            break;

          case 'activate':
            result = await facebookApi.updateCampaign(campaignId, { status: 'ACTIVE' });
            break;

          case 'duplicate':
            const originalCampaign = await facebookApi.getCampaignFullDetails(campaignId);
            const duplicateData = {
              name: `${originalCampaign.name} - Copy`,
              objective: originalCampaign.objective,
              status: 'PAUSED',
              daily_budget: originalCampaign.daily_budget,
              lifetime_budget: originalCampaign.lifetime_budget,
              special_ad_categories: originalCampaign.special_ad_categories || []
            };

            const adAccountId = facebookAuth.selectedAdAccount?.id || facebookAuth.adAccounts?.[0]?.id;
            result = await facebookApi.createCampaignFromExisting(adAccountId, duplicateData);
            break;
        }

        results.push({
          campaignId,
          success: true,
          result
        });
      } catch (error) {
        errors.push({
          campaignId,
          success: false,
          error: error.message
        });
      }
    }

    // Audit log
    await AuditService.log({
      userId,
      action: `campaign_batch_${action}`,
      resource: 'campaign',
      resourceId: campaign_ids.join(','),
      details: {
        action,
        campaign_ids,
        successful: results.length,
        failed: errors.length
      },
      ip: req.ip
    });

    res.json({
      success: true,
      message: `Batch ${action} completed`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: campaign_ids.length,
          successful: results.length,
          failed: errors.length
        }
      }
    });
  } catch (error) {
    console.error('Batch operation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform batch operation',
      error: error.message
    });
  }
});

module.exports = router;