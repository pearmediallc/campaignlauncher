const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const FacebookAPI = require('../services/facebookApi');
const { authenticate, requirePermission } = require('../middleware/auth');
const { requireFacebookAuth, refreshFacebookToken } = require('../middleware/facebookAuth');
const AuditService = require('../services/AuditService');
const { uploadSingle } = require('../middleware/upload');
const db = require('../models');
const { decryptToken } = require('./facebookSDKAuth');

// Get OAuth resources (pages, pixels, business managers) for form population
router.get('/resources', authenticate, async (req, res) => {
  try {
    const { FacebookAuth } = db;
    const userId = req.user?.id || req.userId;

    // Get user's Facebook auth data
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.json({
        pages: [],
        pixels: [],
        businessManagers: [],
        adAccounts: [],
        hasAuth: false
      });
    }

    // Parse resources from stored data
    let pages = [];
    let pixels = [];
    let businessManagers = [];
    let adAccounts = [];

    try {
      if (facebookAuth.pages) {
        pages = typeof facebookAuth.pages === 'string'
          ? JSON.parse(facebookAuth.pages)
          : facebookAuth.pages;
      }
    } catch (e) {
      console.log('Error parsing pages:', e);
    }

    try {
      if (facebookAuth.pixels) {
        pixels = typeof facebookAuth.pixels === 'string'
          ? JSON.parse(facebookAuth.pixels)
          : facebookAuth.pixels;
      }
    } catch (e) {
      console.log('Error parsing pixels:', e);
    }

    try {
      if (facebookAuth.businessAccounts) {
        businessManagers = typeof facebookAuth.businessAccounts === 'string'
          ? JSON.parse(facebookAuth.businessAccounts)
          : facebookAuth.businessAccounts;
      }
    } catch (e) {
      console.log('Error parsing business managers:', e);
    }

    try {
      if (facebookAuth.adAccounts) {
        adAccounts = typeof facebookAuth.adAccounts === 'string'
          ? JSON.parse(facebookAuth.adAccounts)
          : facebookAuth.adAccounts;
      }
    } catch (e) {
      console.log('Error parsing ad accounts:', e);
    }

    // Get selected values
    const selectedPage = facebookAuth.selectedPage || null;
    const selectedPixel = facebookAuth.selectedPixel || null;
    const selectedAdAccount = facebookAuth.selectedAdAccount || null;

    res.json({
      pages,
      pixels,
      businessManagers,
      adAccounts,
      selectedPage,
      selectedPixel,
      selectedAdAccount,
      hasAuth: true
    });
  } catch (error) {
    console.error('Error fetching OAuth resources:', error);
    res.status(500).json({
      error: 'Failed to fetch resources',
      pages: [],
      pixels: [],
      businessManagers: [],
      adAccounts: [],
      hasAuth: false
    });
  }
});

// Strategy 150 validation rules - Meta compliant
const validateStrategy150 = [
  // Campaign level validations
  body('campaignName').notEmpty().withMessage('Campaign name is required'),
  body('buyingType').optional().isIn(['AUCTION', 'RESERVED']).withMessage('Invalid buying type'),
  body('objective').notEmpty().withMessage('Objective is required'),
  body('budgetLevel').optional().isIn(['campaign', 'adset']).withMessage('Invalid budget level'),
  body('specialAdCategories').optional().isArray(),
  body('campaignBudgetOptimization').optional().isBoolean(),
  body('bidStrategy').optional().isIn([
    'LOWEST_COST_WITHOUT_CAP',
    'LOWEST_COST_WITH_BID_CAP',
    'COST_CAP',
    'LOWEST_COST_WITH_MIN_ROAS'
  ]),

  // Campaign budget validations
  body('campaignBudget.dailyBudget')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Campaign daily budget must be at least $1'),
  body('campaignBudget.lifetimeBudget')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Campaign lifetime budget must be at least $1'),

  // Ad set level validations
  body('performanceGoal').optional(),
  body('pixel').optional(),
  body('conversionEvent').optional(),
  body('attributionSetting').optional(),
  body('attributionWindow').optional(),

  // Ad set budget & schedule validations
  body('adSetBudget.dailyBudget')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Ad set daily budget must be at least $1'),
  body('adSetBudget.lifetimeBudget')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Ad set lifetime budget must be at least $1'),
  body('adSetBudget.startDate').optional().isISO8601(),
  body('adSetBudget.endDate').optional().isISO8601(),
  body('adSetBudget.scheduleType').optional().isIn(['run_continuously', 'scheduled']),
  body('adSetBudget.spendingLimits.daily').optional().isFloat({ min: 0 }),
  body('adSetBudget.spendingLimits.lifetime').optional().isFloat({ min: 0 }),
  body('adSetBudget.dayparting').optional().isArray(),

  // Targeting validations
  body('targeting.locations.countries').optional().isArray(),
  body('targeting.ageMin').optional().isInt({ min: 13, max: 65 }),
  body('targeting.ageMax').optional().isInt({ min: 13, max: 65 }),
  body('targeting.genders').optional().isArray(),
  body('targeting.languages').optional().isArray(),
  body('targeting.detailedTargeting').optional().isObject(),
  body('targeting.customAudiences').optional().isArray(),
  body('targeting.lookalikeAudiences').optional().isArray(),

  // Placement validations
  body('placementType').optional().isIn(['automatic', 'manual']),
  body('placements.facebook').optional().isArray(),
  body('placements.instagram').optional().isArray(),
  body('placements.messenger').optional().isArray(),
  body('placements.audienceNetwork').optional().isArray(),
  body('placements.devices').optional().isArray(),
  body('placements.platforms').optional().isArray(),

  // Ad level validations
  body('facebookPage').optional(),
  body('instagramAccount').optional(),
  body('urlType').optional().isIn([
    'website',
    'app_deeplink',
    'facebook_event',
    'messenger',
    'whatsapp',
    'lead_gen',
    'call',
    'none'
  ]),
  body('url').optional(),
  body('primaryText')
    .notEmpty()
    .withMessage('Primary text is required')
    .isLength({ max: 125 })
    .withMessage('Primary text must be 125 characters or less'),
  body('headline')
    .notEmpty()
    .withMessage('Headline is required')
    .isLength({ max: 40 })
    .withMessage('Headline must be 40 characters or less'),
  body('description')
    .optional()
    .isLength({ max: 30 })
    .withMessage('Description must be 30 characters or less'),
  body('callToAction').optional(),
  body('displayLink').optional(),

  // Media specifications
  body('mediaType').optional().isIn(['single_image', 'single_video', 'carousel']),
  body('mediaSpecs').optional().isObject(),

  // Duplication settings for 49 ad sets
  body('duplicationSettings.defaultBudgetPerAdSet')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Default budget per ad set must be at least $1'),
  body('duplicationSettings.budgetDistributionType')
    .optional()
    .isIn(['equal', 'custom', 'weighted']),
  body('duplicationSettings.customBudgets').optional().isArray(),

  // Process control
  body('publishDirectly').optional().isBoolean()
];

// Create initial campaign (1-1-1)
router.post('/create', authenticate, requireFacebookAuth, refreshFacebookToken, requirePermission('campaign', 'create'), uploadSingle, validateStrategy150, async (req, res) => {
  try {
    console.log('📝 Strategy 1-50-1 creation request received:', {
      body: req.body,
      hasFile: !!req.file,
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

    if (!facebookAuth.selectedPage) {
      return res.status(400).json({
        error: 'Please select a Facebook page before creating campaigns'
      });
    }

    // Get pixel ID - either from selected pixel or fetch from ad account
    let pixelId = facebookAuth.selectedPixel?.id;

    // Check if token exists and decrypt it
    if (!facebookAuth.accessToken) {
      return res.status(401).json({
        error: 'Facebook access token not found. Please reconnect your Facebook account.',
        requiresReauth: true
      });
    }

    let decryptedToken;
    if (facebookAuth.accessToken.startsWith('{')) {
      decryptedToken = decryptToken(facebookAuth.accessToken);
      if (!decryptedToken) {
        return res.status(401).json({
          error: 'Failed to decrypt access token. Please reconnect your Facebook account.',
          requiresReauth: true
        });
      }
    } else {
      return res.status(401).json({
        error: 'Invalid access token. Please reconnect your Facebook account.',
        requiresReauth: true
      });
    }

    // If no pixel selected, fetch the ad account's pixels
    if (!pixelId && req.body.conversionLocation === 'website') {
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

        if (pixelsResponse.data.data && pixelsResponse.data.data.length > 0) {
          pixelId = pixelsResponse.data.data[0].id;
          console.log(`Using ad account's pixel: ${pixelsResponse.data.data[0].name} (${pixelId})`);
        }
      } catch (error) {
        console.log('Could not fetch pixels for ad account:', error.message);
      }
    }

    // Create FacebookAPI instance with user credentials
    const userFacebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: facebookAuth.selectedAdAccount.id.replace('act_', ''),
      pageId: facebookAuth.selectedPage.id,
      pixelId: pixelId
    });

    // Get current/switched resources for the user
    const { FacebookAuth, UserResourceConfig } = db;
    const userId = req.userId || req.user.id;

    const activeConfig = await UserResourceConfig.getActiveConfig(userId);
    let selectedPageId, selectedAdAccountId, selectedPixelId;

    if (activeConfig) {
      selectedPageId = activeConfig.pageId;
      selectedAdAccountId = activeConfig.adAccountId;
      selectedPixelId = activeConfig.pixelId;
    } else {
      const facebookAuth = await FacebookAuth.findOne({ where: { userId } });
      if (facebookAuth) {
        selectedPageId = facebookAuth.selectedPageId;
        selectedAdAccountId = facebookAuth.selectedAdAccountId;
        selectedPixelId = facebookAuth.selectedPixelId;
      }
    }

    if (!selectedPageId && req.body.selectedPageId) {
      selectedPageId = req.body.selectedPageId;
    }

    // Handle media files
    let mediaPath = null;
    let imagePaths = [];

    if (req.body.mediaType === 'single_image') {
      if (req.file) {
        mediaPath = req.file.path;
      }
    } else if (req.body.mediaType === 'video') {
      if (req.file) {
        mediaPath = req.file.path;
      }
    } else if (req.body.mediaType === 'carousel' && req.files) {
      imagePaths = req.files.map(f => f.path);
    }

    // Prepare campaign data with all Meta-compliant Strategy 150 fields
    const campaignData = {
      // Campaign level fields
      campaignName: req.body.campaignName,
      buyingType: req.body.buyingType || 'AUCTION',
      objective: req.body.objective,
      budgetLevel: req.body.budgetLevel || 'adset',
      specialAdCategories: req.body.specialAdCategories || [],
      campaignBudgetOptimization: req.body.campaignBudgetOptimization || false,
      bidStrategy: req.body.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',

      // Campaign budget (when using CBO)
      campaignBudget: req.body.campaignBudget || {},
      campaignSpendingLimit: req.body.campaignSpendingLimit,

      // Ad set level fields
      performanceGoal: req.body.performanceGoal || 'maximize_conversions',
      pixel: req.body.pixel || pixelId, // Use provided pixel or fallback to selected
      manualPixelId: req.body.manualPixelId, // For manual pixel entry
      conversionEvent: req.body.conversionEvent || 'Lead',
      attributionSetting: req.body.attributionSetting || 'standard',
      attributionWindow: req.body.attributionWindow || '7_day',

      // Ad set budget & schedule
      adSetBudget: req.body.adSetBudget || {
        dailyBudget: 50,
        scheduleType: 'run_continuously'
      },
      budgetType: req.body.budgetType || 'daily',

      // Enhanced targeting (Meta-compliant)
      targeting: req.body.targeting || {
        locations: { countries: ['US'] },
        ageMin: 18,
        ageMax: 65,
        genders: ['all']
      },

      // Placement settings
      placementType: req.body.placementType || 'automatic',
      placements: req.body.placements || {
        facebook: ['feed', 'stories'],
        instagram: ['stream', 'stories'],
        audienceNetwork: ['classic'],
        messenger: [],
        devices: ['mobile', 'desktop'],
        platforms: ['all']
      },

      // Ad level fields
      facebookPage: req.body.facebookPage || selectedPageId,
      instagramAccount: req.body.instagramAccount,
      urlType: req.body.urlType || 'website',
      url: req.body.url,
      primaryText: req.body.primaryText,
      headline: req.body.headline,
      description: req.body.description,
      callToAction: req.body.callToAction || 'LEARN_MORE',
      displayLink: req.body.displayLink,

      // Media specifications
      mediaType: req.body.mediaType || 'single_image',
      mediaSpecs: req.body.mediaSpecs,
      imagePath: req.body.mediaType === 'single_image' ? mediaPath : null,
      videoPath: req.body.mediaType === 'single_video' ? mediaPath : null,
      imagePaths: req.body.mediaType === 'carousel' ? imagePaths : null,

      // Duplication settings for the 49 ad sets
      duplicationSettings: req.body.duplicationSettings || {
        defaultBudgetPerAdSet: 1,
        budgetDistributionType: 'equal'
      },

      // Process control
      publishDirectly: req.body.publishDirectly || false,

      // System fields
      selectedPageId: selectedPageId,
      selectedAdAccountId: selectedAdAccountId,
      selectedPixelId: selectedPixelId || req.body.pixel,

      // Additional Meta options
      costCap: req.body.costCap,
      minRoas: req.body.minRoas,
      conversionLocation: req.body.conversionLocation || 'website'
    };

    console.log('Creating Strategy 1-50-1 campaign with data:', {
      campaignName: campaignData.campaignName,
      buyingType: campaignData.buyingType,
      objective: campaignData.objective,
      performanceGoal: campaignData.performanceGoal,
      publishDirectly: campaignData.publishDirectly
    });

    // Create the initial 1-1-1 campaign structure
    const result = await userFacebookApi.createStrategy150Campaign(campaignData);

    await AuditService.logRequest(req, 'strategy150.create', 'campaign', result.campaign?.id);

    res.json({
      success: true,
      message: 'Strategy 1-50-1 initial campaign created successfully',
      data: {
        phase: 'initial',
        campaign: result.campaign,
        adSet: result.adSet,
        ads: result.ads
      }
    });
  } catch (error) {
    console.error('Strategy 1-50-1 creation error:', error);
    await AuditService.logRequest(req, 'strategy150.create', null, null, 'failure', error.message);
    res.status(error.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

// Get post ID from created ad
router.get('/post-id/:adId', authenticate, requireFacebookAuth, async (req, res) => {
  try {
    const { adId } = req.params;

    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId: req.user.id, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(401).json({
        error: 'Facebook authentication required',
        requiresReauth: true
      });
    }

    let decryptedToken;
    if (facebookAuth.accessToken.startsWith('{')) {
      decryptedToken = decryptToken(facebookAuth.accessToken);
    } else {
      return res.status(401).json({
        error: 'Invalid access token format',
        requiresReauth: true
      });
    }

    const userFacebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: facebookAuth.selectedAdAccount.id.replace('act_', ''),
      pageId: facebookAuth.selectedPage.id
    });

    const postId = await userFacebookApi.getPostIdFromAd(adId);

    if (postId) {
      res.json({
        success: true,
        postId: postId
      });
    } else {
      res.json({
        success: false,
        requiresManualInput: true,
        error: 'Could not automatically capture post ID'
      });
    }
  } catch (error) {
    console.error('Post ID capture error:', error);
    res.status(500).json({
      success: false,
      requiresManualInput: true,
      error: error.message
    });
  }
});

// Verify post ID
router.get('/verify-post/:postId', authenticate, requireFacebookAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId: req.user.id, isActive: true }
    });

    let decryptedToken;
    if (facebookAuth.accessToken.startsWith('{')) {
      decryptedToken = decryptToken(facebookAuth.accessToken);
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid access token format'
      });
    }

    // Verify post exists by trying to fetch it
    const axios = require('axios');
    try {
      await axios.get(`https://graph.facebook.com/v18.0/${postId}`, {
        params: {
          access_token: decryptedToken,
          fields: 'id,message,created_time'
        }
      });

      res.json({ success: true });
    } catch (error) {
      res.json({
        success: false,
        error: 'Post ID not found or inaccessible'
      });
    }
  } catch (error) {
    console.error('Post ID verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Duplicate ad sets (1-49-1)
router.post('/duplicate', authenticate, requireFacebookAuth, async (req, res) => {
  try {
    const {
      campaignId,
      originalAdSetId,
      postId,
      formData,
      count = 49,
      duplicateBudgets = [] // Array of custom budgets for each duplicate
    } = req.body;

    if (!campaignId || !originalAdSetId || !postId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID, Ad Set ID, and Post ID are required'
      });
    }

    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId: req.user.id, isActive: true }
    });

    let decryptedToken;
    if (facebookAuth.accessToken.startsWith('{')) {
      decryptedToken = decryptToken(facebookAuth.accessToken);
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid access token format'
      });
    }

    const userFacebookApi = new FacebookAPI({
      accessToken: decryptedToken,
      adAccountId: facebookAuth.selectedAdAccount.id.replace('act_', ''),
      pageId: facebookAuth.selectedPage.id
    });

    // Start the duplication process with custom budgets
    const duplicateData = {
      campaignId,
      originalAdSetId,
      postId,
      count,
      formData,
      userId: req.user.id
    };

    // If custom budgets provided, use them; otherwise default to $1 for each
    if (duplicateBudgets && duplicateBudgets.length > 0) {
      duplicateData.customBudgets = duplicateBudgets;
    } else {
      // Default to $1 for each duplicated ad set
      duplicateData.customBudgets = Array(count).fill(1.00);
    }

    userFacebookApi.duplicateAdSetsWithExistingPost(duplicateData);

    res.json({
      success: true,
      message: 'Duplication process started',
      data: {
        campaignId,
        count,
        status: 'in_progress'
      }
    });
  } catch (error) {
    console.error('Duplication start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get duplication progress
router.get('/progress/:campaignId', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.params;

    // This would typically fetch progress from a database or cache
    // For now, return mock progress data
    const progress = {
      completed: Math.floor(Math.random() * 50),
      total: 49,
      currentOperation: 'Creating ad set copy 23...',
      adSets: [
        { id: 'adset_1', name: 'Test AdSet - Copy 1' },
        { id: 'adset_2', name: 'Test AdSet - Copy 2' },
        // ... more ad sets
      ],
      errors: []
    };

    res.json(progress);
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;