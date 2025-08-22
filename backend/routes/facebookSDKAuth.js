const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const db = require('../models');
const crypto = require('crypto');
const { exchangeForLongLivedToken } = require('../utils/exchangeToken');

// Encryption functions
const algorithm = 'aes-256-gcm';
const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');

function encryptToken(token) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    encrypted,
    authTag: authTag.toString('hex'),
    iv: iv.toString('hex')
  });
}

function decryptToken(encryptedData) {
  try {
    const data = JSON.parse(encryptedData);
    const decipher = crypto.createDecipheriv(
      algorithm,
      encryptionKey,
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error.message);
    return null;
  }
}

function checkEligibility(adAccounts) {
  // Basic eligibility check
  const hasActiveAccount = adAccounts.some(acc => 
    acc.account_status === 1 || acc.account_status === 2
  );
  
  const hasNoRestrictions = !adAccounts.some(acc => 
    acc.account_status === 3 || acc.account_status === 100 || acc.account_status === 101
  );
  
  const eligible = hasActiveAccount && hasNoRestrictions && adAccounts.length > 0;
  
  const failureReasons = [];
  if (!hasActiveAccount) failureReasons.push('No active ad accounts');
  if (!hasNoRestrictions) failureReasons.push('Account has restrictions');
  if (adAccounts.length === 0) failureReasons.push('No ad accounts found');
  
  return {
    eligible,
    criteria: {
      hasActiveAdAccount: hasActiveAccount,
      hasNoRestrictions: hasNoRestrictions,
      adAccountCount: adAccounts.length
    },
    failureReasons
  };
}

/**
 * Handle Facebook SDK authentication
 * This receives the access token from the frontend SDK
 */
router.post('/sdk-callback', authenticate, async (req, res) => {
  try {
    const { accessToken, userID, expiresIn } = req.body;
    const userId = req.user.id;

    if (!accessToken || !userID) {
      return res.status(400).json({
        success: false,
        message: 'Missing access token or user ID'
      });
    }

    // Verify the token with Facebook
    const verifyUrl = `https://graph.facebook.com/v18.0/me?access_token=${accessToken}&fields=id,name,email`;
    const verifyResponse = await axios.get(verifyUrl);
    
    if (verifyResponse.data.id !== userID) {
      return res.status(400).json({
        success: false,
        message: 'Token validation failed'
      });
    }

    // Get user info and permissions
    const permissionsUrl = `https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`;
    const permissionsResponse = await axios.get(permissionsUrl);
    const permissions = permissionsResponse.data.data
      .filter(p => p.status === 'granted')
      .map(p => p.permission);

    // Get ad accounts
    const adAccountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${accessToken}`;
    const adAccountsResponse = await axios.get(adAccountsUrl);
    const adAccounts = adAccountsResponse.data.data || [];

    // Get pages
    const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category&access_token=${accessToken}`;
    const pagesResponse = await axios.get(pagesUrl);
    const pages = pagesResponse.data.data || [];

    // Try to exchange for long-lived token
    let finalAccessToken = accessToken;
    let finalExpiresIn = expiresIn;
    
    const longLivedResult = await exchangeForLongLivedToken(accessToken);
    if (longLivedResult) {
      finalAccessToken = longLivedResult.access_token;
      finalExpiresIn = longLivedResult.expires_in;
      console.log('Using long-lived token that expires in', Math.floor(finalExpiresIn / 86400), 'days');
    } else {
      console.log('Using short-lived token that expires in', Math.floor(finalExpiresIn / 3600), 'hours');
    }

    // Calculate token expiry
    console.log('Token expiry calculation:', {
      expiresIn: finalExpiresIn,
      expiresInType: typeof finalExpiresIn,
      defaultUsed: !finalExpiresIn
    });
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + (finalExpiresIn || 5184000)); // Default 60 days
    console.log('Token will expire at:', tokenExpiresAt);

    // Save or update Facebook auth
    const [facebookAuth, created] = await db.FacebookAuth.findOrCreate({
      where: { userId },
      defaults: {
        userId,
        facebookUserId: userID,
        accessToken: encryptToken(finalAccessToken),
        tokenExpiresAt,
        permissions,
        adAccounts,
        pages,
        isActive: true
      }
    });

    if (!created) {
      // Update existing record
      await facebookAuth.update({
        facebookUserId: userID,
        accessToken: encryptToken(finalAccessToken),
        tokenExpiresAt,
        permissions,
        adAccounts,
        pages,
        isActive: true
      });
    }

    // Perform eligibility check
    const eligibilityResults = await checkEligibility(adAccounts);
    
    // Save eligibility check
    await db.EligibilityCheck.create({
      userId,
      facebookAuthId: facebookAuth.id,
      checkType: 'initial',
      status: eligibilityResults.eligible ? 'eligible' : 'ineligible',
      criteria: eligibilityResults.criteria,
      hasActiveAdAccount: eligibilityResults.criteria.hasActiveAdAccount,
      hasNoRestrictions: eligibilityResults.criteria.hasNoRestrictions,
      adAccountCount: adAccounts.length,
      failureReasons: eligibilityResults.failureReasons,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      checkedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Facebook authentication successful',
      data: {
        facebookUserId: userID,
        permissions,
        adAccountsCount: adAccounts.length,
        pagesCount: pages.length,
        eligible: eligibilityResults.eligible,
        resources: {
          adAccounts,
          pages,
          pixels: []
        }
      }
    });

  } catch (error) {
    console.error('SDK callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process Facebook authentication',
      error: error.message
    });
  }
});

/**
 * Get user's Facebook resources for selection
 */
router.get('/resources', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(404).json({
        success: false,
        message: 'No Facebook authentication found'
      });
    }

    res.json({
      success: true,
      data: {
        adAccounts: facebookAuth.adAccounts || [],
        pages: facebookAuth.pages || [],
        selectedAdAccount: facebookAuth.selectedAdAccount,
        selectedPage: facebookAuth.selectedPage
      }
    });

  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resources'
    });
  }
});

/**
 * Select resources for campaign creation
 */
router.post('/resources/select', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { adAccountId, pageId } = req.body;

    const facebookAuth = await db.FacebookAuth.findOne({
      where: { userId, isActive: true }
    });

    if (!facebookAuth) {
      return res.status(404).json({
        success: false,
        message: 'No Facebook authentication found'
      });
    }

    // Find selected resources
    const selectedAdAccount = facebookAuth.adAccounts?.find(acc => acc.id === adAccountId);
    const selectedPage = facebookAuth.pages?.find(page => page.id === pageId);

    if (!selectedAdAccount || !selectedPage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ad account or page selection'
      });
    }

    // Update selections
    await facebookAuth.update({
      selectedAdAccount,
      selectedPage
    });

    res.json({
      success: true,
      message: 'Resources selected successfully',
      data: {
        selectedAdAccount,
        selectedPage
      }
    });

  } catch (error) {
    console.error('Select resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select resources'
    });
  }
});

// Helper functions
function encryptToken(token) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    encrypted,
    authTag: authTag.toString('hex'),
    iv: iv.toString('hex')
  });
}

function checkEligibility(adAccounts) {
  const hasActiveAccount = adAccounts.some(acc => acc.account_status === 1);
  const criteria = {
    hasActiveAdAccount: hasActiveAccount,
    hasNoRestrictions: true,
    adAccountCount: adAccounts.length
  };
  
  const failureReasons = [];
  if (!hasActiveAccount) {
    failureReasons.push('No active ad account found');
  }
  
  return {
    eligible: hasActiveAccount,
    criteria,
    failureReasons
  };
}

module.exports = router;
module.exports.decryptToken = decryptToken;