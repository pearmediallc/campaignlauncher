const FacebookAuthService = require('../services/FacebookAuthService');
const { AuthAuditLog } = require('../models');

/**
 * Middleware to check if user has valid Facebook authentication and is eligible
 */
const requireFacebookAuth = async (req, res, next) => {
  try {
    const userId = req.userId; // Assumes authenticateToken middleware ran first
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Validate Facebook auth status
    const validationResult = await FacebookAuthService.validateAuthStatus(userId);
    
    if (!validationResult.valid) {
      // Log the failed attempt
      await AuthAuditLog.logEvent({
        userId,
        eventType: 'suspicious_activity',
        eventStatus: 'failure',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        errorMessage: `Facebook auth validation failed: ${validationResult.reason}`,
        metadata: { 
          endpoint: req.originalUrl,
          method: req.method,
          reason: validationResult.reason
        }
      });
      
      return res.status(403).json({
        success: false,
        error: 'Facebook authentication required',
        reason: validationResult.reason,
        requiresAuth: true
      });
    }
    
    // Check if user is eligible (if eligibility check exists)
    // Allow users without eligibility check to proceed - Facebook API will be final validator
    if (validationResult.eligibilityCheck && validationResult.eligibilityCheck.status !== 'eligible') {
      console.warn(`⚠️ User ${userId} has eligibility check but status is: ${validationResult.eligibilityCheck.status}`);
      // Don't block - let Facebook API decide
      // return res.status(403).json({
      //   success: false,
      //   error: 'User is not eligible to create campaigns',
      //   eligibilityStatus: validationResult.eligibilityCheck.status,
      //   failureReasons: validationResult.eligibilityCheck.failureReasons,
      //   requiresVerification: true
      // });
    }
    
    // Attach Facebook auth info to request
    const authRecord = validationResult.facebookAuth || validationResult.authRecord;

    // Token is already decrypted by validateAuthStatus
    req.facebookAuth = {
      authRecord: authRecord,
      eligibilityCheck: validationResult.eligibilityCheck,
      accessToken: authRecord.accessToken, // Already decrypted by validateAuthStatus
      facebookUserId: authRecord.facebookUserId,
      adAccounts: authRecord.adAccounts,
      pages: authRecord.pages,
      selectedAdAccount: authRecord.selectedAdAccount // Include selectedAdAccount
    };
    
    next();
  } catch (error) {
    console.error('Facebook auth middleware error:', error);
    
    await AuthAuditLog.logEvent({
      userId: req.userId,
      eventType: 'suspicious_activity',
      eventStatus: 'failure',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      errorMessage: `Facebook auth middleware error: ${error.message}`,
      metadata: { 
        endpoint: req.originalUrl,
        error: error.stack
      }
    });
    
    res.status(500).json({
      success: false,
      error: 'Authentication verification failed'
    });
  }
};

/**
 * Middleware to check Facebook auth but allow request to continue if not authenticated
 * Useful for endpoints that have different behavior based on auth status
 */
const checkFacebookAuth = async (req, res, next) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      req.hasFacebookAuth = false;
      return next();
    }
    
    const validationResult = await FacebookAuthService.validateAuthStatus(userId);

    // Allow valid auth even without eligibility check or if not marked as eligible
    // Facebook API will be the final validator
    if (validationResult.valid) {
      req.hasFacebookAuth = true;
      const authRecord = validationResult.authRecord || validationResult.facebookAuth;

      req.facebookAuth = {
        authRecord: authRecord,
        eligibilityCheck: validationResult.eligibilityCheck,
        accessToken: authRecord.accessToken, // Already decrypted by validateAuthStatus
        facebookUserId: authRecord.facebookUserId,
        adAccounts: authRecord.adAccounts,
        pages: authRecord.pages,
        selectedAdAccount: authRecord.selectedAdAccount
      };
    } else {
      req.hasFacebookAuth = false;
      req.facebookAuthReason = validationResult.reason || 'Not eligible';
    }
    
    next();
  } catch (error) {
    console.error('Check Facebook auth error:', error);
    req.hasFacebookAuth = false;
    req.facebookAuthError = error.message;
    next();
  }
};

/**
 * Middleware to refresh Facebook token if needed
 */
const refreshFacebookToken = async (req, res, next) => {
  try {
    if (!req.facebookAuth) {
      return next();
    }
    
    const tokenValid = await FacebookAuthService.refreshTokenIfNeeded(
      req.facebookAuth.authRecord
    );
    
    if (!tokenValid) {
      // Token needs refresh but couldn't be refreshed
      return res.status(401).json({
        success: false,
        error: 'Facebook token expired',
        requiresReauth: true
      });
    }
    
    next();
  } catch (error) {
    console.error('Token refresh middleware error:', error);
    next(); // Continue anyway, let the actual API call fail if token is bad
  }
};

module.exports = {
  requireFacebookAuth,
  checkFacebookAuth,
  refreshFacebookToken
};