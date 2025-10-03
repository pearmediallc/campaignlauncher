const axios = require('axios');
const crypto = require('crypto');
const { FacebookAuth, EligibilityCheck, AuthAuditLog, User } = require('../models');

// Encryption functions for token storage
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
    // If no data provided
    if (!encryptedData) {
      console.error('No token data provided for decryption');
      return null;
    }
    
    // If token starts with 'EAA', it's already decrypted (legacy support)
    if (typeof encryptedData === 'string' && encryptedData.startsWith('EAA')) {
      return encryptedData;
    }
    
    // Decryption is working, removing verbose logging
    
    // Parse the encrypted data
    const data = typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData;
    
    const decipher = crypto.createDecipheriv(
      algorithm,
      encryptionKey,
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Validate the decrypted token looks like a Facebook token
    if (!decrypted.startsWith('EAA')) {
      console.error('Decrypted token does not look like a valid Facebook token');
      console.error('Decrypted value:', decrypted.substring(0, 20));
      return null;
    }
    
    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('Encrypted data sample:', typeof encryptedData === 'string' ? encryptedData.substring(0, 100) : 'not a string');
    return null;
  }
}

class FacebookAuthService {
  constructor() {
    this.appId = process.env.FB_APP_ID;
    this.appSecret = process.env.FB_APP_SECRET;
    this.redirectUri = process.env.FB_REDIRECT_URI || 'http://localhost:5002/api/auth/facebook/callback';
    this.graphApiVersion = process.env.FB_API_VERSION || 'v18.0';
    this.baseGraphUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
    
    // Log configuration for debugging
    console.log('FacebookAuthService initialized with:');
    console.log('  App ID:', this.appId);
    console.log('  App Secret:', this.appSecret ? '***' + this.appSecret.slice(-4) : 'NOT SET');
    console.log('  Redirect URI:', this.redirectUri);
    
    // Required permissions for campaign creation
    this.requiredPermissions = [
      'ads_management',
      'business_management', 
      'pages_show_list',
      'ads_read',
      'pages_read_engagement',
      'pages_manage_ads'
    ];
    
    // Configurable eligibility criteria
    this.eligibilityCriteria = {
      minAccountAgeDays: parseInt(process.env.MIN_ACCOUNT_AGE_DAYS || '30'),
      requireSpendingHistory: process.env.REQUIRE_SPENDING_HISTORY === 'true',
      requirePaymentMethod: process.env.REQUIRE_PAYMENT_METHOD !== 'false',
      minAdAccounts: parseInt(process.env.MIN_AD_ACCOUNTS || '1'),
      checkBusinessVerification: process.env.CHECK_BUSINESS_VERIFICATION === 'true',
      eligibilityValidityDays: parseInt(process.env.ELIGIBILITY_VALIDITY_DAYS || '30')
    };
  }

  /**
   * Generate OAuth login URL with state parameter for CSRF protection
   */
  getLoginUrl(userId) {
    const state = this.generateState(userId);
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: this.requiredPermissions.join(','),
      response_type: 'code',
      state: state,
      auth_type: 'rerequest', // Forces permission review
      display: 'popup'
    });
    
    const authUrl = `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth?${params.toString()}`;
    console.log('Generated OAuth URL:', authUrl);
    
    return {
      url: authUrl,
      state: state
    };
  }

  /**
   * Generate secure state parameter for CSRF protection
   */
  generateState(userId) {
    const data = `${userId}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
    const hmac = crypto.createHmac('sha256', this.appSecret);
    hmac.update(data);
    return Buffer.from(`${data}:${hmac.digest('hex')}`).toString('base64');
  }

  /**
   * Verify state parameter
   */
  verifyState(state) {
    try {
      const decoded = Buffer.from(state, 'base64').toString();
      const parts = decoded.split(':');
      if (parts.length !== 4) return null;
      
      const [userId, timestamp, nonce, signature] = parts;
      const data = `${userId}:${timestamp}:${nonce}`;
      
      const hmac = crypto.createHmac('sha256', this.appSecret);
      hmac.update(data);
      const expectedSignature = hmac.digest('hex');
      
      if (signature !== expectedSignature) return null;
      
      // Check if state is not too old (5 minutes)
      const age = Date.now() - parseInt(timestamp);
      if (age > 5 * 60 * 1000) return null;
      
      return userId;
    } catch (error) {
      console.error('State verification error:', error);
      return null;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code) {
    try {
      const params = new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
        code: code
      });
      
      const response = await axios.get(
        `${this.baseGraphUrl}/oauth/access_token?${params.toString()}`
      );
      
      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in || 5183999, // Default ~60 days
        tokenType: response.data.token_type
      };
    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error);
      throw new Error('Failed to exchange code for token');
    }
  }

  /**
   * Get user info and permissions from Facebook
   */
  async getUserInfo(accessToken) {
    try {
      // Decrypt token if needed
      const decryptedToken = decryptToken(accessToken);
      if (!decryptedToken) {
        console.error('Failed to decrypt access token for user info');
        throw new Error('Invalid or corrupted access token');
      }
      
      // Get basic user info
      const userResponse = await axios.get(
        `${this.baseGraphUrl}/me`,
        {
          params: {
            fields: 'id,name,email,picture',
            access_token: decryptedToken
          }
        }
      );
      
      // Get granted permissions
      const permissionsResponse = await axios.get(
        `${this.baseGraphUrl}/me/permissions`,
        {
          params: {
            access_token: decryptedToken
          }
        }
      );
      
      const grantedPermissions = permissionsResponse.data.data
        .filter(p => p.status === 'granted')
        .map(p => p.permission);
      
      return {
        facebookUserId: userResponse.data.id,
        name: userResponse.data.name,
        email: userResponse.data.email,
        picture: userResponse.data.picture?.data?.url,
        permissions: grantedPermissions
      };
    } catch (error) {
      console.error('Get user info error:', error.response?.data || error);
      throw new Error('Failed to get user information from Facebook');
    }
  }

  /**
   * Verify user has required permissions
   */
  verifyPermissions(grantedPermissions) {
    const missingPermissions = this.requiredPermissions.filter(
      p => !grantedPermissions.includes(p)
    );
    
    if (missingPermissions.length > 0) {
      return {
        valid: false,
        missingPermissions
      };
    }
    
    return { valid: true, missingPermissions: [] };
  }

  /**
   * Get user's ad accounts
   */
  async getAdAccounts(accessToken) {
    try {
      // Decrypt token if needed
      const decryptedToken = decryptToken(accessToken);
      if (!decryptedToken) {
        console.error('Failed to decrypt access token for ad accounts');
        console.error('Token sample:', typeof accessToken === 'string' ? accessToken.substring(0, 50) : 'not a string');
        return [];
      }

      // Fetch ALL ad accounts with pagination
      let allAdAccounts = [];
      let url = `${this.baseGraphUrl}/me/adaccounts`;
      let params = {
        fields: 'id,name,account_status,disable_reason,currency,timezone_name,spend_cap,amount_spent,balance',
        limit: 100, // Maximum allowed by Facebook
        access_token: decryptedToken
      };

      console.log('📊 Fetching all ad accounts with pagination...');
      let pageCount = 0;

      while (url) {
        try {
          const response = await axios.get(url, params ? { params } : {});

          if (response.data && response.data.data) {
            allAdAccounts = allAdAccounts.concat(response.data.data);
            pageCount++;
            console.log(`  ✅ Fetched page ${pageCount}: ${response.data.data.length} accounts (Total: ${allAdAccounts.length})`);
          }

          // Check for next page
          if (response.data.paging && response.data.paging.next) {
            url = response.data.paging.next;
            params = null; // Next URL already contains all parameters
          } else {
            break; // No more pages
          }
        } catch (pageError) {
          console.error(`Error fetching page ${pageCount + 1}:`, pageError.message);
          break; // Stop pagination on error but return what we have
        }
      }

      console.log(`✅ Total ad accounts fetched: ${allAdAccounts.length}`);
      return allAdAccounts;
    } catch (error) {
      console.error('Get ad accounts error:', error.response?.data || error);
      console.error('Token used (first 20 chars):', accessToken?.substring(0, 20));
      return [];
    }
  }

  /**
   * Get user's Facebook pages (both personal and Business Manager pages)
   */
  async getPages(accessToken) {
    try {
      // Decrypt token if needed
      const decryptedToken = decryptToken(accessToken);
      if (!decryptedToken) {
        console.error('Failed to decrypt access token for pages');
        return [];
      }
      
      // Get personal pages
      const personalPagesPromise = axios.get(
        `${this.baseGraphUrl}/me/accounts`,
        {
          params: {
            fields: 'id,name,access_token,category,verification_status,picture',
            access_token: decryptedToken,
            limit: 100
          }
        }
      );
      
      // Get Business Manager pages
      const businessPagesPromise = axios.get(
        `${this.baseGraphUrl}/me/business_users`,
        {
          params: {
            fields: 'assigned_pages{id,name,category,verification_status,picture}',
            access_token: decryptedToken
          }
        }
      ).catch(err => {
        console.log('No business pages or no permission:', err.response?.data?.error?.message);
        return { data: { data: [] } };
      });
      
      const [personalResponse, businessResponse] = await Promise.all([
        personalPagesPromise,
        businessPagesPromise
      ]);
      
      const personalPages = personalResponse.data.data || [];
      let businessPages = [];
      
      // Extract business pages
      if (businessResponse.data.data && businessResponse.data.data.length > 0) {
        businessResponse.data.data.forEach(businessUser => {
          if (businessUser.assigned_pages && businessUser.assigned_pages.data) {
            businessPages = businessPages.concat(businessUser.assigned_pages.data);
          }
        });
      }
      
      // Combine and deduplicate pages
      const allPages = [...personalPages, ...businessPages];
      const uniquePages = Array.from(
        new Map(allPages.map(page => [page.id, page])).values()
      );
      
      console.log(`Found ${personalPages.length} personal pages and ${businessPages.length} business pages. Total unique: ${uniquePages.length}`);
      
      return uniquePages;
    } catch (error) {
      console.error('Get pages error:', error.response?.data || error);
      return [];
    }
  }

  /**
   * Get user's business accounts
   */
  async getBusinessAccounts(accessToken) {
    try {
      // Decrypt token if needed
      const decryptedToken = decryptToken(accessToken);
      if (!decryptedToken) {
        console.error('Failed to decrypt access token for business accounts');
        return [];
      }
      
      const response = await axios.get(
        `${this.baseGraphUrl}/me/businesses`,
        {
          params: {
            fields: 'id,name,verification_status,created_time',
            access_token: decryptedToken
          }
        }
      );
      
      return response.data.data || [];
    } catch (error) {
      console.error('Get business accounts error:', error.response?.data || error);
      return [];
    }
  }

  /**
   * Get pixels for an ad account
   */
  async getPixels(adAccountId, accessToken) {
    try {
      // Decrypt token if needed
      const decryptedToken = decryptToken(accessToken);
      if (!decryptedToken) {
        console.error('Failed to decrypt access token for pixels');
        return [];
      }
      
      // Clean the account ID - remove 'act_' prefix if it exists
      const cleanAccountId = adAccountId.replace('act_', '');
      
      const response = await axios.get(
        `${this.baseGraphUrl}/act_${cleanAccountId}/adspixels`,
        {
          params: {
            fields: 'id,name,code,last_fired_time,is_created_by_business,creation_time',
            access_token: decryptedToken,
            limit: 100
          }
        }
      );
      
      console.log(`Found ${response.data.data?.length || 0} pixels for account ${cleanAccountId}`);
      return response.data.data || [];
    } catch (error) {
      console.error(`Get pixels error for account ${adAccountId}:`, error.response?.data?.error?.message || error.message);
      return [];
    }
  }

  /**
   * Fetch all user resources (ad accounts, pages, pixels)
   */
  async fetchUserResources(accessToken, userId) {
    try {
      // Fetch all resources in parallel
      const [adAccounts, pages, businessAccounts] = await Promise.all([
        this.getAdAccounts(accessToken),
        this.getPages(accessToken),
        this.getBusinessAccounts(accessToken)
      ]);

      // Fetch pixels for each ad account
      // Facebook returns account ID as 'id' field, not 'account_id'
      const pixelsPromises = adAccounts.map(account => 
        this.getPixels(account.id, accessToken)
      );
      const pixelsArrays = await Promise.all(pixelsPromises);
      
      // Flatten and deduplicate pixels
      const allPixels = pixelsArrays.flat();
      const uniquePixels = Array.from(
        new Map(allPixels.map(pixel => [pixel.id, pixel])).values()
      );

      // Update Facebook auth record with all resources
      await FacebookAuth.update({
        adAccounts,
        pages,
        businessAccounts,
        pixels: uniquePixels
      }, {
        where: { userId }
      });

      return {
        adAccounts,
        pages,
        businessAccounts,
        pixels: uniquePixels
      };
    } catch (error) {
      console.error('Fetch user resources error:', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive eligibility check
   */
  async checkEligibility(userId, accessToken) {
    const failureReasons = [];
    const criteria = {};
    
    try {
      // Get ad accounts
      const adAccounts = await this.getAdAccounts(accessToken);
      const activeAdAccounts = adAccounts.filter(acc => acc.account_status === 1);
      
      criteria.hasActiveAdAccount = activeAdAccounts.length > 0;
      criteria.adAccountCount = activeAdAccounts.length;
      
      if (!criteria.hasActiveAdAccount) {
        failureReasons.push('No active ad accounts found');
      }
      
      if (activeAdAccounts.length < this.eligibilityCriteria.minAdAccounts) {
        failureReasons.push(`Minimum ${this.eligibilityCriteria.minAdAccounts} ad account(s) required`);
      }
      
      // Check for account restrictions
      // Status 1 = ACTIVE, 2 = ACTIVE with issues, 3 = DISABLED
      // We only care if there are ANY active accounts without major restrictions
      const hasUsableAccounts = activeAdAccounts.length > 0;
      
      criteria.hasNoRestrictions = hasUsableAccounts;
      if (!criteria.hasNoRestrictions) {
        failureReasons.push('No usable ad accounts found');
      }
      
      // Calculate total spend
      const totalSpend = activeAdAccounts.reduce((sum, acc) => {
        const spent = parseFloat(acc.amount_spent || 0);
        return sum + spent;
      }, 0);
      
      criteria.totalSpend = totalSpend;
      criteria.hasSpendingHistory = totalSpend > 0;
      
      if (this.eligibilityCriteria.requireSpendingHistory && !criteria.hasSpendingHistory) {
        failureReasons.push('No spending history found');
      }
      
      // Check payment method (simplified - checking if spend_cap exists)
      criteria.hasPaymentMethod = activeAdAccounts.some(acc => 
        acc.spend_cap || acc.balance
      );
      
      if (this.eligibilityCriteria.requirePaymentMethod && !criteria.hasPaymentMethod) {
        failureReasons.push('No payment method configured');
      }
      
      // Get business accounts for verification check
      if (this.eligibilityCriteria.checkBusinessVerification) {
        const businessAccounts = await this.getBusinessAccounts(accessToken);
        const verifiedBusiness = businessAccounts.find(b => 
          b.verification_status === 'verified'
        );
        
        criteria.businessVerificationStatus = verifiedBusiness ? 
          'verified' : 'unverified';
        
        if (!verifiedBusiness) {
          failureReasons.push('Business verification required');
        }
      }
      
      // Check account age (using business account creation time as proxy)
      const businessAccounts = await this.getBusinessAccounts(accessToken);
      if (businessAccounts.length > 0) {
        const oldestAccount = businessAccounts.reduce((oldest, acc) => {
          const accTime = new Date(acc.created_time).getTime();
          return accTime < oldest ? accTime : oldest;
        }, Date.now());
        
        const accountAgeDays = Math.floor(
          (Date.now() - oldestAccount) / (1000 * 60 * 60 * 24)
        );
        
        criteria.accountAge = accountAgeDays;
        
        if (accountAgeDays < this.eligibilityCriteria.minAccountAgeDays) {
          failureReasons.push(
            `Account must be at least ${this.eligibilityCriteria.minAccountAgeDays} days old`
          );
        }
      } else {
        criteria.accountAge = 0;
        failureReasons.push('Unable to determine account age');
      }
      
      // Determine overall status
      const status = failureReasons.length === 0 ? 'eligible' : 'ineligible';
      
      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(
        expiresAt.getDate() + this.eligibilityCriteria.eligibilityValidityDays
      );
      
      return {
        status,
        criteria,
        failureReasons,
        expiresAt,
        metadata: {
          adAccountsChecked: adAccounts.length,
          activeAccounts: activeAdAccounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            currency: acc.currency,
            timezone: acc.timezone_name
          }))
        }
      };
    } catch (error) {
      console.error('Eligibility check error:', error);
      return {
        status: 'review_required',
        criteria,
        failureReasons: ['Unable to complete eligibility check', error.message],
        expiresAt: new Date(),
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Save or update Facebook authentication
   */
  async saveAuthentication(userId, authData) {
    const transaction = await FacebookAuth.sequelize.transaction();

    try {
      console.log('📝 Saving authentication for user:', userId);
      console.log('   Token starts with:', authData.accessToken.substring(0, 10));

      // Encrypt the access token before saving
      const encryptedToken = encryptToken(authData.accessToken);
      console.log('   Encrypted token starts with:', encryptedToken.substring(0, 20));

      // Find or create auth record using compound key (userId + facebookUserId)
      // This allows multiple users to connect the same Facebook account
      const [authRecord, created] = await FacebookAuth.findOrCreate({
        where: {
          userId,
          facebookUserId: authData.facebookUserId
        },
        defaults: {
          userId,
          facebookUserId: authData.facebookUserId,
          accessToken: encryptedToken,
          tokenExpiresAt: authData.tokenExpiresAt,
          permissions: authData.permissions,
          adAccounts: authData.adAccounts,
          pages: authData.pages,
          businessAccounts: authData.businessAccounts,
          lastVerifiedAt: new Date(),
          isActive: true
        },
        transaction
      });

      if (!created) {
        // Update existing record
        await authRecord.update({
          facebookUserId: authData.facebookUserId,
          accessToken: encryptedToken,
          tokenExpiresAt: authData.tokenExpiresAt,
          permissions: authData.permissions,
          adAccounts: authData.adAccounts,
          pages: authData.pages,
          businessAccounts: authData.businessAccounts,
          lastVerifiedAt: new Date(),
          isActive: true
        }, { transaction });
      }

      await transaction.commit();

      // Verify what was actually saved
      const saved = await FacebookAuth.findOne({ where: { userId } });
      console.log('   ✅ Saved token starts with:', saved.accessToken.substring(0, 20));

      return authRecord;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Save eligibility check results
   */
  async saveEligibilityCheck(userId, facebookAuthId, checkResults) {
    return await EligibilityCheck.create({
      userId,
      facebookAuthId,
      checkType: 'initial',
      status: checkResults.status,
      criteria: checkResults.criteria,
      hasActiveAdAccount: checkResults.criteria.hasActiveAdAccount,
      hasNoRestrictions: checkResults.criteria.hasNoRestrictions,
      accountAge: checkResults.criteria.accountAge,
      hasSpendingHistory: checkResults.criteria.hasSpendingHistory,
      hasPaymentMethod: checkResults.criteria.hasPaymentMethod,
      businessVerificationStatus: checkResults.criteria.businessVerificationStatus,
      totalSpend: checkResults.criteria.totalSpend || 0,
      adAccountCount: checkResults.criteria.adAccountCount || 0,
      failureReasons: checkResults.failureReasons,
      metadata: checkResults.metadata,
      expiresAt: checkResults.expiresAt,
      checkedAt: new Date()
    });
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded(authRecord) {
    const now = new Date();
    const expiresAt = new Date(authRecord.tokenExpiresAt);
    const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
    
    // Refresh if less than 24 hours until expiry
    if (hoursUntilExpiry < 24) {
      try {
        // Facebook long-lived tokens typically last 60 days
        // We'll need to implement token refresh logic here
        // For now, return false to indicate refresh is needed
        return false;
      } catch (error) {
        console.error('Token refresh error:', error);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validate user's Facebook authentication status
   * @param {number} userId - The user ID
   */
  async validateAuthStatus(userId) {
    try {
      // Get active Facebook auth record - without include to avoid association error
      const facebookAuth = await FacebookAuth.findOne({
        where: { userId, isActive: true }
      });
      
      if (!facebookAuth) {
        return { valid: false, reason: 'No Facebook authentication found' };
      }
      
      // Check if token has expired
      if (new Date() > new Date(facebookAuth.tokenExpiresAt)) {
        return { valid: false, reason: 'Facebook token has expired' };
      }
      
      // Get latest eligibility check separately
      const latestEligibility = await EligibilityCheck.findOne({
        where: { userId, facebookAuthId: facebookAuth.id },
        order: [['createdAt', 'DESC']]
      });

      // If no eligibility check exists, proceed anyway with valid auth
      // This handles cases where:
      // 1. Multiple users share same Facebook account
      // 2. Legacy users who connected before eligibility checks
      // 3. Re-authentication scenarios
      if (!latestEligibility) {
        console.warn(`⚠️ No eligibility check found for user ${userId}, proceeding with valid auth`);

        // Decrypt the token before returning
        const decryptedToken = decryptToken(facebookAuth.accessToken);
        if (!decryptedToken) {
          return { valid: false, reason: 'Failed to decrypt access token' };
        }

        // Return with decrypted token
        const authWithDecryptedToken = {
          ...facebookAuth.toJSON(),
          accessToken: decryptedToken
        };

        return {
          valid: true,
          facebookAuth: authWithDecryptedToken,
          authRecord: authWithDecryptedToken,
          eligibilityCheck: null // Backend should handle null eligibility gracefully
        };
      }

      // If eligibility check exists but has expired, proceed anyway
      // Facebook API will be the final validator of account eligibility
      if (new Date() > new Date(latestEligibility.expiresAt)) {
        console.warn(`⚠️ Eligibility check expired for user ${userId}, proceeding anyway`);
        // Don't fail - just log and continue
        // Facebook API will reject if account is actually ineligible
      }
      
      // Decrypt the token before returning
      const decryptedToken = decryptToken(facebookAuth.accessToken);
      if (!decryptedToken) {
        return { valid: false, reason: 'Failed to decrypt access token' };
      }

      // Return with decrypted token
      const authWithDecryptedToken = {
        ...facebookAuth.toJSON(),
        accessToken: decryptedToken
      };

      return {
        valid: true,
        facebookAuth: authWithDecryptedToken,
        authRecord: authWithDecryptedToken,
        eligibilityCheck: latestEligibility
      };
    } catch (error) {
      console.error('Validate auth status error:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Handle Facebook SDK authentication callback
   * @param {string} accessToken - The access token from Facebook SDK
   * @param {string} facebookUserId - The Facebook user ID
   * @param {number} userId - Our system's user ID
   * @param {number} expiresIn - Token expiration time in seconds
   */
  async handleSDKCallback(accessToken, facebookUserId, userId, expiresIn) {
    try {
      // Validate the token by fetching user info
      const userInfo = await this.getUserInfo(accessToken);
      
      if (!userInfo || userInfo.id !== facebookUserId) {
        return {
          success: false,
          error: 'Invalid token or user ID mismatch'
        };
      }
      
      // Calculate token expiry
      const tokenExpiry = new Date();
      tokenExpiry.setSeconds(tokenExpiry.getSeconds() + (expiresIn || 5183999)); // Default ~60 days
      
      return {
        success: true,
        userInfo: {
          facebookUserId: userInfo.id,
          email: userInfo.email,
          name: userInfo.name
        },
        tokenExpiry
      };
    } catch (error) {
      console.error('SDK callback validation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to validate token'
      };
    }
  }
}

module.exports = new FacebookAuthService();