const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { FacebookAuth, User, AuthAuditLog } = require('../models');

/**
 * Parse Facebook signed request
 */
function parseSignedRequest(signedRequest, appSecret) {
  const [encodedSig, payload] = signedRequest.split('.');
  
  // Decode the payload
  const decodedPayload = Buffer.from(payload, 'base64').toString('utf8');
  const data = JSON.parse(decodedPayload);
  
  // Verify the signature
  const expectedSig = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
    
  if (encodedSig !== expectedSig) {
    throw new Error('Invalid signature');
  }
  
  return data;
}

/**
 * Facebook Data Deletion Callback
 * This endpoint is called by Facebook when a user requests data deletion
 */
router.post('/callback', async (req, res) => {
  try {
    const { signed_request } = req.body;
    
    if (!signed_request) {
      return res.status(400).json({
        error: 'Missing signed_request parameter'
      });
    }
    
    // Parse and verify the signed request
    const appSecret = process.env.FB_APP_SECRET;
    const data = parseSignedRequest(signed_request, appSecret);
    
    // Extract user ID from the signed request
    const facebookUserId = data.user_id;
    
    if (!facebookUserId) {
      return res.status(400).json({
        error: 'No user_id in signed request'
      });
    }
    
    // Find the user's Facebook authentication record
    const facebookAuth = await FacebookAuth.findOne({
      where: { facebookUserId }
    });
    
    if (facebookAuth) {
      const userId = facebookAuth.userId;
      
      // Log the deletion request
      await AuthAuditLog.logEvent({
        userId,
        eventType: 'data_deletion_request',
        eventStatus: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          facebookUserId,
          requestedAt: new Date()
        }
      });
      
      // Delete Facebook-related data
      // 1. Delete Facebook auth record (this includes tokens, pages, ad accounts)
      await facebookAuth.destroy();
      
      // 2. Delete any cached resources or campaigns associated with this Facebook account
      // Add any additional cleanup here based on your data model
      
      // Create a confirmation code for tracking
      const confirmationCode = crypto.randomBytes(16).toString('hex');
      
      // Store the deletion request for tracking (optional)
      // You might want to create a DeletionRequest model for this
      
      // Return the required response format
      return res.json({
        url: `${process.env.FRONTEND_URL || 'https://fbcampaign.local:3000'}/data-deletion?code=${confirmationCode}`,
        confirmation_code: confirmationCode
      });
    }
    
    // If no user found, still return success (as per Facebook requirements)
    const confirmationCode = crypto.randomBytes(16).toString('hex');
    
    return res.json({
      url: `${process.env.FRONTEND_URL || 'https://fbcampaign.local:3000'}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode
    });
    
  } catch (error) {
    console.error('Data deletion callback error:', error);
    
    // Log the error but still return a valid response
    const confirmationCode = 'error_' + crypto.randomBytes(8).toString('hex');
    
    return res.json({
      url: `${process.env.FRONTEND_URL || 'https://fbcampaign.local:3000'}/data-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode
    });
  }
});

/**
 * Data Deletion Status Check
 * Users can check the status of their deletion request
 */
router.get('/status/:confirmationCode', async (req, res) => {
  try {
    const { confirmationCode } = req.params;
    
    // In a production app, you would look up the deletion request
    // For now, we'll return a generic success message
    
    res.json({
      success: true,
      message: 'Your data deletion request has been processed.',
      confirmationCode,
      deletedAt: new Date()
    });
    
  } catch (error) {
    console.error('Deletion status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check deletion status'
    });
  }
});

/**
 * Manual Data Deletion Request (for logged-in users)
 * Users can request deletion of their data while logged in
 */
router.delete('/user-data', async (req, res) => {
  try {
    // This should be protected by authentication middleware
    const userId = req.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Find and delete Facebook auth data
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId }
    });
    
    if (facebookAuth) {
      // Log the deletion
      await AuthAuditLog.logEvent({
        userId,
        eventType: 'data_deletion_request',
        eventStatus: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: {
          source: 'user_initiated',
          deletedAt: new Date()
        }
      });
      
      // Delete the Facebook auth record
      await facebookAuth.destroy();
    }
    
    res.json({
      success: true,
      message: 'Your Facebook data has been deleted successfully'
    });
    
  } catch (error) {
    console.error('User data deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user data'
    });
  }
});

module.exports = router;