const router = require('express').Router();
const axios = require('axios');
const { Op } = require('sequelize');
const { CampaignTracking, FacebookAuth, UserResource, UserResourceConfig } = require('../models');
const { authenticate } = require('../middleware/auth');
const { decryptToken } = require('./facebookSDKAuth');
const AuditService = require('../services/AuditService');

/**
 * @route   GET /api/campaigns/manage/tracked
 * @desc    Get all campaigns tracked by the current user
 * @access  Private
 */
router.get('/tracked', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const campaigns = await CampaignTracking.findByUserId(userId);

    res.json({
      success: true,
      campaigns: campaigns || [],
      count: campaigns?.length || 0
    });
  } catch (error) {
    console.error('Error fetching tracked campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tracked campaigns',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/campaigns/manage/accounts
 * @desc    Get all ad accounts available to the user with search
 * @access  Private
 */
router.get('/accounts', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const { search, limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Build search condition
    const whereCondition = {
      userId: userId,
      type: 'adAccount'
    };

    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { resourceId: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Get user's ad accounts
    const { count, rows: accounts } = await UserResource.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    // Get active resource to mark it
    const activeConfig = await UserResourceConfig.findOne({
      where: { userId: userId, isActive: true }
    });

    // Format response
    const formattedAccounts = accounts.map(account => ({
      id: account.resourceId,
      name: account.name,
      isActive: activeConfig && activeConfig.adAccountId === account.resourceId
    }));

    res.json({
      success: true,
      accounts: formattedAccounts,
      total: count,
      hasMore: parseInt(offset) + parseInt(limit) < count,
      activeAccountId: activeConfig?.adAccountId || null
    });

  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ad accounts',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/campaigns/manage/details/:campaignId
 * @desc    Get detailed campaign information including learning phase
 * @access  Private
 */
router.get('/details/:campaignId', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user?.id || req.userId;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // Get user's Facebook auth
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId: userId },
      order: [['createdAt', 'DESC']]
    });

    if (!facebookAuth || !facebookAuth.accessToken) {
      return res.status(401).json({ error: 'Facebook authentication required' });
    }

    const accessToken = decryptToken(facebookAuth.accessToken);
    if (!accessToken) {
      return res.status(401).json({ error: 'Invalid Facebook access token' });
    }

    // Fetch campaign details with ad sets and learning info from Facebook
    const url = `https://graph.facebook.com/v19.0/${campaignId}`;
    const params = {
      fields: 'id,name,status,objective,created_time,daily_budget,lifetime_budget,spend_cap,bid_strategy,adsets.limit(200){id,name,status,daily_budget,lifetime_budget,optimization_goal,billing_event,learning_stage_info,targeting,attribution_spec,insights.date_preset(maximum){impressions,clicks,spend,conversions,cost_per_conversion,ctr,cpm,actions,cost_per_action_type,frequency,reach}}',
      access_token: accessToken
    };

    console.log(`📊 Fetching campaign details for ${campaignId}...`);

    const response = await axios.get(url, { params });
    const campaignData = response.data;

    // Process learning phase data for each ad set
    if (campaignData.adsets && campaignData.adsets.data) {
      campaignData.adsets.data = campaignData.adsets.data.map(adset => {
        const learningInfo = adset.learning_stage_info || {};

        // Determine learning status and message
        let learningStatus = learningInfo.status || 'UNKNOWN';
        let learningMessage = '';
        let learningProgress = null;

        switch(learningStatus) {
          case 'LEARNING':
            learningMessage = 'Learning in progress - optimizing delivery';
            // Try to calculate progress (Facebook doesn't always provide this)
            if (learningInfo.attribution_window_days) {
              learningMessage += ` (${learningInfo.attribution_window_days} days)`;
            }
            break;
          case 'SUCCESS':
            learningMessage = 'Learning phase complete - delivering optimally';
            break;
          case 'FAIL':
            learningMessage = 'Learning limited - not enough conversions to optimize';
            break;
          case 'WAIVING':
            learningMessage = 'Learning phase waived';
            break;
          default:
            learningMessage = 'Learning status unknown';
        }

        return {
          ...adset,
          learning_status: learningStatus,
          learning_message: learningMessage,
          learning_progress: learningProgress,
          // Extract insights if available
          metrics: adset.insights?.data?.[0] ? {
            impressions: adset.insights.data[0].impressions || 0,
            clicks: adset.insights.data[0].clicks || 0,
            spend: adset.insights.data[0].spend || 0,
            ctr: adset.insights.data[0].ctr || 0,
            cpm: adset.insights.data[0].cpm || 0,
            reach: adset.insights.data[0].reach || 0,
            frequency: adset.insights.data[0].frequency || 0,
            results: adset.insights.data[0].actions?.find(a =>
              ['purchase', 'lead', 'link_click', 'offsite_conversion'].includes(a.action_type)
            )?.value || 0,
            cost_per_result: adset.insights.data[0].cost_per_action_type?.find(a =>
              ['purchase', 'lead', 'link_click', 'offsite_conversion'].includes(a.action_type)
            )?.value || 0
          } : {
            impressions: 0,
            clicks: 0,
            spend: 0,
            ctr: 0,
            cpm: 0,
            reach: 0,
            frequency: 0,
            results: 0,
            cost_per_result: 0
          }
        };
      });
    }

    // Update tracking table with last fetched time
    await CampaignTracking.update(
      {
        last_fetched: new Date(),
        status: campaignData.status,
        learning_phase_summary: {
          total_adsets: campaignData.adsets?.data?.length || 0,
          learning: campaignData.adsets?.data?.filter(a => a.learning_status === 'LEARNING').length || 0,
          active: campaignData.adsets?.data?.filter(a => a.learning_status === 'SUCCESS').length || 0,
          limited: campaignData.adsets?.data?.filter(a => a.learning_status === 'FAIL').length || 0
        }
      },
      { where: { campaign_id: campaignId } }
    );

    console.log(`✅ Successfully fetched campaign ${campaignId} with ${campaignData.adsets?.data?.length || 0} ad sets`);

    res.json({
      success: true,
      campaign: campaignData
    });

  } catch (error) {
    console.error('Error fetching campaign details:', error.response?.data || error);

    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign ID or no access to this campaign',
        message: error.response?.data?.error?.message || 'Facebook API error'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign details',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/campaigns/manage/all
 * @desc    Get all campaigns from the ad account with date filtering
 * @access  Private
 */
router.get('/all', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    const {
      ad_account_id,  // NEW: Optional specific ad account ID
      date_preset = 'last_14d',  // Default to last 14 days (Facebook doesn't have last_15d)
      limit = 50,
      after,  // Pagination cursor
    } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's Facebook auth
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId: userId },
      order: [['createdAt', 'DESC']]
    });

    if (!facebookAuth || !facebookAuth.accessToken) {
      return res.status(401).json({
        error: 'Facebook authentication required. Please connect your Facebook account.',
        requiresAuth: true
      });
    }

    // Determine which ad account to use
    let adAccountId;
    let accountName = 'Default Account';

    if (ad_account_id) {
      // 1. Use provided ad account ID if specified
      adAccountId = ad_account_id;
      // Try to get the account name
      const account = await UserResource.findOne({
        where: { userId: userId, resourceId: ad_account_id }
      });
      if (account) accountName = account.name;
    } else {
      // 2. Try to use active resource config
      const activeConfig = await UserResourceConfig.findOne({
        where: { userId: userId, isActive: true }
      });

      if (activeConfig && activeConfig.adAccountId) {
        adAccountId = activeConfig.adAccountId;
        accountName = activeConfig.adAccountName || 'Active Account';
      } else {
        // 3. Fallback to FacebookAuth (original behavior)
        adAccountId = facebookAuth.selectedAdAccount?.id || facebookAuth.adAccountId;
        if (facebookAuth.selectedAdAccount?.name) {
          accountName = facebookAuth.selectedAdAccount.name;
        }
      }
    }

    if (!adAccountId) {
      return res.status(400).json({
        error: 'No ad account selected. Please select an ad account first.',
        requiresSelection: true
      });
    }

    const accessToken = decryptToken(facebookAuth.accessToken);
    if (!accessToken) {
      return res.status(401).json({ error: 'Invalid Facebook access token' });
    }

    // Fetch all campaigns from the ad account with date filtering
    const url = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns`;
    const params = {
      fields: 'id,name,status,objective,created_time,daily_budget,lifetime_budget,spend_cap,bid_strategy,special_ad_categories,insights.date_preset(' + date_preset + '){impressions,clicks,spend,ctr,cpm,reach,frequency,actions,cost_per_action_type}',
      limit: limit,
      access_token: accessToken
    };

    // Add pagination cursor if provided
    if (after) {
      params.after = after;
    }

    console.log(`📊 Fetching all campaigns from ad account ${adAccountId} with date preset: ${date_preset}`);

    const response = await axios.get(url, { params });
    const campaignsData = response.data;

    // Process campaigns to extract Results based on objective
    if (campaignsData.data) {
      campaignsData.data = campaignsData.data.map(campaign => {
        const insights = campaign.insights?.data?.[0];

        // Determine the relevant action type based on objective
        let resultActionType = 'link_click'; // Default
        switch(campaign.objective) {
          case 'OUTCOME_SALES':
          case 'CONVERSIONS':
            resultActionType = 'purchase';
            break;
          case 'OUTCOME_LEADS':
          case 'LEAD_GENERATION':
            resultActionType = 'lead';
            break;
          case 'OUTCOME_ENGAGEMENT':
          case 'POST_ENGAGEMENT':
            resultActionType = 'post_engagement';
            break;
          case 'OUTCOME_TRAFFIC':
          case 'LINK_CLICKS':
            resultActionType = 'link_click';
            break;
          case 'OUTCOME_APP_PROMOTION':
            resultActionType = 'mobile_app_install';
            break;
        }

        return {
          ...campaign,
          metrics: insights ? {
            impressions: insights.impressions || 0,
            clicks: insights.clicks || 0,
            spend: insights.spend || 0,
            ctr: insights.ctr || 0,
            cpm: insights.cpm || 0,
            reach: insights.reach || 0,
            frequency: insights.frequency || 0,
            results: insights.actions?.find(a => a.action_type === resultActionType)?.value || 0,
            cost_per_result: insights.cost_per_action_type?.find(a => a.action_type === resultActionType)?.value || 0
          } : null
        };
      });
    }

    res.json({
      success: true,
      campaigns: campaignsData.data || [],
      paging: campaignsData.paging || null,
      summary: {
        total_campaigns: campaignsData.data?.length || 0,
        active_campaigns: campaignsData.data?.filter(c => c.status === 'ACTIVE').length || 0,
        paused_campaigns: campaignsData.data?.filter(c => c.status === 'PAUSED').length || 0,
        date_range: date_preset
      },
      accountInfo: {
        adAccountId: adAccountId,
        adAccountName: accountName
      }
    });

  } catch (error) {
    console.error('Error fetching all campaigns:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * @route   POST /api/campaigns/manage/status
 * @desc    Update campaign status (pause/resume)
 * @access  Private
 */
router.post('/status', authenticate, async (req, res) => {
  try {
    const { campaignId, status } = req.body;
    const userId = req.user?.id || req.userId;

    if (!campaignId || !status) {
      return res.status(400).json({ error: 'Campaign ID and status are required' });
    }

    if (!['ACTIVE', 'PAUSED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACTIVE or PAUSED' });
    }

    // Get user's Facebook auth
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId: userId },
      order: [['createdAt', 'DESC']]
    });

    if (!facebookAuth || !facebookAuth.accessToken) {
      return res.status(401).json({ error: 'Facebook authentication required' });
    }

    const accessToken = decryptToken(facebookAuth.accessToken);
    if (!accessToken) {
      return res.status(401).json({ error: 'Invalid Facebook access token' });
    }

    // Update campaign status on Facebook
    const url = `https://graph.facebook.com/v19.0/${campaignId}`;
    const params = {
      status: status,
      access_token: accessToken
    };

    console.log(`🔄 Updating campaign ${campaignId} status to ${status}...`);

    await axios.post(url, null, { params });

    // Get campaign details for ad account info
    const campaignDetailsUrl = `https://graph.facebook.com/v19.0/${campaignId}`;
    const campaignDetailsParams = {
      fields: 'id,name,account_id',
      access_token: accessToken
    };
    const campaignDetails = await axios.get(campaignDetailsUrl, { params: campaignDetailsParams });

    // Update local tracking
    await CampaignTracking.update(
      { status },
      { where: { campaign_id: campaignId } }
    );

    // Audit log
    await AuditService.logRequest(req, status === 'ACTIVE' ? 'campaign.resume' : 'campaign.pause', 'campaign', campaignId, 'success', null, {
      campaignId: campaignId,
      campaignName: campaignDetails.data.name,
      adAccountId: campaignDetails.data.account_id,
      previousStatus: status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
      newStatus: status
    });

    console.log(`✅ Campaign ${campaignId} status updated to ${status}`);

    res.json({
      success: true,
      message: `Campaign ${status === 'ACTIVE' ? 'resumed' : 'paused'} successfully`,
      status
    });

  } catch (error) {
    console.error('Error updating campaign status:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign status',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * @route   POST /api/campaigns/manage/track
 * @desc    Add a campaign to tracking (for manually entered campaign IDs)
 * @access  Private
 */
router.post('/track', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.body;
    const userId = req.user?.id || req.userId;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // Check if already tracking
    const existing = await CampaignTracking.findOne({
      where: { campaign_id: campaignId }
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'Campaign already being tracked',
        campaign: existing
      });
    }

    // Get user's Facebook auth
    const facebookAuth = await FacebookAuth.findOne({
      where: { userId: userId },
      order: [['createdAt', 'DESC']]
    });

    if (!facebookAuth) {
      return res.status(401).json({ error: 'Facebook authentication required' });
    }

    const accessToken = decryptToken(facebookAuth.accessToken);

    // Fetch campaign info from Facebook to verify access
    const url = `https://graph.facebook.com/v19.0/${campaignId}`;
    const params = {
      fields: 'id,name,status,objective',
      access_token: accessToken
    };

    const response = await axios.get(url, { params });
    const campaignData = response.data;

    // Get ad account ID from campaign
    const adAccountId = facebookAuth.selectedAdAccount?.id || 'unknown';

    // Add to tracking
    const tracking = await CampaignTracking.create({
      campaign_id: campaignId,
      campaign_name: campaignData.name || 'Unknown Campaign',
      user_id: userId,
      ad_account_id: adAccountId,
      strategy_type: 'manual',
      status: campaignData.status
    });

    // Audit log
    await AuditService.logRequest(req, 'campaign.track', 'campaign', campaignId, 'success', null, {
      campaignId: campaignId,
      campaignName: campaignData.name,
      adAccountId: adAccountId,
      objective: campaignData.objective
    });

    res.json({
      success: true,
      message: 'Campaign added to tracking',
      campaign: tracking
    });

  } catch (error) {
    console.error('Error adding campaign to tracking:', error.response?.data || error);
    res.status(500).json({
      success: false,
      error: 'Failed to add campaign to tracking',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * @route   DELETE /api/campaigns/manage/track/:campaignId
 * @desc    Remove a campaign from tracking
 * @access  Private
 */
router.delete('/track/:campaignId', authenticate, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user?.id || req.userId;

    // Get campaign info before deleting for audit log
    const tracking = await CampaignTracking.findOne({
      where: {
        campaign_id: campaignId,
        user_id: userId
      }
    });

    const deleted = await CampaignTracking.destroy({
      where: {
        campaign_id: campaignId,
        user_id: userId
      }
    });

    if (deleted) {
      // Audit log
      await AuditService.logRequest(req, 'campaign.untrack', 'campaign', campaignId, 'success', null, {
        campaignId: campaignId,
        campaignName: tracking?.campaign_name,
        adAccountId: tracking?.ad_account_id
      });

      res.json({
        success: true,
        message: 'Campaign removed from tracking'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Campaign not found in tracking'
      });
    }

  } catch (error) {
    console.error('Error removing campaign from tracking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove campaign from tracking',
      message: error.message
    });
  }
});

module.exports = router;