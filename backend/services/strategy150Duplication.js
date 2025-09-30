const axios = require('axios');

/**
 * Strategy 1-50-1 Based Duplication Service
 *
 * This service follows the EXACT same pattern as the working 1-50-1 strategy
 * to duplicate campaigns. It uses the same creative structure and API calls
 * that are proven to work in production.
 */
class Strategy150DuplicationService {
  constructor(accessToken, adAccountId, pageId, pixelId) {
    console.log(`🔍 DEBUG: Strategy150DuplicationService constructor parameters:`);
    console.log(`  - accessToken: ${accessToken ? 'SET' : 'UNDEFINED'}`);
    console.log(`  - adAccountId: ${adAccountId || 'UNDEFINED'}`);
    console.log(`  - pageId: ${pageId || 'UNDEFINED'}`);
    console.log(`  - pixelId: ${pixelId || 'UNDEFINED'}`);

    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.pageId = pageId;
    this.pixelId = pixelId;
    this.baseURL = 'https://graph.facebook.com/v18.0';
  }

  /**
   * Duplicate campaign using the exact same pattern as 1-50-1 strategy
   */
  async duplicateCampaign(campaignId, newName, copies = 1) {
    console.log(`🚀 Starting 1-50-1 based duplication for campaign ${campaignId}`);
    console.log(`📊 Creating ${copies} copies using proven working pattern`);

    const results = [];
    let campaignData = null;

    try {
      // Step 1: Get campaign data using the same approach as 1-50-1
      campaignData = await this.getCampaignData(campaignId);

      // Step 2: Get the post ID from the campaign using 1-50-1 pattern
      const postId = await this.getPostIdFromCampaign(campaignId);

      if (!postId) {
        throw new Error('Could not find post ID from campaign - required for 1-50-1 duplication');
      }

      console.log(`✅ Found post ID: ${postId}`);

      // Step 3: Create copies using the exact 1-50-1 pattern
      for (let copyIndex = 0; copyIndex < copies; copyIndex++) {
        const copyName = copies > 1
          ? `${newName} - Copy ${copyIndex + 1}`
          : newName;

        console.log(`🔄 Creating copy ${copyIndex + 1}/${copies}: "${copyName}"`);

        const copyResult = await this.createCampaignCopy(campaignData, copyName, postId);

        // Add original campaign info to result for error reporting
        copyResult.originalCampaignId = campaignId;
        copyResult.originalCampaignName = campaignData.name;

        results.push(copyResult);

        // Delay between copies to avoid rate limits
        if (copyIndex < copies - 1) {
          await this.delay(2000);
        }
      }

      console.log(`✅ 1-50-1 based duplication complete! Created ${results.length} copies`);
      return results;

    } catch (error) {
      console.error('❌ 1-50-1 based duplication failed:', error.message);

      // Return error result with campaign info
      return [{
        originalCampaignId: campaignId,
        originalCampaignName: campaignData?.name || 'Unknown',
        campaign: null,
        adSets: [],
        ads: [],
        totalAdSets: 0,
        totalAds: 0,
        errors: [{
          stage: 'initialization',
          message: error.message,
          details: error.response?.data
        }],
        success: false,
        partialSuccess: false
      }];
    }
  }

  /**
   * Get campaign data using the same fields as 1-50-1 strategy
   */
  async getCampaignData(campaignId) {
    console.log(`📊 Fetching campaign data using 1-50-1 pattern...`);

    try {
      const response = await axios.get(
        `${this.baseURL}/${campaignId}`,
        {
          params: {
            fields: 'id,name,status,objective,special_ad_categories,special_ad_category_country,daily_budget,lifetime_budget,bid_strategy,account_id,adsets.limit(1){promoted_object,optimization_goal,billing_event}',
            access_token: this.accessToken
          }
        }
      );

      console.log(`✅ Fetched campaign data successfully`);
      return response.data;

    } catch (error) {
      console.error('Failed to fetch campaign data:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get post ID from campaign using the exact same method as 1-50-1
   */
  async getPostIdFromCampaign(campaignId) {
    console.log(`🔍 Getting post ID from campaign using 1-50-1 method...`);

    try {
      // Get first ad set from campaign
      const adSetsResponse = await axios.get(
        `${this.baseURL}/${campaignId}/adsets`,
        {
          params: {
            fields: 'id',
            access_token: this.accessToken,
            limit: 1
          }
        }
      );

      if (!adSetsResponse.data?.data?.[0]) {
        throw new Error('No ad sets found in campaign');
      }

      const firstAdSetId = adSetsResponse.data.data[0].id;

      // Get post ID from first ad using 1-50-1 pattern
      const adsResponse = await axios.get(
        `${this.baseURL}/${firstAdSetId}/ads`,
        {
          params: {
            fields: 'creative{effective_object_story_id,object_story_id}',
            access_token: this.accessToken,
            limit: 1
          }
        }
      );

      if (!adsResponse.data?.data?.[0]?.creative) {
        throw new Error('No creative found in first ad');
      }

      const creative = adsResponse.data.data[0].creative;
      const postId = creative.effective_object_story_id || creative.object_story_id;

      if (!postId) {
        throw new Error('No post ID found in creative');
      }

      return postId;

    } catch (error) {
      console.error('Failed to get post ID from campaign:', error.message);
      throw error;
    }
  }

  /**
   * Create campaign copy using the exact same structure as 1-50-1
   */
  async createCampaignCopy(originalCampaign, newName, postId) {
    console.log(`📋 Creating campaign copy using 1-50-1 structure...`);

    const errors = [];
    let newCampaign = null;
    let adSets = [];
    let ads = [];

    try {
      // Step 1: Create campaign using 1-50-1 pattern
      newCampaign = await this.createCampaign(originalCampaign, newName);

      // Step 2: Get original ad set configuration for promoted_object
      const originalAdSetConfig = originalCampaign.adsets?.data?.[0];

      // Step 3: Check if campaign uses CBO (Campaign Budget Optimization)
      const usesCBO = !!(originalCampaign.daily_budget || originalCampaign.lifetime_budget);
      console.log(`📊 Campaign uses CBO: ${usesCBO}`);

      // Step 4: Create 50 ad sets using 1-50-1 pattern with original promoted_object
      const adSetResult = await this.create50AdSets(newCampaign.id, postId, originalAdSetConfig, usesCBO);
      adSets = adSetResult.adSets;
      if (adSetResult.errors && adSetResult.errors.length > 0) {
        errors.push(...adSetResult.errors);
      }

      // Step 5: Create ads in each ad set using 1-50-1 pattern
      const adsResult = await this.createAdsInAdSets(adSets, postId);
      ads = adsResult.ads;
      if (adsResult.errors && adsResult.errors.length > 0) {
        errors.push(...adsResult.errors);
      }

    } catch (error) {
      console.error('Failed to create campaign copy:', error.message);
      errors.push({
        stage: 'campaign_creation',
        message: error.message,
        details: error.response?.data
      });
    }

    return {
      campaign: newCampaign,
      adSets: adSets,
      ads: ads,
      totalAdSets: adSets.length,
      totalAds: ads.length,
      errors: errors,
      success: errors.length === 0,
      partialSuccess: errors.length > 0 && (adSets.length > 0 || ads.length > 0)
    };
  }

  /**
   * Create campaign using the exact same parameters as 1-50-1
   */
  async createCampaign(originalCampaign, newName) {
    console.log(`📋 Creating campaign: ${newName}`);

    const campaignData = {
      name: newName,
      objective: originalCampaign.objective,
      status: 'PAUSED', // Start paused like 1-50-1
      access_token: this.accessToken
    };

    // Add optional fields if they exist (same as 1-50-1)
    if (originalCampaign.special_ad_categories) {
      campaignData.special_ad_categories = JSON.stringify(originalCampaign.special_ad_categories);
    }
    if (originalCampaign.special_ad_category_country) {
      campaignData.special_ad_category_country = originalCampaign.special_ad_category_country;
    }
    if (originalCampaign.daily_budget) {
      campaignData.daily_budget = originalCampaign.daily_budget;
    }
    if (originalCampaign.lifetime_budget) {
      campaignData.lifetime_budget = originalCampaign.lifetime_budget;
    }
    if (originalCampaign.bid_strategy) {
      campaignData.bid_strategy = originalCampaign.bid_strategy;
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/act_${this.adAccountId}/campaigns`,
        null,
        { params: campaignData }
      );

      console.log(`✅ Campaign created: ${response.data.id}`);
      return response.data;

    } catch (error) {
      console.error('Failed to create campaign:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create 50 ad sets using sequential API calls (proven to work)
   */
  async create50AdSets(campaignId, postId, originalAdSetConfig, usesCBO) {
    console.log(`📋 Creating 50 ad sets using sequential API calls...`);
    console.log(`💰 Budget configuration: ${usesCBO ? 'Campaign-level (CBO)' : 'Ad Set-level'}`);

    const adSets = [];
    const errors = [];
    let failedCount = 0;

    // Create ad sets sequentially with delays to avoid rate limits
    for (let i = 1; i <= 50; i++) {
      const adSetData = {
        name: `AdSet ${i}`,
        campaign_id: campaignId,
        status: 'ACTIVE',
        billing_event: originalAdSetConfig?.billing_event || 'IMPRESSIONS',
        optimization_goal: originalAdSetConfig?.optimization_goal || 'OFFSITE_CONVERSIONS',
        targeting: JSON.stringify({
          geo_locations: {
            countries: ['US']
          },
          age_min: 18,
          age_max: 65
        }),
        access_token: this.accessToken
      };

      // Only set ad set budget if campaign doesn't use CBO
      if (!usesCBO) {
        adSetData.daily_budget = 100; // $1.00 in cents
      }

      // Use original campaign's promoted_object
      if (originalAdSetConfig?.promoted_object) {
        adSetData.promoted_object = JSON.stringify(originalAdSetConfig.promoted_object);
      } else if (this.pixelId) {
        adSetData.promoted_object = JSON.stringify({
          pixel_id: this.pixelId,
          custom_event_type: 'PURCHASE'
        });
      }

      // Create single ad set with retry logic
      try {
        console.log(`⏳ Creating AdSet ${i}/50...`);

        const response = await axios.post(
          `${this.baseURL}/act_${this.adAccountId}/adsets`,
          null,
          { params: adSetData }
        );

        adSets.push(response.data);
        console.log(`✅ AdSet ${i} created: ${response.data.id}`);

        // Add delay to avoid rate limits (500ms between ad sets)
        if (i < 50) {
          await this.delay(500);
        }

      } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error(`❌ Failed to create AdSet ${i}:`, errorMessage);

        errors.push({
          stage: 'ad_set_creation',
          index: i,
          name: `AdSet ${i}`,
          message: errorMessage,
          details: error.response?.data?.error
        });

        failedCount++;

        // If too many failures, stop trying
        if (failedCount > 5) {
          console.error('Too many failures, stopping ad set creation');
          break;
        }

        // Wait longer before retrying after a failure
        await this.delay(2000);
      }
    }

    console.log(`✅ Created ${adSets.length}/50 ad sets successfully`);
    if (errors.length > 0) {
      console.log(`⚠️ Failed to create ${errors.length} ad sets`);
    }

    return { adSets, errors };
  }

  /**
   * Create ads in ad sets using sequential API calls (proven to work)
   */
  async createAdsInAdSets(adSets, postId) {
    console.log(`📋 Creating ads using sequential API calls...`);
    console.log(`📍 Using existing post ID: ${postId}`);

    const ads = [];
    const errors = [];
    let failedCount = 0;

    // Create one ad per ad set sequentially
    for (let i = 0; i < adSets.length; i++) {
      const adSet = adSets[i];

      const adData = {
        name: `Ad ${i + 1}`,
        adset_id: adSet.id,
        // Use existing post (same as 1-50-1 working pattern)
        creative: JSON.stringify({
          object_story_id: postId,
          page_id: this.pageId
        }),
        status: 'ACTIVE',
        access_token: this.accessToken
      };

      try {
        console.log(`⏳ Creating Ad ${i + 1}/${adSets.length} for AdSet ${adSet.id}...`);

        const response = await axios.post(
          `${this.baseURL}/act_${this.adAccountId}/ads`,
          null,
          { params: adData }
        );

        ads.push(response.data);
        console.log(`✅ Ad ${i + 1} created: ${response.data.id}`);

        // Add small delay to avoid rate limits (300ms between ads)
        if (i < adSets.length - 1) {
          await this.delay(300);
        }

      } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error(`❌ Failed to create Ad ${i + 1}:`, errorMessage);

        errors.push({
          stage: 'ad_creation',
          index: i + 1,
          name: `Ad ${i + 1}`,
          adSetId: adSet.id,
          message: errorMessage,
          details: error.response?.data?.error
        });

        failedCount++;

        // If too many failures, stop trying
        if (failedCount > 10) {
          console.error('Too many failures, stopping ad creation');
          break;
        }

        // Wait before continuing after a failure
        await this.delay(1000);
      }
    }

    console.log(`✅ Created ${ads.length}/${adSets.length} ads successfully`);
    if (errors.length > 0) {
      console.log(`⚠️ Failed to create ${errors.length} ads`);
    }

    return { ads, errors };
  }

  /**
   * Encode body parameters for batch API (same as existing batch service)
   */
  encodeBody(body) {
    return Object.entries(body)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * Helper delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Strategy150DuplicationService;