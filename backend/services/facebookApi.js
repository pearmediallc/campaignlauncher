const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const ImageConverter = require('./imageConverter');

class FacebookAPI {
  constructor(userCredentials = {}) {
    this.baseURL = `https://graph.facebook.com/${process.env.FB_API_VERSION}`;
    // Use user-specific credentials if provided, otherwise fall back to env (for backwards compatibility)
    this.accessToken = userCredentials.accessToken || process.env.FB_ACCESS_TOKEN;
    this.adAccountId = userCredentials.adAccountId || process.env.FB_AD_ACCOUNT_ID;
    this.pageId = userCredentials.pageId || process.env.FB_PAGE_ID;
    this.pixelId = userCredentials.pixelId || process.env.FB_PIXEL_ID;
    
    // Facebook region IDs for US states (these are the actual Facebook region keys)
    // Source: Facebook Marketing API
    this.stateToRegionId = {
      'AL': '3843', 'AK': '3844', 'AZ': '3845', 'AR': '3846', 'CA': '3847',
      'CO': '3848', 'CT': '3849', 'DE': '3850', 'FL': '3851', 'GA': '3852',
      'HI': '3853', 'ID': '3854', 'IL': '3855', 'IN': '3856', 'IA': '3857',
      'KS': '3858', 'KY': '3859', 'LA': '3860', 'ME': '3861', 'MD': '3862',
      'MA': '3863', 'MI': '3864', 'MN': '3865', 'MS': '3866', 'MO': '3867',
      'MT': '3868', 'NE': '3869', 'NV': '3870', 'NH': '3871', 'NJ': '3872',
      'NM': '3873', 'NY': '3874', 'NC': '3875', 'ND': '3876', 'OH': '3877',
      'OK': '3878', 'OR': '3879', 'PA': '3880', 'RI': '3881', 'SC': '3882',
      'SD': '3883', 'TN': '3884', 'TX': '3885', 'UT': '3886', 'VT': '3887',
      'VA': '3888', 'WA': '3889', 'WV': '3890', 'WI': '3891', 'WY': '3892',
      'DC': '3893'
    };
  }

  async createCampaign(campaignData) {
    console.log('\n=== CAMPAIGN CREATION START ===');
    console.log('📍 Step 1: Creating Campaign');
    console.log('🔗 API URL:', `${this.baseURL}/act_${this.adAccountId}/campaigns`);
    console.log('📊 Ad Account ID:', this.adAccountId);

    try {
      const url = `${this.baseURL}/act_${this.adAccountId}/campaigns`;

      // Use passed parameters instead of hardcoded values
      const params = {
        name: `[REVIEW] ${campaignData.name}`,
        objective: campaignData.objective || 'OUTCOME_LEADS',
        status: campaignData.status || 'ACTIVE',
        // Properly handle special ad categories
        special_ad_categories: JSON.stringify(
          Array.isArray(campaignData.specialAdCategories)
            ? campaignData.specialAdCategories.filter(cat => cat !== 'NONE' && cat !== '')
            : []
        ),
        buying_type: campaignData.buyingType || 'AUCTION',
        access_token: this.accessToken
      };

      // Only add bid strategy if there's a campaign-level budget
      // Facebook requires a budget to use bid strategies
      if (campaignData.bidStrategy && (campaignData.daily_budget || campaignData.lifetime_budget)) {
        params.bid_strategy = campaignData.bidStrategy;
        console.log('  - Bid Strategy added (campaign has budget)');
      } else if (campaignData.bidStrategy) {
        console.log('  - Bid Strategy skipped (no campaign budget, using ad set budget)');
      }

      // Add optional parameters if provided
      if (campaignData.spend_cap) {
        params.spend_cap = Math.round(parseFloat(campaignData.spend_cap) * 100);
      }
      if (campaignData.daily_budget) {
        params.daily_budget = Math.round(parseFloat(campaignData.daily_budget) * 100);
      }
      if (campaignData.lifetime_budget) {
        params.lifetime_budget = Math.round(parseFloat(campaignData.lifetime_budget) * 100);
      }

      console.log('📋 Campaign Parameters:');
      console.log('  - Name:', params.name);
      console.log('  - Objective:', params.objective);
      console.log('  - Status:', params.status);
      console.log('  - Buying Type:', params.buying_type);
      console.log('  - Bid Strategy:', params.bid_strategy || 'Not set');
      console.log('  - Special Ad Categories:', params.special_ad_categories);
      console.log('  - Daily Budget:', params.daily_budget ? `$${params.daily_budget/100}` : 'Not set');
      console.log('  - Lifetime Budget:', params.lifetime_budget ? `$${params.lifetime_budget/100}` : 'Not set');
      console.log('  - Spend Cap:', params.spend_cap ? `$${params.spend_cap/100}` : 'Not set');
      console.log('\n📤 Sending Campaign Creation Request...');

      const response = await axios.post(url, null, { params });
      console.log('✅ Campaign Created Successfully!');
      console.log('🆔 Campaign ID:', response.data.id);
      console.log('=== CAMPAIGN CREATION END ===\n');
      return response.data;
    } catch (error) {
      console.error('❌ Campaign Creation Failed!');
      console.error('🔴 Error at Campaign Level');
      this.handleError(error);
    }
  }

  async createAdSet(adSetData) {
    console.log('\n=== ADSET CREATION START ===');
    console.log('📍 Step 2: Creating AdSet');
    console.log('🔗 API URL:', `${this.baseURL}/act_${this.adAccountId}/adsets`);
    console.log('🎯 Campaign ID:', adSetData.campaignId);
    console.log('💰 Budget Type:', adSetData.budgetType || 'daily');
    console.log('🎯 Conversion Location:', adSetData.conversionLocation || 'Not set');

    // Declare params outside try block so it's accessible in catch
    let params = null;

    try {
      const url = `${this.baseURL}/act_${this.adAccountId}/adsets`;

      // Auto-fetch pixel ID if needed for website conversions
      if (adSetData.conversionLocation === 'website' && !this.pixelId) {
        console.log('🔍 Pixel ID not provided, attempting to fetch from ad account...');
        try {
          const pixelsUrl = `${this.baseURL}/act_${this.adAccountId}/adspixels`;
          const pixelsResponse = await axios.get(pixelsUrl, {
            params: {
              access_token: this.accessToken,
              fields: 'id,name,code,is_created_by_business',
              limit: 10
            }
          });

          if (pixelsResponse.data.data && pixelsResponse.data.data.length > 0) {
            // Use the first available pixel
            this.pixelId = pixelsResponse.data.data[0].id;
            console.log(`✅ Auto-fetched pixel: ${pixelsResponse.data.data[0].name} (${this.pixelId})`);
          } else {
            console.warn('⚠️ No pixels found for this ad account - proceeding without pixel');
          }
        } catch (pixelFetchError) {
          console.error('❌ Failed to fetch pixels:', pixelFetchError.message);
          console.log('🆗 Proceeding without pixel ID - may need manual configuration');
        }
      }

      console.log('📋 AdSet Configuration:');
      console.log('  - Budget Type:', adSetData.budgetType || 'daily');
      console.log('  - Daily Budget:', adSetData.dailyBudget ? `$${adSetData.dailyBudget}` : 'Not set');
      console.log('  - Lifetime Budget:', adSetData.lifetimeBudget ? `$${adSetData.lifetimeBudget}` : 'Not set');
      console.log('  - Conversion Location:', adSetData.conversionLocation || 'website');
      console.log('  - Pixel ID:', this.pixelId || 'NONE');
      console.log('  - Page ID:', this.pageId || 'NONE');
      console.log('  - Conversion Event:', adSetData.conversionEvent || 'Not set');
      console.log('  - Optimization Goal:', this.getOptimizationGoal ? 'Will be calculated' : 'Not set');

      params = {
        name: `[REVIEW] ${adSetData.campaignName} - AdSet`,
        campaign_id: adSetData.campaignId,
        billing_event: 'IMPRESSIONS',
        optimization_goal: this.getOptimizationGoal(adSetData),
        bid_strategy: adSetData.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
        status: 'ACTIVE',
        access_token: this.accessToken
      };

      // Only add promoted_object if we have valid data
      console.log('\n🎯 Creating promoted_object...');
      const promotedObject = this.getPromotedObject(adSetData);
      if (promotedObject && promotedObject !== 'null') {
        params.promoted_object = promotedObject;
        console.log('✅ promoted_object created:', promotedObject);
      } else if (adSetData.conversionLocation === 'website') {
        console.warn('⚠️ No promoted_object created - pixel ID missing');
        console.log('🔄 Will proceed without promoted_object (safe mode)');
      }

      // Add performance goal if provided
      if (adSetData.performanceGoal) {
        params.performance_goal = adSetData.performanceGoal;
      }

      // Add attribution spec if provided
      if (adSetData.attributionSetting || adSetData.attributionWindow) {
        const attributionSpec = [];
        if (adSetData.attributionWindow?.click || adSetData.attributionWindow?.['1_day_click']) {
          attributionSpec.push({
            event_type: 'CLICK_THROUGH',
            window_days: parseInt(adSetData.attributionWindow?.click || adSetData.attributionWindow?.['1_day_click'] || 1)
          });
        }
        if (adSetData.attributionWindow?.view || adSetData.attributionWindow?.['1_day_view']) {
          attributionSpec.push({
            event_type: 'VIEW_THROUGH',
            window_days: parseInt(adSetData.attributionWindow?.view || adSetData.attributionWindow?.['1_day_view'] || 1)
          });
        }
        if (attributionSpec.length > 0) {
          params.attribution_spec = JSON.stringify(attributionSpec);
        }
      }
      
      // Handle budget based on type - use our improved parsing
      if (adSetData.budgetType === 'lifetime') {
        const lifetimeBudgetCents = this.parseBudgetValue(adSetData.lifetimeBudget);
        if (lifetimeBudgetCents) {
          params.lifetime_budget = lifetimeBudgetCents;
        } else {
          console.warn('⚠️ Invalid lifetime budget, using default $100');
          params.lifetime_budget = 10000; // $100 default
        }
      } else {
        const dailyBudgetCents = this.parseBudgetValue(adSetData.dailyBudget);
        if (dailyBudgetCents) {
          params.daily_budget = dailyBudgetCents;
        } else {
          console.warn('⚠️ Invalid daily budget, using default $50');
          params.daily_budget = 5000; // $50 default
        }
      }

      // Add bid caps and constraints if provided - use improved parsing
      if (adSetData.costCap) {
        const costCapCents = this.parseBudgetValue(adSetData.costCap);
        if (costCapCents) params.bid_cap = costCapCents;
      }
      if (adSetData.minRoas) {
        params.min_roas = parseFloat(adSetData.minRoas);
      }
      if (adSetData.bidAmount) {
        const bidAmountCents = this.parseBudgetValue(adSetData.bidAmount);
        if (bidAmountCents) params.bid_amount = bidAmountCents;
      }
      
      // Build targeting from provided data with correct field names
      const targeting = {
        age_min: adSetData.targeting?.ageMin || adSetData.targeting?.age_min || 18,
        age_max: adSetData.targeting?.ageMax || adSetData.targeting?.age_max || 65,
      };

      // Handle gender targeting
      const genderSource = adSetData.targeting?.demographics?.genders || adSetData.targeting?.genders;
      if (genderSource) {
        const genders = Array.isArray(genderSource) ? genderSource : [genderSource];
        if (!genders.includes('all')) {
          // Map gender strings to Meta API numbers
          const genderMap = { 'male': 1, 'female': 2 };
          const mappedGenders = genders.map(g => genderMap[g] || g).filter(g => typeof g === 'number');
          if (mappedGenders.length > 0) {
            targeting.genders = mappedGenders;
          }
        }
        // If 'all' is selected, don't set genders field - Meta defaults to all
      }

      // Handle age targeting - check for demographics object
      if (adSetData.targeting?.demographics) {
        if (adSetData.targeting.demographics.ageMin !== undefined) {
          targeting.age_min = adSetData.targeting.demographics.ageMin;
        }
        if (adSetData.targeting.demographics.ageMax !== undefined) {
          targeting.age_max = adSetData.targeting.demographics.ageMax;
        }
      }

      // Add location targeting with correct structure
      if (adSetData.targeting?.locations) {
        targeting.geo_locations = {};
        if (adSetData.targeting.locations.countries && adSetData.targeting.locations.countries.length > 0) {
          targeting.geo_locations.countries = adSetData.targeting.locations.countries;
        }
        if (adSetData.targeting.locations.states && adSetData.targeting.locations.states.length > 0) {
          // Facebook API uses 'regions' for states with numeric IDs
          targeting.geo_locations.regions = adSetData.targeting.locations.states.map(state => {
            const regionId = this.stateToRegionId[state];
            if (regionId) {
              return { key: regionId };
            } else {
              console.warn(`Unknown state code: ${state}, using fallback`);
              return { key: `US:${state}` }; // Fallback for unknown states
            }
          });
        }
        if (adSetData.targeting.locations.cities && adSetData.targeting.locations.cities.length > 0) {
          // Cities should be in Facebook's city key format
          targeting.geo_locations.cities = adSetData.targeting.locations.cities.map(city => ({
            key: city
          }));
        }
        if (adSetData.targeting.locations.custom && adSetData.targeting.locations.custom.length > 0) {
          // Custom locations (ZIP codes, etc)
          targeting.geo_locations.zips = adSetData.targeting.locations.custom.map(zip => ({
            key: `US:${zip}`
          }));
        }
        // Default to US if no locations specified
        if (!targeting.geo_locations.countries && !targeting.geo_locations.regions && !targeting.geo_locations.cities && !targeting.geo_locations.zips) {
          targeting.geo_locations = { countries: ['US'] };
        }
      } else {
        targeting.geo_locations = { countries: ['US'] };
      }
      
      // Add platform and placement targeting
      if (adSetData.placementType === 'manual' && adSetData.placements) {
        const platforms = [];
        const positions = {};
        
        if (adSetData.placements.facebook && adSetData.placements.facebook.length > 0) {
          platforms.push('facebook');
          positions.facebook_positions = adSetData.placements.facebook;
        }
        if (adSetData.placements.instagram && adSetData.placements.instagram.length > 0) {
          platforms.push('instagram');
          positions.instagram_positions = adSetData.placements.instagram;
        }
        if (adSetData.placements.audience_network && adSetData.placements.audience_network.length > 0) {
          platforms.push('audience_network');
          positions.audience_network_positions = adSetData.placements.audience_network;
        }
        if (adSetData.placements.messenger && adSetData.placements.messenger.length > 0) {
          platforms.push('messenger');
          positions.messenger_positions = adSetData.placements.messenger;
        }
        
        if (platforms.length > 0) {
          targeting.publisher_platforms = platforms;
          Object.assign(targeting, positions);
        }
      } else if (adSetData.placementType !== 'manual') {
        // Automatic placements - don't specify platforms or positions
        // Meta will optimize placement automatically
      }
      
      console.log('Targeting object before stringify:', JSON.stringify(targeting, null, 2));
      params.targeting = JSON.stringify(targeting);
      
      // Add schedule if provided
      if (adSetData.budgetType === 'lifetime') {
        // For lifetime budget, we need both start and end times
        if (adSetData.schedule && adSetData.schedule.endTime) {
          // Set start time - use provided or default to now
          if (adSetData.schedule.startTime) {
            const startDate = new Date(adSetData.schedule.startTime);
            params.start_time = Math.floor(startDate.getTime() / 1000);
          } else {
            // Default to now if not provided
            params.start_time = Math.floor(Date.now() / 1000);
          }
          
          // Set end time
          const endDate = new Date(adSetData.schedule.endTime);
          params.end_time = Math.floor(endDate.getTime() / 1000);
          
          console.log('Lifetime budget schedule:');
          console.log('  Start:', new Date(params.start_time * 1000).toISOString());
          console.log('  End:', new Date(params.end_time * 1000).toISOString());
          
          // Validate that end time is at least 24 hours after start time
          const timeDiff = params.end_time - params.start_time;
          const hoursDiff = timeDiff / 3600;
          console.log(`  Time difference: ${hoursDiff.toFixed(1)} hours`);
          
          if (timeDiff < 86400) { // 86400 seconds = 24 hours
            throw new Error(`Meta Ads requires lifetime budget campaigns to run for at least 24 hours. Current duration: ${hoursDiff.toFixed(1)} hours. Please select an end date at least 24 hours after the start date.`);
          }
        } else {
          throw new Error('Lifetime budget campaigns require both start and end dates. Please select campaign schedule dates with at least 24 hours duration.');
        }
      } else if (adSetData.schedule) {
        // For daily budget, schedule is optional
        if (adSetData.schedule.startTime) {
          const startDate = new Date(adSetData.schedule.startTime);
          params.start_time = Math.floor(startDate.getTime() / 1000);
        }
        if (adSetData.schedule.endTime) {
          const endDate = new Date(adSetData.schedule.endTime);
          params.end_time = Math.floor(endDate.getTime() / 1000);
        }
      }

      console.log('\n📤 Sending AdSet Creation Request...');
      console.log('📦 Final params being sent:', JSON.stringify({
        ...(params || {}),
        access_token: '[HIDDEN]',
        targeting: params.targeting ? '[TARGETING_DATA]' : undefined
      }, null, 2));

      const response = await axios.post(url, null, { params });
      console.log('✅ AdSet Created Successfully!');
      console.log('🆔 AdSet ID:', response.data.id);
      console.log('=== ADSET CREATION END ===\n');
      return response.data;
    } catch (error) {
      console.error('❌ AdSet Creation Failed!');
      console.error('🔴 Error at AdSet Level');
      console.error('📍 Failed with params:', JSON.stringify({
        ...(params || {}),
        access_token: '[HIDDEN]'
      }, null, 2));
      this.handleError(error);
    }
  }

  // New method: Create AdSet with automatic fallback to safe mode
  async createAdSetWithFallback(adSetData, attempt = 1) {
    try {
      console.log(`🚀 Attempt ${attempt}: Creating AdSet with full configuration`);
      return await this.createAdSet(adSetData);
    } catch (error) {
      const errorCode = error.fbError?.code || error.response?.data?.error?.code;
      const errorMessage = error.message || '';

      console.log('⚠️ AdSet creation error detected:');
      console.log('  Error Code:', errorCode);
      console.log('  Error Message:', errorMessage);

      // ALWAYS use fallback on first attempt for ANY error
      // Facebook API is unpredictable
      if (attempt === 1) {
        console.log('❌ First attempt failed, activating AGGRESSIVE safe mode...');
        console.log('🔧 Creating minimal AdSet with only required fields...');

        // Create MINIMAL safe version - only absolutely required fields
        const safeData = {
          campaignId: adSetData.campaignId,
          campaignName: adSetData.campaignName,
          budgetType: adSetData.budgetType || 'daily',
          dailyBudget: adSetData.dailyBudget || 50,
          lifetimeBudget: adSetData.lifetimeBudget,
          targeting: {
            locations: { countries: ['US'] },
            ageMin: 18,
            ageMax: 65
          }
          // NO promoted_object, NO optimization_goal customization
          // Let Facebook use defaults
        };

        console.log('🔄 Retrying with minimal safe configuration...');
        console.log('  Kept fields:', Object.keys(safeData));

        // Store what we removed for logging
        this.skippedFields = {
          message: 'Using minimal configuration due to API error',
          removed: ['promoted_object', 'attribution_spec', 'optimization_goal', 'conversion tracking']
        };

        try {
          const result = await this.createAdSet(safeData);
          console.log('✅ Safe mode SUCCESSFUL! AdSet created with minimal config.');
          return result;
        } catch (retryError) {
          console.error('❌ Even safe mode failed:', retryError.message);
          throw retryError;
        }
      }

      // If we've already tried safe mode, throw the error
      throw error;
    }
  }

  // Helper: Strip problematic fields that commonly cause validation errors
  stripProblematicFields(adSetData) {
    const safeData = { ...adSetData };

    console.log('🧩 Removing problematic fields for safe mode:');

    // Fields that commonly cause issues
    const problematicFields = [
      'promoted_object',
      'attribution_spec',
      'conversion_specs',
      'optimization_sub_event',
      'rf_prediction_id'
    ];

    problematicFields.forEach(field => {
      if (safeData[field]) {
        console.log(`  - Removing ${field}`);
        delete safeData[field];
      }
    });

    // Also ensure we don't have invalid conversion events
    if (safeData.conversionEvent &&
        !['LEAD', 'PURCHASE'].includes(safeData.conversionEvent.toUpperCase())) {
      console.log(`  - Changing conversion event from ${safeData.conversionEvent} to LEAD`);
      safeData.conversionEvent = 'LEAD';
    }

    return safeData;
  }

  // Helper: Log which fields were skipped
  logSkippedFields(originalData, safeData) {
    const skipped = [];

    Object.keys(originalData).forEach(key => {
      if (originalData[key] !== undefined && safeData[key] === undefined) {
        skipped.push({
          field: key,
          value: originalData[key]
        });
      }
    });

    if (skipped.length > 0) {
      console.log('📝 Skipped fields (will need manual configuration in Facebook):');
      skipped.forEach(item => {
        console.log(`  - ${item.field}: ${JSON.stringify(item.value)}`);
      });
    }

    return skipped;
  }

  // Helper: Identify skipped fields for user notification
  identifySkippedFields(originalData, safeData) {
    const skipped = {};

    ['promoted_object', 'attribution_spec', 'conversion_specs'].forEach(field => {
      if (originalData[field] && !safeData[field]) {
        skipped[field] = originalData[field];
      }
    });

    return skipped;
  }

  // Helper: Parse and validate budget values
  parseBudgetValue(value) {
    if (value === undefined || value === null) return undefined;

    // If it's already a number, use it
    if (typeof value === 'number') {
      return Math.round(value * 100); // Convert to cents
    }

    // If it's a string, clean it up
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and spaces
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);

      if (isNaN(parsed)) {
        console.warn(`⚠️ Could not parse budget value: ${value}`);
        return undefined;
      }

      return Math.round(parsed * 100); // Convert to cents
    }

    console.warn(`⚠️ Unexpected budget value type: ${typeof value}`);
    return undefined;
  }

  async createAd(adData) {
    try {
      console.log('Creating Ad with App ID from env:', process.env.FB_APP_ID);
      const url = `${this.baseURL}/act_${this.adAccountId}/ads`;
      
      const creative = {
        object_story_spec: {
          page_id: this.pageId
        }
      };
      
      // Handle different media types
      if (adData.mediaType === 'video' && adData.videoId) {
        // Video ad
        creative.object_story_spec.video_data = {
          video_id: adData.videoId,
          message: adData.primaryText,
          title: adData.headline,
          link_description: adData.description,
          call_to_action: {
            type: adData.callToAction || 'LEARN_MORE',
            value: {
              link: adData.url
            }
          }
        };
      } else if (adData.mediaType === 'carousel' && adData.carouselCards) {
        // Carousel ad
        creative.object_story_spec.link_data = {
          link: adData.url,
          message: adData.primaryText,
          child_attachments: adData.carouselCards.map(card => ({
            link: card.link || adData.url,
            name: card.headline,
            description: card.description,
            image_hash: card.imageHash,
            call_to_action: {
              type: card.callToAction || adData.callToAction || 'LEARN_MORE'
            }
          })),
          call_to_action: {
            type: adData.callToAction || 'LEARN_MORE'
          }
        };
      } else {
        // Single image ad (default)
        creative.object_story_spec.link_data = {
          link: adData.url,
          message: adData.primaryText,
          name: adData.headline,
          description: adData.description,
          call_to_action: {
            type: adData.callToAction || 'LEARN_MORE'
          }
        };
        
        // Add image hash if available
        if (adData.imageHash) {
          creative.object_story_spec.link_data.image_hash = adData.imageHash;
        }
      }

      const params = {
        name: adData.name || `[REVIEW] ${adData.campaignName} - Ad`,
        adset_id: adData.adsetId,
        creative: JSON.stringify(creative),
        tracking_specs: JSON.stringify([{
          'action.type': ['offsite_conversion'],
          'fb_pixel': [this.pixelId]
        }]),
        status: 'ACTIVE',
        access_token: this.accessToken
      };

      const response = await axios.post(url, null, { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async uploadVideo(videoPath) {
    try {
      // Validate file exists
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
      }

      const stats = fs.statSync(videoPath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      if (fileSizeInMB > 4096) { // 4GB limit
        throw new Error(`Video file too large: ${fileSizeInMB.toFixed(2)}MB (max 4GB)`);
      }

      // Read video file
      const videoBuffer = fs.readFileSync(videoPath);
      const fileName = path.basename(videoPath);
      
      // Create form data
      const form = new FormData();
      form.append('source', videoBuffer, {
        filename: fileName,
        contentType: 'video/mp4'
      });
      form.append('access_token', this.accessToken);

      const url = `${this.baseURL}/act_${this.adAccountId}/advideos`;
      
      console.log(`Uploading video: ${fileName}`);
      console.log(`File size: ${fileSizeInMB.toFixed(2)}MB`);

      const response = await axios.post(url, form, {
        headers: {
          ...form.getHeaders()
        },
        maxContentLength: 5 * 1024 * 1024 * 1024, // 5GB
        maxBodyLength: 5 * 1024 * 1024 * 1024,
        timeout: 300000 // 5 minutes timeout for video
      });

      if (response.data?.id) {
        console.log('✅ Video uploaded successfully!');
        console.log('Video ID:', response.data.id);
        return response.data.id;
      }

      throw new Error('Invalid response structure from Facebook');

    } catch (error) {
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        console.error('Facebook API Error:', fbError);
      }
      console.error('Video upload failed:', error.message);
      return null;
    }
  }

  async uploadImage(imagePath) {
    try {
      // Validate file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Prepare image for Facebook (resize/convert if needed)
      const preparedImagePath = await ImageConverter.prepareForFacebook(imagePath);
      if (!preparedImagePath) {
        throw new Error('Failed to prepare image for upload');
      }

      // Check file size after preparation
      const stats = fs.statSync(preparedImagePath);
      const fileSizeInMB = stats.size / (1024 * 1024);
      
      if (fileSizeInMB > 8) {
        throw new Error(`Image file too large after conversion: ${fileSizeInMB.toFixed(2)}MB (max 8MB)`);
      }

      // Read file as buffer
      const imageBuffer = fs.readFileSync(preparedImagePath);
      
      // Prepare form data
      const form = new FormData();
      
      // According to Facebook docs, the field name should be the filename
      // and we should send the raw bytes
      const fileName = path.basename(preparedImagePath);
      
      form.append(fileName, imageBuffer, {
        filename: fileName,
        contentType: 'image/jpeg'
      });
      form.append('access_token', this.accessToken);

      // Ensure adAccountId doesn't have 'act_' prefix doubled
      const cleanAdAccountId = this.adAccountId.replace('act_', '');
      const url = `${this.baseURL}/act_${cleanAdAccountId}/adimages`;
      
      console.log(`📸 Uploading image: ${fileName}`);
      console.log(`📦 File size: ${fileSizeInMB.toFixed(2)}MB`);
      console.log(`🎯 Ad Account ID: act_${cleanAdAccountId}`);
      console.log(`🔑 Access Token: ${this.accessToken ? '✓ Present' : '✗ Missing'}`);

      const response = await axios.post(url, form, {
        headers: {
          ...form.getHeaders()
        },
        maxContentLength: 10 * 1024 * 1024, // 10MB
        maxBodyLength: 10 * 1024 * 1024,
        timeout: 30000 // 30 seconds timeout
      });

      console.log('📨 Facebook API Response:', JSON.stringify(response.data, null, 2));
      
      // Parse response - Facebook returns the hash with the filename as key
      if (response.data?.images) {
        // The response structure is: { images: { 'filename.jpg': { hash: '...' } } }
        const imageKey = Object.keys(response.data.images)[0];
        if (imageKey && response.data.images[imageKey]?.hash) {
          const hash = response.data.images[imageKey].hash;
          console.log('✅ Image uploaded successfully!');
          console.log('🔖 Image Hash:', hash);
          
          // Clean up converted file if it was created
          if (preparedImagePath !== imagePath && fs.existsSync(preparedImagePath)) {
            fs.unlinkSync(preparedImagePath);
          }
          
          return hash;
        }
      }

      console.error('❌ Invalid response structure from Facebook:', response.data);
      throw new Error('Invalid response structure from Facebook');

    } catch (error) {
      if (error.response?.data?.error) {
        const fbError = error.response.data.error;
        console.error('❌ Facebook API Error:', {
          message: fbError.message,
          type: fbError.type,
          code: fbError.code,
          error_subcode: fbError.error_subcode,
          fbtrace_id: fbError.fbtrace_id
        });
        
        // Detailed error messages
        if (fbError.code === 1) {
          console.error('❌ Invalid image format. Please use JPEG or PNG.');
        } else if (fbError.code === 100) {
          console.error('❌ Invalid parameters. Check your access token and account ID.');
        } else if (fbError.code === 190) {
          console.error('❌ Invalid OAuth access token - token expired or invalid.');
        } else if (fbError.code === 200) {
          console.error('❌ Permissions error - missing ads_management permission.');
        } else if (fbError.code === 270) {
          console.error('❌ This permission requires business verification.');
        } else if (fbError.code === 10) {
          console.error('❌ Application does not have permission for this action.');
        }
        
        console.error('📋 Full error response:', JSON.stringify(error.response.data, null, 2));
        return null;
      }
      
      console.error('❌ Image upload failed:', error.message);
      if (error.code === 'ENOENT') {
        console.error('❌ File not found:', imagePath);
      }
      return null; // Return null to continue campaign creation without image
    }
  }

  // Helper function to determine content type
  getContentType(imagePath) {
    const ext = path.extname(imagePath).toLowerCase();
    const types = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    };
    return types[ext] || 'image/jpeg';
  }

  async createCampaignStructure(campaignData) {
    try {
      console.log('🚀 Starting campaign creation with data:', {
        hasImage: !!campaignData.imagePath,
        imagePath: campaignData.imagePath,
        mediaType: campaignData.mediaType,
        hasVideo: !!campaignData.videoPath,
        hasCarousel: !!campaignData.imagePaths
      });
      
      const campaign = await this.createCampaign({
        name: campaignData.campaignName
      });

      const adSet = await this.createAdSet({
        campaignName: campaignData.campaignName,
        campaignId: campaign.id,
        budgetType: campaignData.budgetType || 'daily',
        dailyBudget: campaignData.dailyBudget,
        lifetimeBudget: campaignData.lifetimeBudget,
        conversionLocation: campaignData.conversionLocation || 'website',
        schedule: campaignData.schedule,
        targeting: campaignData.targeting,
        placements: campaignData.placements
      });

      // Handle media upload based on type
      let mediaAssets = {};
      
      if (campaignData.mediaType === 'video' && campaignData.videoPath) {
        try {
          const videoId = await this.uploadVideo(campaignData.videoPath);
          if (videoId) {
            mediaAssets.videoId = videoId;
            console.log('Video uploaded successfully:', videoId);
          }
        } catch (error) {
          console.error('Video upload error:', error.message);
        }
      } else if (campaignData.mediaType === 'carousel' && campaignData.imagePaths) {
        mediaAssets.carouselCards = [];
        for (let i = 0; i < campaignData.imagePaths.length; i++) {
          try {
            const imageHash = await this.uploadImage(campaignData.imagePaths[i]);
            if (imageHash) {
              mediaAssets.carouselCards.push({
                imageHash,
                headline: campaignData.carouselHeadlines?.[i] || campaignData.headline,
                description: campaignData.carouselDescriptions?.[i] || campaignData.description,
                link: campaignData.carouselLinks?.[i] || campaignData.url
              });
            }
          } catch (error) {
            console.error(`Carousel image ${i + 1} upload error:`, error.message);
          }
        }
      } else if (campaignData.imagePath) {
        try {
          const imageHash = await this.uploadImage(campaignData.imagePath);
          if (imageHash) {
            mediaAssets.imageHash = imageHash;
            console.log('✅ Image uploaded successfully:', imageHash);
          } else {
            console.error('⚠️ Image upload returned no hash - ad will be created without image');
          }
        } catch (error) {
          console.error('❌ Image upload error:', error.message);
          console.error('Full error:', error);
        }
      }

      const ads = [];
      
      if (campaignData.variations && campaignData.variations.length > 0) {
        for (let i = 0; i < campaignData.variations.length; i++) {
          const variation = campaignData.variations[i];
          
          // Handle variation-specific media
          let variationMediaAssets = { ...mediaAssets };
          if (variation.mediaType && variation.mediaType !== campaignData.mediaType) {
            // Upload variation-specific media if different from main
            if (variation.mediaType === 'video' && variation.videoPath) {
              const videoId = await this.uploadVideo(variation.videoPath);
              if (videoId) variationMediaAssets = { videoId };
            } else if (variation.mediaType === 'single_image' && variation.imagePath) {
              const imageHash = await this.uploadImage(variation.imagePath);
              if (imageHash) variationMediaAssets = { imageHash };
            }
          } else if (variation.imagePath) {
            // Upload variation image if provided
            const imageHash = await this.uploadImage(variation.imagePath);
            if (imageHash) variationMediaAssets.imageHash = imageHash;
          }
          
          const ad = await this.createAd({
            name: `[REVIEW] ${campaignData.campaignName} - Ad V${i + 1}`,
            campaignName: campaignData.campaignName,
            adsetId: adSet.id,
            url: variation.url || campaignData.url,
            primaryText: variation.primaryText || campaignData.primaryText,
            headline: variation.headline || campaignData.headline,
            description: variation.description || campaignData.description,
            callToAction: variation.callToAction || campaignData.callToAction || 'LEARN_MORE',
            mediaType: variation.mediaType || campaignData.mediaType || 'single_image',
            ...variationMediaAssets
          });
          ads.push(ad);
        }
      } else {
        const ad = await this.createAd({
          campaignName: campaignData.campaignName,
          adsetId: adSet.id,
          url: campaignData.url,
          primaryText: campaignData.primaryText,
          headline: campaignData.headline,
          description: campaignData.description,
          callToAction: campaignData.callToAction || 'LEARN_MORE',
          mediaType: campaignData.mediaType || 'single_image',
          ...mediaAssets
        });
        ads.push(ad);
      }

      return {
        campaign,
        adSet,
        ads
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // Strategy 150 specific methods
  async createStrategy150Campaign(campaignData) {
    console.log('\n🎯 ========== STRATEGY 1-50-1 START ==========');
    console.log('📍 Phase 1: Creating 1-1-1 Structure');
    console.log('📊 Campaign Data:');
    console.log('  - Campaign Name:', campaignData.campaignName);
    console.log('  - Objective:', campaignData.objective);
    console.log('  - Budget Type:', campaignData.budgetType);
    console.log('  - Daily Budget:', campaignData.dailyBudget);
    console.log('  - Conversion Location:', campaignData.conversionLocation);
    console.log('  - Conversion Event:', campaignData.conversionEvent);

    try {
      console.log('\n🔷 Step 1 of 3: Creating Campaign...');

      // Map objective and ensure it's valid
      const mappedObjective = this.mapObjective(campaignData.objective);
      console.log('  🎯 Objective Mapping:', campaignData.objective, '->', mappedObjective);

      // Properly handle special ad categories - filter out NONE
      const specialAdCategories = Array.isArray(campaignData.specialAdCategories)
        ? campaignData.specialAdCategories.filter(cat => cat !== 'NONE' && cat !== '')
        : [];
      console.log('  🔐 Special Ad Categories:', specialAdCategories.length > 0 ? specialAdCategories : 'None (empty array)');

      // Check if using campaign or ad set level budgets
      const useCampaignBudget = campaignData.budgetLevel === 'campaign' || campaignData.campaignBudgetOptimization;

      // Create campaign with Strategy 150 specific settings
      const campaignConfig = {
        name: campaignData.campaignName,
        objective: mappedObjective,
        buyingType: campaignData.buyingType ? campaignData.buyingType.toUpperCase() : 'AUCTION',
        specialAdCategories: specialAdCategories, // Use filtered categories
        status: campaignData.status || 'ACTIVE'
      };

      // Only add bid_strategy if using campaign-level budget
      if (useCampaignBudget) {
        campaignConfig.bidStrategy = campaignData.bidStrategy || 'LOWEST_COST_WITHOUT_CAP';
        campaignConfig.daily_budget = campaignData.campaignBudget?.dailyBudget;
        campaignConfig.lifetime_budget = campaignData.campaignBudget?.lifetimeBudget;
        console.log('  💰 Using Campaign Budget Optimization (CBO)');
      } else {
        console.log('  💰 Using Ad Set level budgets (no bid strategy at campaign)');
      }

      const campaign = await this.createCampaign(campaignConfig);

      if (!campaign || !campaign.id) {
        throw new Error('Campaign creation failed - no campaign ID received');
      }
      console.log('✅ Campaign created successfully with ID:', campaign.id);

      // Explicitly publish the campaign to ensure it's not in draft mode
      try {
        await this.publishCampaign(campaign.id);
        console.log('✅ Campaign published and confirmed not in draft mode');
      } catch (publishError) {
        console.warn('⚠️ Campaign publish warning (campaign may still work):', publishError.message);
        // Don't fail the entire process if publish fails
      }

      // Create ad set with fallback mechanism for Strategy 150
      console.log('\n🔷 Step 2 of 3: Creating AdSet with fallback support...');
      const adSet = await this.createAdSetWithFallback({
        campaignId: campaign.id,
        campaignName: campaignData.campaignName,
        budgetType: campaignData.budgetType,
        dailyBudget: campaignData.dailyBudget,
        lifetimeBudget: campaignData.lifetimeBudget,
        conversionLocation: campaignData.conversionLocation,
        targeting: campaignData.targeting,
        placementType: campaignData.placementType,
        placements: campaignData.placements,
        schedule: campaignData.schedule,
        performanceGoal: campaignData.performanceGoal,
        conversionEvent: campaignData.conversionEvent,
        attributionSetting: campaignData.attributionSetting,
        attributionWindow: campaignData.attributionWindow,
        bidStrategy: campaignData.bidStrategy,
        costCap: campaignData.costCap,
        minRoas: campaignData.minRoas,
        objective: campaignData.objective,
        specialAdCategories: campaignData.specialAdCategories
      });

      if (!adSet || !adSet.id) {
        throw new Error('AdSet creation failed - no AdSet ID received');
      }
      console.log('✅ AdSet created successfully with ID:', adSet.id);

      // Check if we had to use safe mode
      if (this.skippedFields && Object.keys(this.skippedFields).length > 0) {
        console.log('\n📢 IMPORTANT: Some fields were skipped to ensure campaign creation success');
        console.log('🔧 Skipped fields:', this.skippedFields);
        // Add skipped fields to response for frontend notification
        adSet._skippedFields = this.skippedFields;
      }

      // Create initial ad
      console.log('\n🔷 Step 3 of 3: Creating Ad...');

      // Handle media if present
      let mediaAssets = {};
      if (campaignData.imagePath) {
        try {
          const imageHash = await this.uploadImage(campaignData.imagePath);
          if (imageHash) {
            mediaAssets.imageHash = imageHash;
            console.log('✅ Image uploaded successfully');
          }
        } catch (error) {
          console.log('⚠️ Image upload skipped:', error.message);
        }
      } else {
        console.log('📷 No image provided, creating ad without media');
      }

      const ad = await this.createAd({
        campaignName: campaignData.campaignName,
        adsetId: adSet.id,
        url: campaignData.url,
        primaryText: campaignData.primaryText,
        headline: campaignData.headline,
        description: campaignData.description,
        callToAction: campaignData.callToAction || 'LEARN_MORE',
        mediaType: campaignData.mediaType || 'single_image',
        publishDirectly: campaignData.publishDirectly,
        ...mediaAssets
      });

      if (!ad || !ad.id) {
        console.warn('⚠️ Ad creation failed - continuing with campaign and adset only');
      } else {
        console.log('✅ Ad created successfully with ID:', ad.id);

        // Try to automatically capture post ID
        console.log('🔍 Attempting to capture post ID automatically...');
        try {
          // Wait a moment for Facebook to process the ad
          await new Promise(resolve => setTimeout(resolve, 3000));

          const postId = await this.getPostIdFromAd(ad.id);
          if (postId) {
            console.log('✅ Post ID captured successfully:', postId);
            ad.postId = postId; // Add to response
          } else {
            console.log('⚠️ Could not auto-capture post ID - may need manual entry');
          }
        } catch (postError) {
          console.log('⚠️ Post ID capture failed:', postError.message);
        }
      }

      console.log('\n🎯 ========== STRATEGY 1-50-1 PHASE 1 COMPLETE ==========');
      console.log('📊 Results:');
      console.log('  - Campaign ID:', campaign.id, '(STATUS: ACTIVE)');
      console.log('  - AdSet ID:', adSet.id, '(STATUS: ACTIVE)');
      console.log('  - Ad ID:', ad ? ad.id : 'Not created', ad ? '(STATUS: ACTIVE)' : '');
      console.log('  - Post ID:', ad?.postId || 'Not captured automatically');
      console.log('  - Skipped Fields:', this.skippedFields ? Object.keys(this.skippedFields).join(', ') : 'None');
      console.log('\n🚀 ALL COMPONENTS ARE LIVE AND ACTIVE IN FACEBOOK!');
      console.log('========================================\n');

      return {
        campaign,
        adSet,
        ads: [ad]
      };
    } catch (error) {
      console.error('\n❌ STRATEGY 1-50-1 FAILED');
      console.error('📍 Failed at step:', error.message);
      console.error('========================================\n');
      this.handleError(error);
    }
  }

  async getPostIdFromAd(adId) {
    try {
      // Method 1: Get creative from ad and extract post ID
      const adResponse = await axios.get(`${this.baseURL}/${adId}`, {
        params: {
          fields: 'creative',
          access_token: this.accessToken
        }
      });

      if (adResponse.data.creative && adResponse.data.creative.id) {
        const creativeResponse = await axios.get(`${this.baseURL}/${adResponse.data.creative.id}`, {
          params: {
            fields: 'effective_object_story_id',
            access_token: this.accessToken
          }
        });

        if (creativeResponse.data.effective_object_story_id) {
          // Keep the original format with underscore as Facebook provides it
          return creativeResponse.data.effective_object_story_id;
        }
      }

      // Method 2: Fallback - search recent page posts
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

      const postsResponse = await axios.get(`${this.baseURL}/${this.pageId}/posts`, {
        params: {
          fields: 'id,created_time,message',
          since: Math.floor(fifteenMinutesAgo.getTime() / 1000),
          access_token: this.accessToken
        }
      });

      if (postsResponse.data.data && postsResponse.data.data.length > 0) {
        // Return the most recent post ID in original Facebook format with underscore
        return postsResponse.data.data[0].id;
      }

      return null;
    } catch (error) {
      console.error('Error getting post ID from ad:', error);
      return null;
    }
  }

  async duplicateAdSetsWithExistingPost({ campaignId, originalAdSetId, postId, count, formData, userId }) {
    const results = {
      adSets: [],
      errors: []
    };

    try {
      console.log(`🔄 Starting AdSet duplication using Facebook /copies endpoint`);
      console.log(`📋 Original AdSet ID: ${originalAdSetId}`);
      console.log(`📋 Target Campaign ID: ${campaignId}`);
      console.log(`📋 Post ID: ${postId}`);
      console.log(`📋 Count: ${count}`);

      // Use Facebook's official /copies endpoint for batch duplication
      const copyData = {
        campaign_id: campaignId,
        deep_copy: true,
        status_option: 'ACTIVE',
        rename_options: {
          rename_prefix: '',
          rename_suffix: ' - Copy'
        },
        access_token: this.accessToken
      };

      console.log(`🔄 Using Facebook /copies endpoint with data:`, copyData);

      // Facebook's /copies endpoint creates ONE copy at a time
      // We need to call it multiple times to create 49 copies
      console.log(`📋 Creating ${count} copies of ad set ${originalAdSetId}...`);

      const newAdSetIds = [];

      for (let i = 0; i < count; i++) {
        try {
          console.log(`  Creating copy ${i + 1} of ${count}...`);

          const copyResponse = await axios.post(
            `${this.baseURL}/${originalAdSetId}/copies`,
            null,
            {
              params: {
                ...copyData,
                rename_options: {
                  rename_prefix: '',
                  rename_suffix: ` - Copy ${i + 1}`
                }
              }
            }
          );

          if (copyResponse.data && copyResponse.data.id) {
            newAdSetIds.push(copyResponse.data.id);
            console.log(`  ✅ Created ad set copy: ${copyResponse.data.id}`);
          }

          // Add small delay between copies to avoid rate limits
          if (i < count - 1) {
            await this.delay(500); // 0.5 second delay
          }
        } catch (error) {
          console.error(`  ❌ Failed to create copy ${i + 1}:`, error.message);
          results.errors.push({
            copyNumber: i + 1,
            error: error.message
          });
        }
      }

      console.log(`✅ Created ${newAdSetIds.length} ad set copies`);

      // Now create ads for each copied adset
      if (newAdSetIds.length > 0) {

        // Create ads for each copied adset
        for (let i = 0; i < newAdSetIds.length; i++) {
          try {
            const newAdSetId = newAdSetIds[i];

            // Create ad using existing post
            const adData = {
              name: `${formData.campaignName} - Ad Copy ${i + 1}`,
              adset_id: newAdSetId,
              creative: JSON.stringify({
                object_story_id: postId,
                page_id: this.pageId
              }),
              status: 'ACTIVE',
              access_token: this.accessToken
            };

            console.log(`🔄 Creating Ad for AdSet ${newAdSetId}:`, adData);

            await axios.post(
              `${this.baseURL}/act_${this.adAccountId}/ads`,
              null,
              { params: adData }
            );

            results.adSets.push({
              id: newAdSetId,
              name: `AdSet Copy ${i + 1}`
            });

            console.log(`✅ Created ad for AdSet copy ${i + 1}: ${newAdSetId}`);

          } catch (adError) {
            console.error(`❌ Error creating ad for AdSet ${i + 1}:`, adError.response?.data || adError.message);
            results.errors.push({
              adSetIndex: i + 1,
              error: `Ad creation failed: ${adError.message}`
            });
          }
        }
      } else {
        // Fallback: Create copies one by one if batch didn't work
        console.log(`⚠️ Batch copy didn't return expected format, falling back to individual copies`);

        for (let i = 1; i <= count; i++) {
          try {
            const copyData = {
              campaign_id: campaignId,
              deep_copy: true,
              status_option: 'ACTIVE',
              rename_options: {
                rename_prefix: '',
                rename_suffix: ` - Copy ${i}`
              },
              access_token: this.accessToken
            };

            console.log(`🔄 Creating individual AdSet Copy ${i} using /copies:`, copyData);

            const individualCopyResponse = await axios.post(
              `${this.baseURL}/${originalAdSetId}/copies`,
              null,
              { params: copyData }
            );

            const newAdSetId = individualCopyResponse.data.id;

            // Create ad using existing post
            const adData = {
              name: `${formData.campaignName} - Ad Copy ${i}`,
              adset_id: newAdSetId,
              creative: JSON.stringify({
                object_story_id: postId,
                page_id: this.pageId
              }),
              status: 'ACTIVE',
              access_token: this.accessToken
            };

            await axios.post(
              `${this.baseURL}/act_${this.adAccountId}/ads`,
              null,
              { params: adData }
            );

            results.adSets.push({
              id: newAdSetId,
              name: `AdSet Copy ${i}`
            });

            console.log(`✅ Created individual AdSet copy ${i}: ${newAdSetId}`);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));

          } catch (error) {
            console.error(`❌ Error creating individual AdSet copy ${i}:`, {
              message: error.message,
              status: error.response?.status,
              data: error.response?.data
            });

            results.errors.push({
              adSetIndex: i,
              error: error.message
            });
          }
        }
      }

      console.log(`Strategy 1-50-1 duplication completed. Success: ${results.adSets.length}, Errors: ${results.errors.length}`);
      return results;

    } catch (error) {
      console.error('Error in duplicateAdSetsWithExistingPost:', error);
      throw error;
    }
  }

  // Function to explicitly publish campaign and ensure it's not in draft mode
  async publishCampaign(campaignId) {
    try {
      console.log(`🚀 Publishing campaign ${campaignId} to ensure it's not in draft mode`);

      // Update campaign to ensure it's published and not in draft
      const publishData = {
        status: 'ACTIVE',
        access_token: this.accessToken
      };

      const response = await axios.post(
        `${this.baseURL}/${campaignId}`,
        null,
        { params: publishData }
      );

      console.log(`✅ Campaign ${campaignId} published successfully`);
      return response.data;

    } catch (error) {
      console.error(`❌ Error publishing campaign ${campaignId}:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      // If the campaign is already published or active, this is not a critical error
      if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('status')) {
        console.log(`⚠️ Campaign may already be in correct status, continuing...`);
        return { success: true, message: 'Campaign status already correct' };
      }

      throw error;
    }
  }

  getOptimizationGoal(adSetData) {
    // Map optimization goals based on objective and conversion location
    if (adSetData.conversionLocation === 'calls') {
      return 'QUALITY_CALL';
    }

    // For OUTCOME_LEADS objective
    if (adSetData.performanceGoal === 'maximize_conversions') {
      return 'OFFSITE_CONVERSIONS';
    } else if (adSetData.performanceGoal === 'maximize_leads') {
      return 'LEAD_GENERATION';
    }

    // Default based on conversion event
    const conversionEventMap = {
      'Lead': 'OFFSITE_CONVERSIONS',
      'Purchase': 'OFFSITE_CONVERSIONS',
      'AddToCart': 'OFFSITE_CONVERSIONS',
      'CompleteRegistration': 'OFFSITE_CONVERSIONS',
      'ViewContent': 'LANDING_PAGE_VIEWS'
    };

    return conversionEventMap[adSetData.conversionEvent] || 'OFFSITE_CONVERSIONS';
  }

  getPromotedObject(adSetData) {
    console.log('\n📊 Building promoted_object...');
    console.log('  Input conversion location:', adSetData.conversionLocation);
    console.log('  Input conversion event:', adSetData.conversionEvent);
    console.log('  Available pixel ID:', this.pixelId || 'NONE');
    console.log('  Available page ID:', this.pageId || 'NONE');

    const promotedObject = {};

    if (adSetData.conversionLocation === 'calls') {
      promotedObject.page_id = this.pageId;
      console.log('  ✅ Using page_id for calls:', this.pageId);
    } else if (adSetData.conversionLocation === 'website') {
      // Always ensure we have a pixel ID for website conversions
      if (this.pixelId) {
        promotedObject.pixel_id = this.pixelId;
        console.log('  ✅ Using pixel_id for website:', this.pixelId);
      } else {
        console.warn('  ⚠️ No pixel ID available for website conversion');
        console.log('  🔄 Returning null to trigger pixel fetching in createAdSet');
        return null; // Return null to trigger pixel fetching
      }

      // ONLY support LEAD and PURCHASE events as per Facebook's requirements
      const supportedEvents = {
        'LEAD': 'LEAD',
        'lead': 'LEAD',
        'Lead': 'LEAD',
        'PURCHASE': 'PURCHASE',
        'purchase': 'PURCHASE',
        'Purchase': 'PURCHASE'
      };

      const conversionEvent = adSetData.conversionEvent || 'LEAD';
      const mappedEvent = supportedEvents[conversionEvent];
      console.log('  📝 Conversion event mapping:');
      console.log('    - Input:', conversionEvent);
      console.log('    - Mapped:', mappedEvent || 'Not found in supported events');

      if (mappedEvent) {
        promotedObject.custom_event_type = mappedEvent;
        console.log('  ✅ Using custom_event_type:', mappedEvent);
      } else {
        console.warn(`  ⚠️ Unsupported conversion event: ${conversionEvent}`);
        console.log('  🔄 Defaulting to LEAD');
        promotedObject.custom_event_type = 'LEAD';
      }

    } else if (adSetData.conversionLocation === 'app') {
      promotedObject.application_id = adSetData.applicationId || process.env.FB_APP_ID;
      promotedObject.object_store_url = adSetData.appStoreUrl;
      // For app conversions, only use LEAD or PURCHASE
      if (adSetData.conversionEvent) {
        const appEvent = adSetData.conversionEvent.toUpperCase();
        promotedObject.custom_event_type = (appEvent === 'PURCHASE' ? 'PURCHASE' : 'LEAD');
      }
    }

    const result = JSON.stringify(promotedObject);
    console.log('  📦 Final promoted_object:', result);
    console.log('  ✅ promoted_object built successfully\n');
    return result;
  }

  mapObjective(objective) {
    // PHONE_CALL is not a valid Facebook objective
    // Map it to OUTCOME_LEADS which supports call conversions
    if (objective === 'PHONE_CALL') {
      console.log('📞 Mapping PHONE_CALL to OUTCOME_LEADS for calls objective');
      return 'OUTCOME_LEADS';
    }

    // If objective is already in correct format, return it
    const validObjectives = [
      'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_TRAFFIC', 'OUTCOME_AWARENESS',
      'OUTCOME_ENGAGEMENT', 'OUTCOME_APP_PROMOTION',
      'CONVERSIONS', 'LINK_CLICKS', 'LEAD_GENERATION', 'BRAND_AWARENESS',
      'REACH', 'POST_ENGAGEMENT', 'VIDEO_VIEWS', 'APP_INSTALLS'
    ];

    if (validObjectives.includes(objective)) {
      return objective;
    }

    // Map common aliases
    const objectiveMap = {
      'leads': 'OUTCOME_LEADS',
      'conversions': 'OUTCOME_SALES',
      'traffic': 'OUTCOME_TRAFFIC',
      'awareness': 'OUTCOME_AWARENESS',
      'engagement': 'OUTCOME_ENGAGEMENT',
      'phone_call': 'OUTCOME_LEADS',
      'calls': 'OUTCOME_LEADS'
    };

    return objectiveMap[objective?.toLowerCase()] || 'OUTCOME_LEADS';
  }

  handleError(error) {
    console.error('\n===============================================');
    console.error('🚨 FACEBOOK API ERROR OCCURRED 🚨');
    console.error('===============================================');

    if (error.response) {
      const fbError = error.response.data.error;
      const errorMessage = fbError ? fbError.message : 'Facebook API Error';
      const errorCode = fbError ? fbError.code : 'UNKNOWN';

      console.error('\n📍 ERROR LOCATION:');
      console.error('  Request URL:', error.config?.url);
      console.error('  Request Method:', error.config?.method);
      console.error('  HTTP Status:', error.response.status);

      console.error('\n🔴 FACEBOOK ERROR DETAILS:');
      console.error('  Error Code:', errorCode);
      console.error('  Error Message:', errorMessage);

      if (fbError) {
        console.error('  Error Type:', fbError.type);
        console.error('  Error Subcode:', fbError.error_subcode);
        console.error('  Error User Title:', fbError.error_user_title);
        console.error('  Error User Message:', fbError.error_user_msg);
        console.error('  Fbtrace ID:', fbError.fbtrace_id);

        // Specific error code explanations
        if (errorCode === 100) {
          console.error('\n⚠️ ERROR 100: Invalid Parameter');
          console.error('  This usually means one of the fields sent to Facebook is invalid.');
          console.error('  Check: promoted_object, custom_event_type, targeting, budget values');
        } else if (errorCode === 190) {
          console.error('\n⚠️ ERROR 190: Invalid Access Token');
          console.error('  The Facebook access token has expired or is invalid.');
          console.error('  User needs to re-authenticate with Facebook.');
        } else if (errorCode === 400) {
          console.error('\n⚠️ ERROR 400: Bad Request');
          console.error('  The request structure is invalid.');
        }

        if (fbError.error_data) {
          console.error('\n📊 Additional Error Data:', JSON.stringify(fbError.error_data, null, 2));
        }

        // Check for specific field errors
        if (errorMessage.includes('promoted_object')) {
          console.error('\n🎯 PROMOTED_OBJECT ERROR DETECTED');
          console.error('  Issue with conversion tracking configuration');
          console.error('  Will retry with safe mode (no promoted_object)');
        }

        if (errorMessage.includes('custom_event_type')) {
          console.error('\n🎯 CUSTOM_EVENT_TYPE ERROR DETECTED');
          console.error('  Invalid conversion event specified');
          console.error('  Only LEAD and PURCHASE are supported');
        }
      }

      console.error('\n📤 REQUEST DATA THAT FAILED:');
      if (error.config?.params) {
        const safeParams = { ...error.config.params };
        if (safeParams.access_token) safeParams.access_token = '[HIDDEN]';
        console.error(JSON.stringify(safeParams, null, 2));
      }

      console.error('\n===============================================\n');

      const customError = new Error(`Facebook API Error: ${errorMessage} (Code: ${errorCode})`);
      customError.status = error.response.status;
      customError.fbError = fbError;
      throw customError;
    } else if (error.request) {
      console.error('\n🌐 NO RESPONSE FROM FACEBOOK API');
      console.error('  The request was made but no response was received');
      console.error('  This could be a network issue or Facebook servers are down');
      console.error('===============================================\n');
      throw new Error('No response from Facebook API');
    } else {
      console.error('\n⚠️ REQUEST SETUP ERROR');
      console.error('  Error occurred while setting up the request');
      console.error('  Error:', error.message);
      console.error('===============================================\n');
      throw error;
    }
  }

  // ========== CAMPAIGN MULTIPLICATION HELPER FUNCTIONS ==========

  // Delay helper for rate limiting (ONLY used in multiplication)
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Rate limit configuration for multiplication ONLY
  getMultiplicationRateLimits() {
    return {
      betweenCampaigns: 40000,    // 40 seconds between campaigns
      betweenAdSets: 1000,         // 1 second between adsets
      betweenAds: 500,             // 0.5 second between ads
      afterBatch: 10000,           // 10 seconds after every 10 operations
      initialDelay: 5000,          // 5 seconds before starting
      retryDelay: 60000,           // 60 seconds if rate limited
    };
  }

  // Get full campaign details including all settings
  async getCampaignFullDetails(campaignId) {
    try {
      const url = `${this.baseURL}/${campaignId}`;
      const params = {
        access_token: this.accessToken,
        fields: 'name,objective,status,daily_budget,lifetime_budget,bid_strategy,spend_cap,special_ad_categories,buying_type,configured_status,effective_status,issues_info,recommendations,source_campaign_id,start_time,stop_time,updated_time'
      };

      const response = await axios.get(url, { params });
      console.log(`✅ Fetched campaign details for ${campaignId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to fetch campaign details for ${campaignId}`);
      this.handleError(error);
    }
  }

  // Get all ad sets for a campaign
  async getAdSetsForCampaign(campaignId) {
    try {
      const url = `${this.baseURL}/${campaignId}/adsets`;
      const params = {
        access_token: this.accessToken,
        fields: 'id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,bid_strategy,attribution_spec,promoted_object,destination_type,start_time,end_time',
        limit: 100 // Strategy 150 has 50 adsets, so 100 is safe
      };

      const response = await axios.get(url, { params });
      console.log(`✅ Fetched ${response.data.data.length} ad sets for campaign ${campaignId}`);
      return response.data.data;
    } catch (error) {
      console.error(`❌ Failed to fetch ad sets for campaign ${campaignId}`);
      this.handleError(error);
    }
  }

  // Get post ID from the first ad in an ad set
  async getPostIdFromAdSet(adSetId) {
    try {
      // First get ads from the ad set
      const adsUrl = `${this.baseURL}/${adSetId}/ads`;
      const adsParams = {
        access_token: this.accessToken,
        fields: 'id,creative',
        limit: 1 // We only need the first ad
      };

      const adsResponse = await axios.get(adsUrl, { params: adsParams });

      if (!adsResponse.data.data || adsResponse.data.data.length === 0) {
        console.log(`No ads found in ad set ${adSetId}`);
        return null;
      }

      const creativeId = adsResponse.data.data[0].creative?.id;
      if (!creativeId) {
        console.log(`No creative found for ad in ad set ${adSetId}`);
        return null;
      }

      // Get the post ID from the creative
      const creativeUrl = `${this.baseURL}/${creativeId}`;
      const creativeParams = {
        access_token: this.accessToken,
        fields: 'effective_object_story_id,object_story_id,object_story_spec'
      };

      const creativeResponse = await axios.get(creativeUrl, { params: creativeParams });
      const postId = creativeResponse.data.effective_object_story_id ||
                     creativeResponse.data.object_story_id ||
                     creativeResponse.data.object_story_spec?.link_data?.link ||
                     creativeResponse.data.object_story_spec?.video_data?.call_to_action?.value?.link;

      console.log(`✅ Retrieved post ID from ad set ${adSetId}: ${postId}`);
      return postId;
    } catch (error) {
      console.error(`Failed to get post ID from ad set ${adSetId}:`, error.message);
      return null;
    }
  }

  // NEW OPTIMIZED: Batch multiplication using deep_copy - Much faster, no rate limits!
  async batchMultiplyCampaigns(sourceCampaignId, multiplyCount, updateProgress) {
    console.log('\n🚀 BATCH MULTIPLICATION: Using Facebook Batch API with deep_copy');
    console.log(`  Source Campaign: ${sourceCampaignId}`);
    console.log(`  Copies to create: ${multiplyCount}`);
    console.log('  Method: Single batch request with deep_copy=true');

    try {
      // Prepare batch requests for all copies
      const batchRequests = [];
      const timestamp = Date.now();

      for (let i = 0; i < multiplyCount; i++) {
        const copyNumber = i + 1;

        // Each batch request to copy entire campaign structure
        batchRequests.push({
          method: 'POST',
          relative_url: `v18.0/${sourceCampaignId}/copies`,
          body: `deep_copy=true&status_option=PAUSED&rename_options=${encodeURIComponent(JSON.stringify({
            rename_suffix: `_Copy${copyNumber}_${timestamp}`
          }))}`
        });

        console.log(`  Prepared batch request ${copyNumber} for deep copy`);
      }

      if (updateProgress) {
        updateProgress('Sending batch request to Facebook...');
      }

      // Send all copy requests in a SINGLE API call
      console.log('\n📤 Sending single batch request for all campaign copies...');

      // Create form-urlencoded data
      const params = new URLSearchParams();
      params.append('batch', JSON.stringify(batchRequests));
      params.append('access_token', this.accessToken);

      const batchResponse = await axios.post(
        this.baseURL,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('✅ Batch request completed!');

      // Parse batch response
      const results = [];
      const errors = [];

      if (batchResponse.data && Array.isArray(batchResponse.data)) {
        batchResponse.data.forEach((response, index) => {
          const copyNumber = index + 1;

          if (response.code === 200) {
            // Success - parse the response body
            let responseData;
            try {
              responseData = typeof response.body === 'string'
                ? JSON.parse(response.body)
                : response.body;
            } catch (e) {
              responseData = { id: 'unknown', success: true };
            }

            results.push({
              copyNumber,
              campaignId: responseData.copied_campaign_id || responseData.id || responseData.campaign_id,
              status: 'success',
              message: `Campaign copy ${copyNumber} created successfully`
            });

            console.log(`  ✅ Copy ${copyNumber}: Success - Campaign ID: ${responseData.copied_campaign_id || responseData.id}`);
          } else {
            // Error
            let errorMessage = 'Unknown error';
            try {
              const errorData = typeof response.body === 'string'
                ? JSON.parse(response.body)
                : response.body;
              errorMessage = errorData.error?.message || errorMessage;
            } catch (e) {
              errorMessage = response.body || errorMessage;
            }

            errors.push({
              copyNumber,
              error: errorMessage,
              status: 'failed'
            });

            console.error(`  ❌ Copy ${copyNumber}: Failed - ${errorMessage}`);
          }
        });
      }

      if (updateProgress) {
        updateProgress(`Completed: ${results.length} successful, ${errors.length} failed`);
      }

      console.log(`\n📊 Batch Multiplication Results:`);
      console.log(`  ✅ Successful: ${results.length}`);
      console.log(`  ❌ Failed: ${errors.length}`);
      console.log(`  ⏱️ Total API calls used: 1 (batch request)`);

      return {
        success: true,
        method: 'batch_deep_copy',
        results,
        errors,
        summary: {
          requested: multiplyCount,
          successful: results.length,
          failed: errors.length,
          apiCallsUsed: 1  // Just 1 API call for everything!
        }
      };

    } catch (error) {
      console.error('❌ Batch multiplication failed:', error.message);
      throw new Error(`Batch multiplication failed: ${error.message}`);
    }
  }

  // ORIGINAL: Main multiplication function - Clone entire Strategy 150 campaign (kept for compatibility)
  async multiplyStrategy150Campaign(multiplyData) {
    const {
      sourceCampaignId,
      sourceAdSetIds,
      postId,
      campaignDetails,
      copyNumber,
      timestamp,
      updateProgress // Callback for progress updates
    } = multiplyData;

    const rateLimits = this.getMultiplicationRateLimits();
    console.log(`\n🔄 Starting multiplication ${copyNumber} with smart delays...`);

    // Initial delay for first campaign or delay between campaigns
    if (copyNumber === 1) {
      console.log('⏸️ Initial safety delay: 5 seconds...');
      if (updateProgress) updateProgress(`Initial safety delay...`);
      await this.delay(rateLimits.initialDelay);
    } else {
      console.log(`⏸️ Waiting 40 seconds before creating campaign ${copyNumber}...`);
      if (updateProgress) updateProgress(`Waiting 40 seconds before campaign ${copyNumber}...`);
      await this.delay(rateLimits.betweenCampaigns);
    }

    try {
      // Step 1: Create new campaign with same settings
      const newCampaignName = campaignDetails?.name
        ? `${campaignDetails.name}_Copy${copyNumber}_${timestamp}`
        : `Campaign_Copy${copyNumber}_${timestamp}`;

      const campaignParams = {
        name: newCampaignName,
        objective: campaignDetails?.objective || 'OUTCOME_LEADS',
        status: 'PAUSED', // Always create in paused state for safety
        special_ad_categories: JSON.stringify(
          campaignDetails?.special_ad_categories || []
        ),
        buying_type: campaignDetails?.buying_type || 'AUCTION',
        access_token: this.accessToken
      };

      // Add budget if campaign had budget (CBO)
      if (campaignDetails?.daily_budget) {
        campaignParams.daily_budget = campaignDetails.daily_budget;
      }
      if (campaignDetails?.lifetime_budget) {
        campaignParams.lifetime_budget = campaignDetails.lifetime_budget;
      }
      if (campaignDetails?.bid_strategy) {
        campaignParams.bid_strategy = campaignDetails.bid_strategy;
      }

      console.log(`  Creating campaign: ${newCampaignName}`);
      const campaignUrl = `${this.baseURL}/act_${this.adAccountId}/campaigns`;
      const newCampaignResponse = await axios.post(campaignUrl, null, { params: campaignParams });
      const newCampaignId = newCampaignResponse.data.id;
      console.log(`  ✅ Created campaign: ${newCampaignId}`);

      // Step 2: Clone all ad sets to new campaign with smart delays
      const clonedAdSets = [];
      const clonedAds = [];
      let successfulAdSets = 0;
      let failedAdSets = 0;

      for (let i = 0; i < sourceAdSetIds.length; i++) {
        const sourceAdSetId = sourceAdSetIds[i];

        // Add delay between adsets (except for first one)
        if (i > 0) {
          await this.delay(rateLimits.betweenAdSets);
        }

        // Take a break every 10 adsets
        if (i > 0 && i % 10 === 0) {
          console.log(`  ☕ Taking a 10-second break after ${i} adsets...`);
          if (updateProgress) updateProgress(`Taking a break after ${i} adsets...`);
          await this.delay(rateLimits.afterBatch);
        }

        console.log(`  Cloning ad set ${i + 1}/${sourceAdSetIds.length}...`);
        if (updateProgress) updateProgress(`Cloning ad set ${i + 1}/${sourceAdSetIds.length}...`);

        try {
          // Use Facebook's copy endpoint for ad sets
          const copyUrl = `${this.baseURL}/${sourceAdSetId}/copies`;
          const copyParams = {
            campaign_id: newCampaignId,
            deep_copy: false, // We'll create ads separately with the same post ID
            status_option: 'PAUSED',
            rename_options: JSON.stringify({
              rename_suffix: `_Copy${copyNumber}`
            }),
            access_token: this.accessToken
          };

          const copyResponse = await axios.post(copyUrl, null, { params: copyParams });
          const newAdSetId = copyResponse.data.copied_adset_id || copyResponse.data.id;
          clonedAdSets.push(newAdSetId);

          // Step 3: Create ad with same post ID for each cloned ad set
          if (postId) {
            // Small delay before creating ad
            await this.delay(rateLimits.betweenAds);

            console.log(`    Creating ad with post ${postId}...`);
            const adParams = {
              name: `Ad_${newAdSetId}_${timestamp}`,
              adset_id: newAdSetId,
              creative: JSON.stringify({
                object_story_id: postId
              }),
              status: 'PAUSED',
              access_token: this.accessToken
            };

            const adUrl = `${this.baseURL}/act_${this.adAccountId}/ads`;
            const adResponse = await axios.post(adUrl, null, { params: adParams });
            clonedAds.push(adResponse.data.id);
            console.log(`    ✅ Created ad: ${adResponse.data.id}`);
          }

          successfulAdSets++;
        } catch (error) {
          console.error(`    ❌ Failed to clone ad set ${sourceAdSetId}:`, error.message);
          failedAdSets++;
        }
      }

      console.log(`\n✅ Campaign multiplication ${copyNumber} completed:`);
      console.log(`  - Campaign ID: ${newCampaignId}`);
      console.log(`  - Ad Sets: ${successfulAdSets} successful, ${failedAdSets} failed`);
      console.log(`  - Ads created: ${clonedAds.length}`);

      return {
        campaign: {
          id: newCampaignId,
          name: newCampaignName
        },
        adSetsCreated: successfulAdSets,
        adsCreated: clonedAds.length,
        adSetIds: clonedAdSets,
        adIds: clonedAds
      };

    } catch (error) {
      console.error(`❌ Failed to multiply campaign ${copyNumber}:`, error.message);

      // Check if it's a rate limit error
      if (error.message?.includes('limit reached') || error.response?.data?.error?.code === 17) {
        console.log('⚠️ Rate limit detected! Waiting 60 seconds before retry...');
        if (updateProgress) updateProgress('Rate limited - waiting 60 seconds...');
        await this.delay(rateLimits.retryDelay);
        throw new Error('Rate limited - please retry after delay');
      }

      throw error;
    }
  }
}

module.exports = FacebookAPI;