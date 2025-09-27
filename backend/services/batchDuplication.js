const axios = require('axios');

/**
 * Batch API Duplication Service
 * Reduces API calls from 200+ to just 2-3 by using Facebook's Batch API
 */
class BatchDuplicationService {
  constructor(accessToken, adAccountId, pageId) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.pageId = pageId; // ADDED: Store pageId to match 1-50-1 pattern
    this.baseURL = 'https://graph.facebook.com/v18.0';
    this.maxBatchSize = 50; // Facebook allows 50 requests per batch
  }

  /**
   * Duplicate campaign using batch API (2-3 total API calls instead of 200+)
   */
  async duplicateCampaignBatch(campaignId, newName, copies = 1) {
    try {
      console.log(`🚀 Starting BATCH duplication for campaign ${campaignId}`);
      console.log(`📊 Creating ${copies} copies with minimal API calls`);

      // Step 1: Get ALL campaign data in ONE call using field expansion
      const campaignData = await this.getCampaignFullData(campaignId);

      const results = [];
      for (let copyIndex = 0; copyIndex < copies; copyIndex++) {
        const copyName = copies > 1
          ? `${newName} - Copy ${copyIndex + 1}`
          : newName;

        console.log(`🔄 Creating copy ${copyIndex + 1}/${copies}: "${copyName}"`);

        // Step 2: Create batch requests for this copy
        const batchRequests = this.prepareBatchRequests(campaignData, copyName);

        // Step 3: Execute batch (all operations in 1-2 API calls)
        const copyResult = await this.executeBatch(batchRequests);
        results.push(copyResult);

        // Small delay between copies to avoid rate limits
        if (copyIndex < copies - 1) {
          await this.delay(1000);
        }
      }

      console.log(`✅ Batch duplication complete! Created ${results.length} copies`);
      return results;

    } catch (error) {
      console.error('❌ Batch duplication failed:', error.message);
      throw error;
    }
  }

  /**
   * Get ALL campaign data in ONE API call using field expansion
   */
  async getCampaignFullData(campaignId) {
    console.log(`📊 Fetching complete campaign data in ONE call...`);

    // SIMPLIFIED field expansion - only get essential data and creative IDs
    const fields = 'id,name,status,objective,special_ad_categories,' +
      'special_ad_category_country,daily_budget,lifetime_budget,' +
      'bid_strategy,budget_remaining,account_id,' +
      'adsets.limit(200){' +
        'id,name,status,targeting,daily_budget,lifetime_budget,' +
        'optimization_goal,billing_event,bid_amount,bid_strategy,' +
        'promoted_object,attribution_spec,conversion_specs,' +
        'start_time,end_time,schedule,frequency_control_specs,' +
        'optimization_sub_event,min_spending_target,max_spending_target,' +
        'pacing_type,instagram_actor_id,destination_type,' +
        'ads.limit(100){' +
          'id,name,status,tracking_specs,conversion_specs,url_tags,' +
          'creative{id,object_story_id,effective_object_story_id}' +
        '}' +
      '}';

    try {
      const response = await axios.get(
        `${this.baseURL}/${campaignId}`,
        {
          params: {
            fields,
            access_token: this.accessToken
          }
        }
      );

      const data = response.data;
      const adSetCount = data.adsets?.data?.length || 0;
      const totalAds = data.adsets?.data?.reduce((sum, adSet) =>
        sum + (adSet.ads?.data?.length || 0), 0) || 0;

      console.log(`✅ Fetched: 1 campaign, ${adSetCount} ad sets, ${totalAds} ads in ONE call!`);
      return data;

    } catch (error) {
      console.error('Failed to fetch campaign data:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Prepare batch requests for creating campaign copy
   */
  prepareBatchRequests(campaignData, newName) {
    const requests = [];

    // Extract account ID
    let accountId = campaignData.account_id;
    if (accountId && accountId.startsWith('act_')) {
      accountId = accountId.substring(4);
    }

    // 1. Create new campaign
    const campaignRequest = {
      method: 'POST',
      relative_url: `act_${accountId}/campaigns`,
      body: this.prepareCampaignBody(campaignData, newName)
    };
    requests.push(campaignRequest);

    // 2. Create all ad sets
    if (campaignData.adsets?.data) {
      campaignData.adsets.data.forEach((adSet, adSetIndex) => {
        const adSetRequest = {
          method: 'POST',
          relative_url: `act_${accountId}/adsets`,
          body: this.prepareAdSetBody(adSet, '{result=create-campaign:$.id}')
        };
        requests.push(adSetRequest);

        // 3. Create ads for this ad set
        if (adSet.ads?.data) {
          adSet.ads.data.forEach(ad => {
            const adRequest = {
              method: 'POST',
              relative_url: `act_${accountId}/ads`,
              body: this.prepareAdBody(ad, `{result=create-adset-${adSetIndex}:$.id}`)
            };
            requests.push(adRequest);
          });
        }
      });
    }

    console.log(`📦 Prepared ${requests.length} operations for batch execution`);
    return requests;
  }

  /**
   * Prepare campaign body for batch request
   */
  prepareCampaignBody(campaign, newName) {
    const body = {
      name: newName,
      objective: campaign.objective,
      status: 'PAUSED',
      special_ad_categories: JSON.stringify(campaign.special_ad_categories || [])
    };

    if (campaign.special_ad_category_country) {
      body.special_ad_category_country = campaign.special_ad_category_country;
    }
    if (campaign.daily_budget) {
      body.daily_budget = campaign.daily_budget;
    }
    if (campaign.lifetime_budget) {
      body.lifetime_budget = campaign.lifetime_budget;
    }
    if (campaign.bid_strategy) {
      body.bid_strategy = campaign.bid_strategy;
    }
    // CBO is determined by having a campaign-level budget, not a separate field

    return this.encodeBody(body);
  }

  /**
   * Prepare ad set body for batch request
   */
  prepareAdSetBody(adSet, campaignIdRef) {
    const body = {
      name: `${adSet.name} - Copy`,
      campaign_id: campaignIdRef,
      status: adSet.status || 'PAUSED',
      targeting: JSON.stringify(adSet.targeting),
      optimization_goal: adSet.optimization_goal,
      billing_event: adSet.billing_event || 'IMPRESSIONS'
    };

    // Add budget
    if (adSet.daily_budget) {
      body.daily_budget = adSet.daily_budget;
    }
    if (adSet.lifetime_budget) {
      body.lifetime_budget = adSet.lifetime_budget;
    }

    // Add optional fields
    if (adSet.bid_strategy) {
      body.bid_strategy = adSet.bid_strategy;
    }
    if (adSet.bid_amount) {
      body.bid_amount = adSet.bid_amount;
    }
    if (adSet.promoted_object) {
      body.promoted_object = JSON.stringify(adSet.promoted_object);
    }
    if (adSet.attribution_spec) {
      body.attribution_spec = JSON.stringify(adSet.attribution_spec);
    }
    if (adSet.schedule) {
      body.schedule = JSON.stringify(adSet.schedule);
    }

    return this.encodeBody(body);
  }

  /**
   * Prepare ad body for batch request
   */
  prepareAdBody(ad, adSetIdRef) {
    const body = {
      name: `${ad.name} - Copy`,
      adset_id: adSetIdRef,
      status: 'PAUSED'
    };

    // Handle creative
    if (ad.creative) {
      const creative = ad.creative;

      // Check if this uses an existing post
      if (creative.object_story_id || creative.effective_object_story_id) {
        // Use existing post - FIXED: Use same pattern as 1-50-1 strategy
        body.creative = JSON.stringify({
          object_story_id: creative.object_story_id || creative.effective_object_story_id,
          page_id: this.pageId  // ADDED: Include pageId like 1-50-1 does
        });
      } else if (creative.object_story_spec) {
        // Use story spec
        body.creative = JSON.stringify({
          object_story_spec: creative.object_story_spec
        });
      } else if (creative.id) {
        // Reference existing creative by ID - ADDED: new fallback option
        body.creative = JSON.stringify({
          creative_id: creative.id
        });
      } else {
        // Full creative
        const newCreative = {
          name: creative.name || `${ad.name} - Creative`,
          object_type: creative.object_type
        };

        // Add creative fields
        ['title', 'body', 'link_url', 'link_caption', 'link_description',
         'call_to_action_type', 'object_url', 'image_hash', 'video_id'].forEach(field => {
          if (creative[field]) {
            newCreative[field] = creative[field];
          }
        });

        body.creative = JSON.stringify(newCreative);
      }
    }

    // Add tracking
    if (ad.tracking_specs) {
      body.tracking_specs = JSON.stringify(ad.tracking_specs);
    }
    if (ad.url_tags) {
      body.url_tags = ad.url_tags;
    }

    return this.encodeBody(body);
  }

  /**
   * Execute batch requests
   */
  async executeBatch(requests) {
    const batches = [];

    // Split into chunks of 50 (Facebook's limit)
    for (let i = 0; i < requests.length; i += this.maxBatchSize) {
      batches.push(requests.slice(i, i + this.maxBatchSize));
    }

    console.log(`🔄 Executing ${batches.length} batch(es) with ${requests.length} total operations`);

    const results = [];
    for (let i = 0; i < batches.length; i++) {
      console.log(`  📤 Sending batch ${i + 1}/${batches.length} (${batches[i].length} operations)`);

      try {
        const response = await axios.post(
          this.baseURL,
          {
            batch: JSON.stringify(batches[i]),
            access_token: this.accessToken
          }
        );

        results.push(...response.data);
        console.log(`  ✅ Batch ${i + 1} complete`);

        // Process results to extract IDs
        const campaignId = this.extractIdFromBatchResponse(response.data[0]);
        if (campaignId) {
          console.log(`  📋 New campaign created: ${campaignId}`);
        }

      } catch (error) {
        console.error(`  ❌ Batch ${i + 1} failed:`, error.response?.data || error.message);
        throw error;
      }

      // Small delay between batches
      if (i < batches.length - 1) {
        await this.delay(500);
      }
    }

    return results;
  }

  /**
   * Helper to encode body parameters for batch API
   */
  encodeBody(body) {
    return Object.entries(body)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * Extract ID from batch response
   */
  extractIdFromBatchResponse(response) {
    if (response && response.code === 200 && response.body) {
      try {
        const body = JSON.parse(response.body);
        return body.id;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Helper delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BatchDuplicationService;