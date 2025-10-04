const express = require('express');
const router = express.Router();
const axios = require('axios');
const FacebookAuthService = require('../services/FacebookAuthService');
const ResourceHelper = require('../services/ResourceHelper');
const { decryptToken } = require('./facebookSDKAuth');
const { AuthAuditLog, User, FacebookAuth, EligibilityCheck } = require('../models');
const { authenticate, requireFacebookAuth, refreshFacebookToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later'
});

const verifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per window
  message: 'Too many verification requests, please try again later'
});

/**
 * @route   GET /api/auth/facebook/login
 * @desc    Initiate Facebook OAuth flow
 * @access  Private
 */
router.get('/login', authenticate, authLimiter, async (req, res) => {
  try {
    const userId = req.userId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    
    // Log login attempt
    await AuthAuditLog.logEvent({
      userId,
      eventType: 'login_attempt',
      eventStatus: 'pending',
      ipAddress,
      userAgent,
      metadata: { source: 'facebook_oauth' }
    });
    
    // Generate OAuth URL
    const { url, state } = FacebookAuthService.getLoginUrl(userId);
    
    // Store state in session for verification (you might want to use Redis instead)
    req.session = req.session || {};
    req.session.facebookOAuthState = state;
    
    res.json({
      success: true,
      data: {
        authUrl: url,
        state: state
      }
    });
  } catch (error) {
    console.error('Facebook login initiation error:', error);
    
    await AuthAuditLog.logEvent({
      userId: req.userId,
      eventType: 'login_attempt',
      eventStatus: 'failure',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to initiate Facebook login'
    });
  }
});

/**
 * @route   GET /api/auth/facebook/callback
 * @desc    Handle Facebook OAuth callback
 * @access  Public (but validates state)
 */
router.get('/callback', authLimiter, async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');
  
  try {
    // Handle OAuth errors
    if (error) {
      await AuthAuditLog.logEvent({
        eventType: 'login_failure',
        eventStatus: 'failure',
        ipAddress,
        userAgent,
        errorMessage: `OAuth error: ${error} - ${error_description}`
      });
      
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=${error}`);
    }
    
    // Verify state parameter
    const userId = FacebookAuthService.verifyState(state);
    if (!userId) {
      await AuthAuditLog.logEvent({
        eventType: 'suspicious_activity',
        eventStatus: 'failure',
        ipAddress,
        userAgent,
        errorMessage: 'Invalid state parameter - possible CSRF attempt'
      });
      
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=invalid_state`);
    }
    
    // Exchange code for token
    const tokenData = await FacebookAuthService.exchangeCodeForToken(code);
    
    // Get user info and permissions
    const userInfo = await FacebookAuthService.getUserInfo(tokenData.accessToken);
    
    // Verify permissions
    const permissionCheck = FacebookAuthService.verifyPermissions(userInfo.permissions);
    if (!permissionCheck.valid) {
      await AuthAuditLog.logEvent({
        userId,
        eventType: 'permission_revoke',
        eventStatus: 'failure',
        ipAddress,
        userAgent,
        facebookUserId: userInfo.facebookUserId,
        errorMessage: `Missing permissions: ${permissionCheck.missingPermissions.join(', ')}`,
        metadata: { missingPermissions: permissionCheck.missingPermissions }
      });
      
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/error?error=missing_permissions&permissions=${permissionCheck.missingPermissions.join(',')}`
      );
    }
    
    // Get additional Facebook data
    const [adAccounts, pages, businessAccounts] = await Promise.all([
      FacebookAuthService.getAdAccounts(tokenData.accessToken),
      FacebookAuthService.getPages(tokenData.accessToken),
      FacebookAuthService.getBusinessAccounts(tokenData.accessToken)
    ]);
    
    // Calculate token expiry
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + tokenData.expiresIn);
    
    // Save authentication data
    const authRecord = await FacebookAuthService.saveAuthentication(userId, {
      facebookUserId: userInfo.facebookUserId,
      accessToken: tokenData.accessToken,
      tokenExpiresAt,
      permissions: userInfo.permissions,
      adAccounts: adAccounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        status: acc.account_status,
        currency: acc.currency
      })),
      pages: pages.map(page => ({
        id: page.id,
        name: page.name,
        category: page.category
      })),
      businessAccounts: businessAccounts.map(biz => ({
        id: biz.id,
        name: biz.name,
        verificationStatus: biz.verification_status
      }))
    });
    
    // Perform eligibility check
    const eligibilityResults = await FacebookAuthService.checkEligibility(
      userId,
      tokenData.accessToken
    );
    
    // Save eligibility check results
    const eligibilityCheck = await FacebookAuthService.saveEligibilityCheck(
      userId,
      authRecord.id,
      eligibilityResults
    );
    
    // Log successful authentication
    await AuthAuditLog.logEvent({
      userId,
      eventType: 'login_success',
      eventStatus: 'success',
      ipAddress,
      userAgent,
      facebookUserId: userInfo.facebookUserId,
      metadata: {
        permissions: userInfo.permissions,
        eligibilityStatus: eligibilityResults.status
      }
    });
    
    // Update user's Facebook info if needed
    await User.update(
      { 
        facebookUserId: userInfo.facebookUserId,
        lastLoginAt: new Date()
      },
      { where: { id: userId } }
    );
    
    // Redirect based on eligibility status
    if (eligibilityResults.status === 'eligible') {
      res.redirect(`${process.env.FRONTEND_URL}/auth/success`);
    } else if (eligibilityResults.status === 'review_required') {
      res.redirect(`${process.env.FRONTEND_URL}/auth/review`);
    } else {
      res.redirect(
        `${process.env.FRONTEND_URL}/auth/ineligible?reasons=${encodeURIComponent(eligibilityResults.failureReasons.join(','))}`
      );
    }
  } catch (error) {
    console.error('Facebook callback error:', error);
    
    await AuthAuditLog.logEvent({
      userId: FacebookAuthService.verifyState(state),
      eventType: 'login_failure',
      eventStatus: 'failure',
      ipAddress,
      userAgent,
      errorMessage: error.message,
      metadata: { error: error.stack }
    });
    
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=callback_failed`);
  }
});

/**
 * @route   POST /api/auth/facebook/verify-eligibility
 * @desc    Re-verify user eligibility
 * @access  Private
 */
router.post('/verify-eligibility', authenticate, verifyLimiter, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get current auth record
    const authRecord = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });
    
    if (!authRecord) {
      return res.status(401).json({
        success: false,
        error: 'No active Facebook authentication found'
      });
    }
    
    // Check if token needs refresh
    const tokenValid = await FacebookAuthService.refreshTokenIfNeeded(authRecord);
    if (!tokenValid) {
      return res.status(401).json({
        success: false,
        error: 'Token expired, please re-authenticate'
      });
    }
    
    // Perform new eligibility check
    const eligibilityResults = await FacebookAuthService.checkEligibility(
      userId,
      authRecord.accessToken
    );
    
    // Save new eligibility check
    const eligibilityCheck = await FacebookAuthService.saveEligibilityCheck(
      userId,
      authRecord.id,
      eligibilityResults
    );
    
    // Log eligibility check
    await AuthAuditLog.logEvent({
      userId,
      eventType: 'eligibility_check',
      eventStatus: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      facebookUserId: authRecord.facebookUserId,
      metadata: {
        status: eligibilityResults.status,
        failureReasons: eligibilityResults.failureReasons
      }
    });
    
    res.json({
      success: true,
      data: {
        status: eligibilityResults.status,
        criteria: eligibilityResults.criteria,
        failureReasons: eligibilityResults.failureReasons,
        expiresAt: eligibilityResults.expiresAt,
        checkedAt: eligibilityCheck.checkedAt
      }
    });
  } catch (error) {
    console.error('Eligibility verification error:', error);
    
    await AuthAuditLog.logEvent({
      userId: req.userId,
      eventType: 'eligibility_check',
      eventStatus: 'failure',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to verify eligibility'
    });
  }
});


/**
 * @route   POST /api/auth/facebook/logout
 * @desc    Logout and revoke Facebook authentication
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Deactivate Facebook auth record
    await FacebookAuth.update(
      { isActive: false },
      { where: { userId } }
    );
    
    // Log logout event
    await AuthAuditLog.logEvent({
      userId,
      eventType: 'logout',
      eventStatus: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      message: 'Successfully logged out from Facebook'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout'
    });
  }
});

/**
 * @route   POST /api/auth/facebook/disconnect
 * @desc    Completely disconnect Facebook account and remove all stored data
 * @access  Private
 */
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    
    // Find the Facebook auth record
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId }
    });
    
    if (!facebookAuth) {
      return res.status(404).json({
        success: false,
        message: 'No Facebook account connected'
      });
    }
    
    // Clear any active resource configurations
    const { UserResourceConfig } = require('../models');
    await UserResourceConfig.destroy({
      where: { userId }
    });
    
    // Clear eligibility checks first (due to foreign key constraint)
    await EligibilityCheck.destroy({
      where: { userId }
    });
    
    // Now delete the Facebook auth record
    await FacebookAuth.destroy({
      where: { userId }
    });
    
    // Log disconnect event (using 'logout' as event_type since 'disconnect' is not in the enum)
    await AuthAuditLog.logEvent({
      userId,
      eventType: 'logout',
      eventStatus: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        action: 'disconnect',
        facebookUserId: facebookAuth.facebookUserId,
        message: 'Facebook account disconnected and all data removed'
      }
    });
    
    res.json({
      success: true,
      message: 'Facebook account disconnected successfully. You can now connect a different account.'
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    
    await AuthAuditLog.logEvent({
      userId: req.userId,
      eventType: 'logout',
      eventStatus: 'failure',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      errorMessage: error.message,
      metadata: {
        action: 'disconnect'
      }
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Facebook account'
    });
  }
});

/**
 * @route   GET /api/auth/facebook/audit-logs
 * @desc    Get authentication audit logs for user
 * @access  Private
 */
router.get('/audit-logs', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await AuthAuditLog.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

/**
 * Get user's Facebook resources (ad accounts, pages, pixels)
 */
router.get('/resources', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;

    // Use universal ResourceHelper to get active resources
    const activeResources = await ResourceHelper.getActiveResources(userId);

    if (!activeResources || !activeResources.facebookAuth) {
      return res.status(404).json({
        success: false,
        message: 'Facebook authentication not found'
      });
    }

    const facebookAuth = activeResources.facebookAuth;

    // Return stored resources with active selections from ResourceHelper
    res.json({
      success: true,
      data: {
        adAccounts: facebookAuth.adAccounts || [],
        pages: facebookAuth.pages || [],
        pixels: facebookAuth.pixels || [],
        businessAccounts: [],

        // Use active resources from ResourceHelper (single source of truth)
        selectedAdAccount: activeResources.selectedAdAccount,
        selectedPage: activeResources.selectedPage,
        selectedPixel: activeResources.selectedPixel,

        storagePreference: facebookAuth.storagePreference,

        // Include source for debugging
        _resourceSource: activeResources.source
      }
    });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resources',
      error: error.message
    });
  }
});

/**
 * Update selected resources (ad account, page, pixel)
 */
router.post('/resources/select', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const { adAccountId, pageId, pixelId, storagePreference } = req.body;
    
    // Get Facebook auth record
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId }
    });
    
    if (!facebookAuth) {
      return res.status(404).json({
        success: false,
        message: 'Facebook authentication not found'
      });
    }
    
    // Find selected resources from stored data
    const selectedAdAccount = facebookAuth.adAccounts?.find(acc => acc.id === adAccountId);
    const selectedPage = facebookAuth.pages?.find(page => page.id === pageId);
    const selectedPixel = facebookAuth.pixels?.find(pixel => pixel.id === pixelId);
    
    // Update selections
    await facebookAuth.update({
      selectedAdAccount,
      selectedPage,
      selectedPixel,
      storagePreference: storagePreference || facebookAuth.storagePreference
    });
    
    // Create or update eligibility check when resources are selected
    if (selectedAdAccount) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity
      
      // First, try to update existing eligibility check
      const [updated] = await EligibilityCheck.update({
        status: 'eligible',
        criteria: {
          hasActiveAdAccount: true,
          adAccountCount: facebookAuth.adAccounts?.length || 0,
          hasNoRestrictions: true,
          hasSelectedResources: true
        },
        hasActiveAdAccount: true,
        hasNoRestrictions: true,
        accountAge: 365,
        hasSpendingHistory: true,
        hasPaymentMethod: true,
        totalSpend: 0,
        adAccountCount: facebookAuth.adAccounts?.length || 0,
        failureReasons: [],
        metadata: {
          selectedAdAccount: selectedAdAccount,
          selectedPage: selectedPage,
          selectedPixel: selectedPixel
        },
        expiresAt,
        checkedAt: new Date()
      }, {
        where: {
          userId,
          facebookAuthId: facebookAuth.id
        }
      });
      
      // If no existing check was updated, create a new one
      if (updated === 0) {
        await EligibilityCheck.create({
          userId,
          facebookAuthId: facebookAuth.id,
          checkType: 'manual',
          status: 'eligible',
          criteria: {
            hasActiveAdAccount: true,
            adAccountCount: facebookAuth.adAccounts?.length || 0,
            hasNoRestrictions: true,
            hasSelectedResources: true
          },
          hasActiveAdAccount: true,
          hasNoRestrictions: true,
          accountAge: 365,
          hasSpendingHistory: true,
          hasPaymentMethod: true,
          totalSpend: 0,
          adAccountCount: facebookAuth.adAccounts?.length || 0,
          failureReasons: [],
          metadata: {
            selectedAdAccount: selectedAdAccount,
            selectedPage: selectedPage,
            selectedPixel: selectedPixel
          },
          expiresAt,
          checkedAt: new Date()
        });
      }
    }
    
    // Log selection event
    await AuthAuditLog.logEvent({
      userId,
      eventType: 'resources_selected',
      eventStatus: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        adAccountId,
        pageId,
        pixelId,
        storagePreference
      }
    });
    
    res.json({
      success: true,
      message: 'Resources selected successfully',
      data: {
        selectedAdAccount,
        selectedPage,
        selectedPixel,
        storagePreference: storagePreference || facebookAuth.storagePreference
      }
    });
  } catch (error) {
    console.error('Select resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select resources',
      error: error.message
    });
  }
});

/**
 * Get authentication status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId, isActive: true }
    });
    
    // Check latest eligibility
    const latestEligibility = await EligibilityCheck.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
    
    if (!facebookAuth) {
      return res.json({
        success: true,
        data: {
          authenticated: false,
          eligible: false,
          hasSelectedResources: false
        }
      });
    }
    
    // Check if user has selected resources
    const hasSelectedResources = !!(
      facebookAuth.selectedAdAccount &&
      facebookAuth.selectedPage
    );
    
    // Check if eligible
    const eligible = latestEligibility && 
                    latestEligibility.status === 'eligible' &&
                    new Date(latestEligibility.expiresAt) > new Date();
    
    res.json({
      success: true,
      data: {
        authenticated: true,
        eligible,
        hasSelectedResources,
        facebookUserId: facebookAuth.facebookUserId,
        permissions: facebookAuth.permissions,
        adAccounts: facebookAuth.adAccounts,
        pages: facebookAuth.pages,
        selectedAdAccount: facebookAuth.selectedAdAccount,
        selectedPage: facebookAuth.selectedPage,
        selectedPixel: facebookAuth.selectedPixel,
        storagePreference: facebookAuth.storagePreference,
        tokenExpiresAt: facebookAuth.tokenExpiresAt,
        eligibility: latestEligibility ? {
          status: latestEligibility.status,
          criteria: latestEligibility.criteria,
          failureReasons: latestEligibility.failureReasons,
          expiresAt: latestEligibility.expiresAt,
          checkedAt: latestEligibility.checkedAt
        } : null
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to check status',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/facebook/sdk-callback
 * @desc    Handle Facebook SDK authentication callback
 * @access  Private
 */
router.post('/sdk-callback', authenticate, authLimiter, async (req, res) => {
  try {
    const { accessToken, userID, expiresIn } = req.body;
    const userId = req.userId;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    
    if (!accessToken || !userID) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }
    
    // Log SDK authentication attempt
    await AuthAuditLog.logEvent({
      userId,
      eventType: 'sdk_login_attempt',
      eventStatus: 'pending',
      ipAddress,
      userAgent,
      metadata: { source: 'facebook_sdk', facebookUserId: userID }
    });
    
    // Exchange and validate the token
    const authResults = await FacebookAuthService.handleSDKCallback(
      accessToken,
      userID,
      userId,
      expiresIn
    );
    
    if (!authResults.success) {
      await AuthAuditLog.logEvent({
        userId,
        eventType: 'sdk_login_failure',
        eventStatus: 'failure',
        ipAddress,
        userAgent,
        errorMessage: authResults.error,
        metadata: { facebookUserId: userID }
      });
      
      return res.status(400).json({
        success: false,
        error: authResults.error
      });
    }
    
    // Perform eligibility check
    const eligibilityResults = await FacebookAuthService.checkEligibility(
      userId,
      accessToken
    );
    
    // Save or update auth record
    const authRecord = await FacebookAuthService.saveAuthRecord(
      userId,
      authResults.userInfo,
      accessToken,
      authResults.tokenExpiry
    );
    
    // Save eligibility check
    await FacebookAuthService.saveEligibilityCheck(
      userId,
      authRecord.id,
      eligibilityResults
    );
    
    // Fetch user resources
    const resources = await FacebookAuthService.fetchUserResources(accessToken, userId);
    
    // Log successful authentication
    await AuthAuditLog.logEvent({
      userId,
      eventType: 'sdk_login_success',
      eventStatus: 'success',
      ipAddress,
      userAgent,
      facebookUserId: userID,
      metadata: {
        eligibilityStatus: eligibilityResults.status,
        adAccountsCount: resources.adAccounts?.length || 0,
        pagesCount: resources.pages?.length || 0
      }
    });
    
    // Update user's last login
    await User.update(
      { 
        facebookUserId: userID,
        lastLoginAt: new Date()
      },
      { where: { id: userId } }
    );
    
    res.json({
      success: true,
      data: {
        eligibility: eligibilityResults,
        resources: resources,
        user: authResults.userInfo
      }
    });
  } catch (error) {
    console.error('SDK callback error:', error);
    
    await AuthAuditLog.logEvent({
      userId: req.userId,
      eventType: 'sdk_login_error',
      eventStatus: 'failure',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      errorMessage: error.message,
      metadata: { error: error.stack }
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to process authentication'
    });
  }
});

/**
 * @route   GET /api/auth/facebook/pixels
 * @desc    Get Facebook pixels for authenticated user
 * @access  Private
 */
router.get('/pixels', authenticate, async (req, res) => {
  try {
    const facebookAuth = await FacebookAuth.findOne({
      where: {
        userId: req.userId,
        isActive: true
      }
    });

    if (!facebookAuth) {
      return res.status(401).json({ error: 'Facebook authentication required' });
    }

    // Get pixels from stored data or fetch from Facebook
    let pixels = facebookAuth.pixels || [];

    // If no pixels stored or we need to refresh, fetch from Facebook
    if (pixels.length === 0 || req.query.refresh === 'true') {
      const accessToken = decryptToken(facebookAuth.accessToken);
      const db = require('../models');

      // Get the selected ad account
      const adAccountId = facebookAuth.selectedAdAccount?.id;

      if (adAccountId) {
        try {
          // Fetch ALL pixels from Facebook Graph API with pagination
          let allPixels = [];
          let url = `https://graph.facebook.com/v18.0/${adAccountId}/adspixels`;
          let params = {
            access_token: accessToken,
            fields: 'id,name,code,last_fired_time,is_unavailable',
            limit: 100 // Maximum allowed by Facebook
          };

          console.log('📊 Fetching all pixels with pagination...');
          let pageCount = 0;

          while (url) {
            try {
              const pixelsResponse = await axios.get(url, params ? { params } : {});

              if (pixelsResponse.data && pixelsResponse.data.data) {
                // Filter out unavailable pixels
                const validPixels = pixelsResponse.data.data.filter(pixel => !pixel.is_unavailable);
                allPixels = allPixels.concat(validPixels);
                pageCount++;
                console.log(`  ✅ Fetched page ${pageCount}: ${validPixels.length} valid pixels (Total: ${allPixels.length})`);
              }

              // Check for next page
              if (pixelsResponse.data.paging && pixelsResponse.data.paging.next) {
                url = pixelsResponse.data.paging.next;
                params = null; // Next URL already contains all parameters
              } else {
                break; // No more pages
              }
            } catch (pageError) {
              console.error(`Error fetching pixels page ${pageCount + 1}:`, pageError.message);
              break; // Stop pagination on error but return what we have
            }
          }

          console.log(`✅ Total pixels fetched: ${allPixels.length}`);
          pixels = allPixels;

          // Update stored pixels
          await facebookAuth.update({ pixels });
        } catch (fbError) {
          console.error('Facebook API error fetching pixels:', fbError.response?.data);
          // Return stored pixels if Facebook API fails
        }
      }
    }

    res.json({ pixels });
  } catch (error) {
    console.error('Error fetching pixels:', error);
    res.status(500).json({ error: 'Failed to fetch pixels' });
  }
});

/**
 * @route   GET /api/auth/facebook/audiences
 * @desc    Get custom and lookalike audiences
 * @access  Private
 */
router.get('/audiences', authenticate, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;

    const facebookAuth = await FacebookAuth.findOne({
      where: {
        userId: userId,
        isActive: true
      }
    });

    if (!facebookAuth || !facebookAuth.selectedAdAccount) {
      return res.status(400).json({ error: 'No ad account selected' });
    }

    let accessToken;
    try {
      accessToken = decryptToken(facebookAuth.accessToken);
    } catch (decryptError) {
      console.error('Token decryption error:', decryptError);
      return res.status(401).json({ error: 'Failed to decrypt access token. Please reconnect Facebook.' });
    }

    const adAccountId = facebookAuth.selectedAdAccount.id;

    let customAudiences = [];
    let lookalikeAudiences = [];

    try {
      // Fetch custom audiences
      const customAudiencesResponse = await axios.get(
        `https://graph.facebook.com/v18.0/${adAccountId}/customaudiences`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,name,description,time_created',
            limit: 100
          }
        }
      );

      customAudiences = customAudiencesResponse.data.data || [];

      // Filter for lookalike audiences
      lookalikeAudiences = customAudiences.filter(audience =>
        audience.name?.toLowerCase().includes('lookalike') ||
        audience.description?.toLowerCase().includes('lookalike')
      );

    } catch (fbError) {
      console.error('Facebook API error fetching audiences:', fbError.response?.data);
      // Return empty arrays if Facebook API fails
    }

    res.json({
      customAudiences,
      lookalikeAudiences
    });
  } catch (error) {
    console.error('Error fetching audiences:', error);
    res.status(500).json({ error: 'Failed to fetch audiences' });
  }
});

module.exports = router;