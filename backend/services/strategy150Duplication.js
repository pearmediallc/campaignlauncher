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

    try {
      // Step 1: Get campaign data using the same approach as 1-50-1
      const campaignData = await this.getCampaignData(campaignId);

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
      throw error;
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
            fields: 'id,name,status,objective,special_ad_categories,special_ad_category_country,daily_budget,lifetime_budget,bid_strategy,account_id',
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

    try {
      // Step 1: Create campaign using 1-50-1 pattern
      const newCampaign = await this.createCampaign(originalCampaign, newName);

      // Step 2: Create 50 ad sets using 1-50-1 pattern
      const adSets = await this.create50AdSets(newCampaign.id, postId);

      // Step 3: Create ads in each ad set using 1-50-1 pattern
      const ads = await this.createAdsInAdSets(adSets, postId);

      return {
        campaign: newCampaign,
        adSets: adSets,
        ads: ads,
        totalAdSets: adSets.length,
        totalAds: ads.length
      };

    } catch (error) {
      console.error('Failed to create campaign copy:', error.message);
      throw error;
    }
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
   * Create 50 ad sets using the exact same pattern as 1-50-1
   */
  async create50AdSets(campaignId, postId) {
    console.log(`📋 Creating 50 ad sets using 1-50-1 pattern...`);

    const adSets = [];
    const batchRequests = [];

    // Create batch requests for all 50 ad sets (same as 1-50-1)
    for (let i = 1; i <= 50; i++) {
      const adSetData = {
        name: `AdSet ${i}`,
        campaign_id: campaignId,
        status: 'ACTIVE', // Same as 1-50-1
        daily_budget: 100, // $1.00 in cents (same as 1-50-1)
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'OFFSITE_CONVERSIONS',
        targeting: JSON.stringify({
          geo_locations: {
            countries: ['US']
          },
          age_min: 18,
          age_max: 65
        }),
        access_token: this.accessToken
      };

      // Add promoted object if we have pixel (same as 1-50-1)
      if (this.pixelId) {
        adSetData.promoted_object = JSON.stringify({
          pixel_id: this.pixelId,
          custom_event_type: 'LEAD'
        });
      }

      batchRequests.push({
        method: 'POST',
        relative_url: `act_${this.adAccountId}/adsets`,
        body: this.encodeBody(adSetData)
      });
    }

    // Execute batch requests (same pattern as 1-50-1)
    try {
      const response = await axios.post(
        this.baseURL,
        {
          batch: JSON.stringify(batchRequests),
          access_token: this.accessToken
        }
      );

      // Process batch results
      for (const result of response.data) {
        if (result.code === 200) {
          const adSetData = JSON.parse(result.body);
          adSets.push(adSetData);
        } else {
          console.error('Ad set creation failed:', result);
        }
      }

      console.log(`✅ Created ${adSets.length}/50 ad sets`);
      return adSets;

    } catch (error) {
      console.error('Failed to create ad sets:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create ads in ad sets using the EXACT same pattern as working 1-50-1
   */
  async createAdsInAdSets(adSets, postId) {
    console.log(`📋 Creating ads using EXACT 1-50-1 pattern...`);

    const ads = [];
    const batchRequests = [];

    // Create one ad per ad set using the EXACT 1-50-1 creative pattern
    for (let i = 0; i < adSets.length; i++) {
      const adSet = adSets[i];

      const adData = {
        name: `Ad ${i + 1}`,
        adset_id: adSet.id,
        // THIS IS THE EXACT SAME CREATIVE PATTERN AS WORKING 1-50-1 (lines 1640-1641)
        creative: JSON.stringify({
          object_story_id: postId,
          page_id: this.pageId  // Use this.pageId exactly like working 1-50-1 does
        }),
        status: 'ACTIVE',
        access_token: this.accessToken
      };

      batchRequests.push({
        method: 'POST',
        relative_url: `act_${this.adAccountId}/ads`,
        body: this.encodeBody(adData)
      });
    }

    // Execute in batches of 50 (Facebook limit)
    const batchSize = 50;
    for (let i = 0; i < batchRequests.length; i += batchSize) {
      const batch = batchRequests.slice(i, i + batchSize);

      try {
        const response = await axios.post(
          this.baseURL,
          {
            batch: JSON.stringify(batch),
            access_token: this.accessToken
          }
        );

        // Process batch results
        for (const result of response.data) {
          if (result.code === 200) {
            const adData = JSON.parse(result.body);
            ads.push(adData);
          } else {
            console.error('Ad creation failed:', result);
          }
        }

        console.log(`✅ Created ads batch ${Math.floor(i/batchSize) + 1}, total ads: ${ads.length}`);

        // Small delay between batches
        if (i + batchSize < batchRequests.length) {
          await this.delay(1000);
        }

      } catch (error) {
        console.error('Failed to create ads batch:', error.response?.data || error.message);
        throw error;
      }
    }

    console.log(`✅ Created ${ads.length} ads total`);
    return ads;
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