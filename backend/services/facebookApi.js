const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const BatchDuplicationService = require('./batchDuplication');
const Strategy150DuplicationService = require('./strategy150Duplication');
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
      if (campaignData.spend_cap !== undefined) {
        params.spend_cap = Math.round(parseFloat(campaignData.spend_cap) * 100);
      }
      if (campaignData.daily_budget !== undefined) {
        params.daily_budget = Math.round(parseFloat(campaignData.daily_budget) * 100);
      }
      if (campaignData.lifetime_budget !== undefined) {
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

        // Handle the new default: 1_day_click_1_day_view
        if (adSetData.attributionSetting === '1_day_click_1_day_view') {
          attributionSpec.push(
            { event_type: 'CLICK_THROUGH', window_days: 1 },
            { event_type: 'VIEW_THROUGH', window_days: 1 }
          );
        }
        // Handle other attribution settings
        else if (adSetData.attributionSetting === '7_day_click_1_day_view') {
          attributionSpec.push(
            { event_type: 'CLICK_THROUGH', window_days: 7 },
            { event_type: 'VIEW_THROUGH', window_days: 1 }
          );
        }
        else if (adSetData.attributionSetting === '28_day_click_1_day_view') {
          attributionSpec.push(
            { event_type: 'CLICK_THROUGH', window_days: 28 },
            { event_type: 'VIEW_THROUGH', window_days: 1 }
          );
        }
        else if (adSetData.attributionSetting === '1_day_click') {
          attributionSpec.push({ event_type: 'CLICK_THROUGH', window_days: 1 });
        }
        else if (adSetData.attributionSetting === '7_day_click') {
          attributionSpec.push({ event_type: 'CLICK_THROUGH', window_days: 7 });
        }
        // Fallback to original logic for backward compatibility
        else {
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
        }

        if (attributionSpec.length > 0) {
          params.attribution_spec = JSON.stringify(attributionSpec);
        }
      }
      
      // Handle budget based on type - only if values are provided (skip for CBO)
      if (adSetData.dailyBudget !== undefined || adSetData.lifetimeBudget !== undefined) {
        if (adSetData.budgetType === 'lifetime') {
          const lifetimeBudgetCents = this.parseBudgetValue(adSetData.lifetimeBudget);
          if (lifetimeBudgetCents) {
            params.lifetime_budget = lifetimeBudgetCents;
            console.log('  💰 AdSet Lifetime Budget:', `$${lifetimeBudgetCents/100}`);
          } else {
            console.warn('⚠️ Invalid lifetime budget, using default $100');
            params.lifetime_budget = 10000; // $100 default
          }
        } else if (adSetData.dailyBudget !== undefined) {
          const dailyBudgetCents = this.parseBudgetValue(adSetData.dailyBudget);
          if (dailyBudgetCents) {
            params.daily_budget = dailyBudgetCents;
            console.log('  💰 AdSet Daily Budget:', `$${dailyBudgetCents/100}`);
          } else {
            console.warn('⚠️ Invalid daily budget, using default $50');
            params.daily_budget = 5000; // $50 default
          }
        }
      } else {
        console.log('  💰 No AdSet budget (using Campaign Budget Optimization)');
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

      // DEBUG: Log what createAdSet received
      console.log('🔍 DEBUG - Inside createAdSet:');
      console.log('  📦 adSetData.spendingLimits:', JSON.stringify(adSetData.spendingLimits, null, 2));
      console.log('  📦 adSetData.spendingLimits?.enabled:', adSetData.spendingLimits?.enabled);
      console.log('  📦 adSetData.dailyBudget:', adSetData.dailyBudget);
      console.log('  📦 adSetData.lifetimeBudget:', adSetData.lifetimeBudget);

      // Apply ad set spending limits if enabled
      if (adSetData.spendingLimits && adSetData.spendingLimits.enabled) {
        const limits = adSetData.spendingLimits;
        const budgetAmount = adSetData.dailyBudget || adSetData.lifetimeBudget || 50;

        console.log('  📊 Applying Spending Limits...');
        console.log('    - Value Type:', limits.valueType || 'percentage');
        console.log('    - Base Budget:', `$${budgetAmount}`);

        // Calculate min/max based on value type (% or $)
        if (limits.valueType === 'percentage') {
          // Convert percentage to cents
          if (limits.dailyMin !== undefined && limits.dailyMin !== null && limits.dailyMin !== '') {
            params.daily_min_spend_target = Math.round((budgetAmount * parseFloat(limits.dailyMin) / 100) * 100);
            console.log('    - Daily Min (%):', `${limits.dailyMin}% = $${params.daily_min_spend_target/100}`);
          }
          if (limits.dailyMax !== undefined && limits.dailyMax !== null && limits.dailyMax !== '') {
            params.daily_spend_cap = Math.round((budgetAmount * parseFloat(limits.dailyMax) / 100) * 100);
            console.log('    - Daily Max (%):', `${limits.dailyMax}% = $${params.daily_spend_cap/100}`);
          }
        } else {
          // Direct dollar amounts to cents
          if (limits.dailyMin !== undefined && limits.dailyMin !== null && limits.dailyMin !== '') {
            params.daily_min_spend_target = Math.round(parseFloat(limits.dailyMin) * 100);
            console.log('    - Daily Min ($):', `$${params.daily_min_spend_target/100}`);
          }
          if (limits.dailyMax !== undefined && limits.dailyMax !== null && limits.dailyMax !== '') {
            params.daily_spend_cap = Math.round(parseFloat(limits.dailyMax) * 100);
            console.log('    - Daily Max ($):', `$${params.daily_spend_cap/100}`);
          }
        }

        if (params.daily_min_spend_target || params.daily_spend_cap) {
          console.log('  ✅ Spending Limits Applied Successfully');
        }
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
      if ((adData.mediaType === 'video' || adData.mediaType === 'single_video') && adData.videoId) {
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

        // Add thumbnail if available (Facebook requires this for video ads)
        if (adData.videoThumbnail) {
          // Check if it's an image hash (from extracted frame) or URL
          if (adData.videoThumbnail.match(/^[a-f0-9]{32}$/i)) {
            // It's an image hash from extracted frame
            creative.object_story_spec.video_data.image_hash = adData.videoThumbnail;
          } else {
            // It's a URL from Facebook
            creative.object_story_spec.video_data.image_url = adData.videoThumbnail;
          }
        } else if (adData.imageHash) {
          // Fallback to image hash if provided
          creative.object_story_spec.video_data.image_hash = adData.imageHash;
        }
      } else if (adData.mediaType === 'carousel' && (adData.carouselCards || adData.carouselImages)) {
        // Carousel ad
        creative.object_story_spec.link_data = {
          link: adData.url,
          message: adData.primaryText,
          child_attachments: adData.carouselCards ?
            // Use provided carousel cards
            adData.carouselCards.map(card => ({
              link: card.link || adData.url,
              name: card.headline,
              description: card.description,
              image_hash: card.imageHash,
              call_to_action: {
                type: card.callToAction || adData.callToAction || 'LEARN_MORE'
              }
            })) :
            // Or create cards from uploaded images
            adData.carouselImages.map((imageHash, index) => ({
              link: adData.url,
              name: adData.headline,
              description: adData.description,
              image_hash: imageHash,
              call_to_action: {
                type: adData.callToAction || 'LEARN_MORE'
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

  async getVideoThumbnail(videoId, videoPath = null, retryCount = 0) {
    const VideoUtils = require('../utils/videoUtils');
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds

    try {
      console.log(`📷 Fetching thumbnail for video ${videoId} (attempt ${retryCount + 1}/${maxRetries + 1})...`);

      // Try multiple approaches to get thumbnail
      // 1. First try the thumbnails field
      const url = `${this.baseURL}/${videoId}`;
      const params = {
        fields: 'thumbnails,picture,source,status',
        access_token: this.accessToken
      };

      const response = await axios.get(url, { params });

      // Check video processing status
      if (response.data?.status?.processing_phase) {
        console.log(`⏳ Video processing status: ${response.data.status.processing_phase}`);
      }

      // Check for thumbnails array (preferred)
      if (response.data?.thumbnails?.data && response.data.thumbnails.data.length > 0) {
        const thumbnail = response.data.thumbnails.data[0];
        const thumbnailUrl = thumbnail.uri || thumbnail.url;

        // Check if it's a placeholder
        if (VideoUtils.isPlaceholderThumbnail(thumbnailUrl)) {
          console.log('⚠️ Facebook returned placeholder thumbnail:', thumbnailUrl);

          // If we have retries left and video is still processing, wait and retry
          if (retryCount < maxRetries && response.data?.status?.processing_phase !== 'complete') {
            console.log(`⏱️ Waiting ${retryDelay/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return this.getVideoThumbnail(videoId, videoPath, retryCount + 1);
          }

          // If no more retries or video is complete but still placeholder, extract frame
          if (videoPath) {
            console.log('🎬 Extracting first frame from video...');
            return await this.extractAndUploadVideoFrame(videoPath);
          }
        }

        console.log('✅ Video thumbnail retrieved from thumbnails:', thumbnailUrl);
        return thumbnailUrl;
      }

      // 2. Try the picture field (alternate method)
      if (response.data?.picture) {
        const pictureUrl = response.data.picture;

        // Check if it's a placeholder
        if (VideoUtils.isPlaceholderThumbnail(pictureUrl)) {
          console.log('⚠️ Facebook returned placeholder in picture field:', pictureUrl);

          // Retry or extract frame
          if (retryCount < maxRetries) {
            console.log(`⏱️ Waiting ${retryDelay/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return this.getVideoThumbnail(videoId, videoPath, retryCount + 1);
          }

          if (videoPath) {
            console.log('🎬 Extracting first frame from video...');
            return await this.extractAndUploadVideoFrame(videoPath);
          }
        }

        console.log('✅ Video thumbnail retrieved from picture field:', pictureUrl);
        return pictureUrl;
      }

      // If no thumbnail found and we have the video path, extract frame
      if (videoPath) {
        console.log('⚠️ No thumbnail from Facebook, extracting first frame...');
        return await this.extractAndUploadVideoFrame(videoPath);
      }

      console.log('⚠️ No thumbnails found for video and no video path provided');
      return null;
    } catch (error) {
      console.error('⚠️ Could not fetch video thumbnail:', error.message);

      // If fetch failed and we have video path, try extracting frame
      if (videoPath) {
        console.log('🎬 Fallback: Extracting first frame from video...');
        try {
          return await this.extractAndUploadVideoFrame(videoPath);
        } catch (extractError) {
          console.error('❌ Frame extraction also failed:', extractError.message);
        }
      }

      return null;
    }
  }

  async extractAndUploadVideoFrame(videoPath) {
    const VideoUtils = require('../utils/videoUtils');
    const fs = require('fs').promises;
    const path = require('path');

    try {
      console.log('🎬 Extracting first frame from video:', videoPath);

      // Extract and optimize frame
      const frameBuffer = await VideoUtils.extractAndOptimizeFrame(videoPath);

      // Save to temporary file
      const tempDir = path.join(__dirname, '../uploads/temp');
      await fs.mkdir(tempDir, { recursive: true });

      const tempPath = path.join(tempDir, `frame_${Date.now()}.jpg`);
      await fs.writeFile(tempPath, frameBuffer);

      console.log('📸 Uploading extracted frame to Facebook...');

      // Upload frame as image
      const imageHash = await this.uploadImage(tempPath);

      // Clean up temp file
      await fs.unlink(tempPath).catch(err => {
        console.warn('Could not delete temp frame:', err.message);
      });

      if (imageHash) {
        // Return the URL format that Facebook expects
        console.log('✅ Frame uploaded successfully, hash:', imageHash);
        return imageHash; // Return hash, will be used with image_hash in ad creation
      }

      throw new Error('Failed to upload extracted frame');
    } catch (error) {
      console.error('❌ Error extracting/uploading video frame:', error);
      throw error;
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

      // Check if using campaign or ad set level budgets (default to CBO)
      const useCampaignBudget = campaignData.budgetLevel === 'campaign' || campaignData.campaignBudgetOptimization || (!campaignData.budgetLevel && campaignData.campaignBudget?.dailyBudget);

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
        // Use campaign budget values or defaults for CBO
        campaignConfig.daily_budget = campaignData.campaignBudget?.dailyBudget || campaignData.dailyBudget || 50;
        campaignConfig.lifetime_budget = campaignData.campaignBudget?.lifetimeBudget || campaignData.lifetimeBudget;
        // Only add spend cap if explicitly provided by user
        if (campaignData.campaignSpendingLimit) {
          campaignConfig.spend_cap = campaignData.campaignSpendingLimit;
          console.log('    - Spend Cap: $' + campaignConfig.spend_cap);
        }
        console.log('  💰 Using Campaign Budget Optimization (CBO)');
        console.log('    - Daily Budget: $' + campaignConfig.daily_budget);
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

      // DEBUG: Log spending limits before passing to createAdSet
      console.log('🔍 DEBUG - Before createAdSet:');
      console.log('  📦 campaignData.spendingLimits:', JSON.stringify(campaignData.spendingLimits, null, 2));
      console.log('  📦 campaignData.adSetBudget?.spendingLimits:', JSON.stringify(campaignData.adSetBudget?.spendingLimits, null, 2));
      const spendingLimitsToPass = campaignData.spendingLimits || campaignData.adSetBudget?.spendingLimits;
      console.log('  📦 Final spendingLimits being passed:', JSON.stringify(spendingLimitsToPass, null, 2));
      console.log('  📦 Campaign dailyBudget:', campaignData.dailyBudget);
      console.log('  📦 Campaign lifetimeBudget:', campaignData.lifetimeBudget);
      console.log('  📦 Using CBO?', useCampaignBudget);

      const adSet = await this.createAdSetWithFallback({
        campaignId: campaign.id,
        campaignName: campaignData.campaignName,
        budgetType: campaignData.budgetType,
        // Only pass budget to ad set if not using CBO
        dailyBudget: useCampaignBudget ? undefined : campaignData.dailyBudget,
        lifetimeBudget: useCampaignBudget ? undefined : campaignData.lifetimeBudget,
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
        specialAdCategories: campaignData.specialAdCategories,
        // Pass spending limits from adSetBudget or root level
        spendingLimits: spendingLimitsToPass
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
      } else if (campaignData.videoPath) {
        try {
          const videoId = await this.uploadVideo(campaignData.videoPath);
          if (videoId) {
            mediaAssets.videoId = videoId;
            console.log('✅ Video uploaded successfully with ID:', videoId);

            // Get thumbnail from Facebook with video path for fallback
            const thumbnailUrl = await this.getVideoThumbnail(videoId, campaignData.videoPath);
            if (thumbnailUrl) {
              mediaAssets.videoThumbnail = thumbnailUrl;
              console.log('✅ Video thumbnail ready for ad creation');
            } else {
              console.log('⚠️ No thumbnail available, cannot create video ad');
              throw new Error('Video thumbnail is required for video ads');
            }
          }
        } catch (error) {
          console.log('⚠️ Video upload skipped:', error.message);
        }
      } else if (campaignData.imagePaths && campaignData.imagePaths.length > 0) {
        try {
          const carouselImages = [];
          for (const imagePath of campaignData.imagePaths) {
            const imageHash = await this.uploadImage(imagePath);
            if (imageHash) {
              carouselImages.push(imageHash);
            }
          }
          if (carouselImages.length > 0) {
            mediaAssets.carouselImages = carouselImages;
            console.log(`✅ Carousel: ${carouselImages.length} images uploaded successfully`);
          }
        } catch (error) {
          console.log('⚠️ Carousel upload skipped:', error.message);
        }
      } else {
        console.log('📷 No media provided, creating ad without media');
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

        // Try to automatically capture post ID with aggressive retry logic
        console.log('🔍 Attempting to capture post ID automatically...');
        try {
          // Wait longer for Facebook to fully process the ad and make the creative available
          console.log('  ⏳ Waiting 8 seconds for Facebook to process the ad...');
          await new Promise(resolve => setTimeout(resolve, 8000));

          // Try to get post ID with more retries and exponential backoff
          let postId = null;
          const maxRetries = 6;
          const retryDelays = [0, 3000, 4000, 5000, 6000, 8000]; // Progressive delays in ms

          for (let i = 0; i < maxRetries; i++) {
            console.log(`  🔄 Attempt ${i + 1}/${maxRetries}...`);
            postId = await this.getPostIdFromAd(ad.id);

            if (postId) {
              console.log(`✅ Post ID captured successfully on attempt ${i + 1}: ${postId}`);
              break;
            }

            if (i < maxRetries - 1) {
              const delay = retryDelays[i + 1];
              console.log(`  ⏳ Waiting ${delay/1000}s before next attempt...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }

          if (postId) {
            ad.postId = postId; // Add to response
          } else {
            console.log('⚠️ Could not auto-capture post ID after all retries - will fetch during duplication');
          }
        } catch (postError) {
          console.log('⚠️ Post ID capture failed:', postError.message);
          console.log('  📝 Note: Post ID will be fetched during duplication phase');
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
        ads: [ad],
        postId: ad?.postId || null // Explicitly include postId in return
      };
    } catch (error) {
      console.error('\n❌ STRATEGY 1-50-1 FAILED');
      console.error('📍 Failed at step:', error.message);
      console.error('========================================\n');
      this.handleError(error);
    }
  }

  async getPostIdFromAd(adId) {
    console.log(`🔍 Attempting to fetch post ID from ad ${adId}...`);

    try {
      // Method 1: Direct ad query with expanded creative fields
      console.log('  📋 Method 1: Querying ad with expanded creative fields...');
      try {
        const adResponse = await axios.get(`${this.baseURL}/${adId}`, {
          params: {
            fields: 'creative{effective_object_story_id,object_story_id,object_story_spec}',
            access_token: this.accessToken
          }
        });

        const creative = adResponse.data.creative;
        if (creative) {
          console.log('  ✅ Creative data retrieved:', JSON.stringify(creative, null, 2));

          // Try multiple possible fields
          const postId = creative.effective_object_story_id ||
                        creative.object_story_id ||
                        creative.object_story_spec?.page_id;

          if (postId) {
            console.log(`  ✅ Post ID found via Method 1: ${postId}`);
            return postId;
          }
        }
        console.log('  ⚠️ Method 1: No post ID in creative data');
      } catch (method1Error) {
        console.log('  ❌ Method 1 failed:', method1Error.response?.data?.error?.message || method1Error.message);
      }

      // Method 2: Get creative separately with more fields
      console.log('  📋 Method 2: Fetching creative separately...');
      try {
        const adResponse = await axios.get(`${this.baseURL}/${adId}`, {
          params: {
            fields: 'creative',
            access_token: this.accessToken
          }
        });

        if (adResponse.data.creative && adResponse.data.creative.id) {
          const creativeId = adResponse.data.creative.id;
          console.log(`  📋 Creative ID: ${creativeId}`);

          const creativeResponse = await axios.get(`${this.baseURL}/${creativeId}`, {
            params: {
              fields: 'effective_object_story_id,object_story_id,object_story_spec',
              access_token: this.accessToken
            }
          });

          console.log('  📋 Creative details:', JSON.stringify(creativeResponse.data, null, 2));

          const postId = creativeResponse.data.effective_object_story_id ||
                        creativeResponse.data.object_story_id;

          if (postId) {
            console.log(`  ✅ Post ID found via Method 2: ${postId}`);
            return postId;
          }
        }
        console.log('  ⚠️ Method 2: No post ID found in creative');
      } catch (method2Error) {
        console.log('  ❌ Method 2 failed:', method2Error.response?.data?.error?.message || method2Error.message);
      }

      // Method 3: Query ad with preview_shareable_link (alternative approach)
      console.log('  📋 Method 3: Trying ad preview link method...');
      try {
        const adPreviewResponse = await axios.get(`${this.baseURL}/${adId}`, {
          params: {
            fields: 'preview_shareable_link,creative{effective_object_story_id}',
            access_token: this.accessToken
          }
        });

        if (adPreviewResponse.data.creative?.effective_object_story_id) {
          const postId = adPreviewResponse.data.creative.effective_object_story_id;
          console.log(`  ✅ Post ID found via Method 3: ${postId}`);
          return postId;
        }
        console.log('  ⚠️ Method 3: No post ID found');
      } catch (method3Error) {
        console.log('  ❌ Method 3 failed:', method3Error.response?.data?.error?.message || method3Error.message);
      }

      console.log('  ❌ All methods failed to retrieve post ID');
      return null;
    } catch (error) {
      console.error('❌ Fatal error getting post ID from ad:', error.response?.data?.error || error.message);
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
      console.log(`📋 Post ID: ${postId || 'Will fetch from original ad'}`);
      console.log(`📋 Count: ${count}`);

      // If no postId provided, try to get it from the original ad set's ads
      let actualPostId = postId;
      if (!actualPostId) {
        console.log('📋 No post ID provided, fetching from original ad set ads...');
        try {
          const adsResponse = await axios.get(
            `${this.baseURL}/${originalAdSetId}/ads`,
            {
              params: {
                fields: 'creative{effective_object_story_id}',
                access_token: this.accessToken,
                limit: 1
              }
            }
          );

          if (adsResponse.data?.data?.[0]?.creative?.effective_object_story_id) {
            actualPostId = adsResponse.data.data[0].creative.effective_object_story_id;
            console.log(`✅ Found post ID from original ad: ${actualPostId}`);
          }
        } catch (error) {
          console.log('⚠️ Could not fetch post ID from original ad:', error.message);
        }
      }

      // If still no post ID, try one more time with a delay
      if (!actualPostId) {
        console.log('⏳ Waiting 3 seconds and retrying to fetch post ID...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
          const adsResponse = await axios.get(
            `${this.baseURL}/${originalAdSetId}/ads`,
            {
              params: {
                fields: 'creative{effective_object_story_id}',
                access_token: this.accessToken,
                limit: 1
              }
            }
          );

          if (adsResponse.data?.data?.[0]?.creative?.effective_object_story_id) {
            actualPostId = adsResponse.data.data[0].creative.effective_object_story_id;
            console.log(`✅ Found post ID on retry: ${actualPostId}`);
          }
        } catch (error) {
          console.log('⚠️ Still could not fetch post ID:', error.message);
        }
      }

      // Final check - if still no post ID, we cannot proceed
      if (!actualPostId) {
        throw new Error('Could not determine post ID for duplication after retries. Please ensure the ad has been fully processed by Facebook.');
      }

      // CRITICAL FIX: Fetch the campaign's actual account ID
      console.log(`🔍 Fetching campaign ${campaignId} details to get correct account ID...`);
      let campaignAccountId;
      try {
        const campaignResponse = await axios.get(
          `${this.baseURL}/${campaignId}`,
          {
            params: {
              fields: 'account_id',
              access_token: this.accessToken
            }
          }
        );

        campaignAccountId = campaignResponse.data.account_id;
        console.log(`✅ Campaign belongs to account: ${campaignAccountId}`);
        console.log(`📋 Current API account: act_${this.adAccountId}`);

        // Remove the 'act_' prefix if present
        if (campaignAccountId.startsWith('act_')) {
          campaignAccountId = campaignAccountId.substring(4);
        }
      } catch (error) {
        console.error('❌ Failed to fetch campaign account ID:', error.message);
        // Fall back to current account ID
        campaignAccountId = this.adAccountId;
        console.log(`⚠️ Using fallback account ID: ${campaignAccountId}`);
      }

      // Facebook's /copies endpoint for AD SETS - different from campaign copies
      console.log(`📋 Creating ${count} copies of ad set ${originalAdSetId} in campaign ${campaignId}...`);
      console.log(`📊 Using account ID ${campaignAccountId} for ad set creation`);

      const newAdSetIds = [];

      for (let i = 0; i < count; i++) {
        try {
          console.log(`  Creating copy ${i + 1} of ${count}...`);

          // For AD SET copies, we don't use campaign_id or deep_copy
          // We create a new ad set with the same settings
          const originalAdSetResponse = await axios.get(
            `${this.baseURL}/${originalAdSetId}`,
            {
              params: {
                fields: 'name,targeting,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_strategy,promoted_object,daily_min_spend_target,daily_spend_cap',
                access_token: this.accessToken
              }
            }
          );

          const originalAdSet = originalAdSetResponse.data;

          // Log if spending limits were found on original ad set
          if (originalAdSet.daily_min_spend_target || originalAdSet.daily_spend_cap) {
            console.log(`  💰 Copying spending limits from original ad set:`);
            if (originalAdSet.daily_min_spend_target) {
              console.log(`     - Daily Min: $${originalAdSet.daily_min_spend_target / 100}`);
            }
            if (originalAdSet.daily_spend_cap) {
              console.log(`     - Daily Max: $${originalAdSet.daily_spend_cap / 100}`);
            }
          }

          // Create new ad set with same settings + forced 1-day attribution
          console.log(`  ⚙️ Setting attribution to 1-day click, 1-day view for copy ${i + 1}`);
          const newAdSetData = {
            name: `${originalAdSet.name} - Copy ${i + 1}`,
            campaign_id: campaignId,
            targeting: originalAdSet.targeting,
            daily_budget: originalAdSet.daily_budget,
            lifetime_budget: originalAdSet.lifetime_budget,
            optimization_goal: originalAdSet.optimization_goal,
            billing_event: originalAdSet.billing_event,
            bid_strategy: originalAdSet.bid_strategy,
            promoted_object: originalAdSet.promoted_object,
            // FORCE 1-DAY CLICK, 1-DAY VIEW ATTRIBUTION FROM THE START
            attribution_spec: JSON.stringify([
              { event_type: 'CLICK_THROUGH', window_days: 1 },
              { event_type: 'VIEW_THROUGH', window_days: 1 }
            ]),
            status: 'ACTIVE',
            access_token: this.accessToken
          };

          // CRITICAL: Copy spending limits if they exist on original ad set
          // Only include if they were set by user (not undefined/null)
          if (originalAdSet.daily_min_spend_target !== undefined && originalAdSet.daily_min_spend_target !== null) {
            newAdSetData.daily_min_spend_target = originalAdSet.daily_min_spend_target;
          }
          if (originalAdSet.daily_spend_cap !== undefined && originalAdSet.daily_spend_cap !== null) {
            newAdSetData.daily_spend_cap = originalAdSet.daily_spend_cap;
          }

          const copyResponse = await axios.post(
            `${this.baseURL}/act_${campaignAccountId}/adsets`,
            null,
            { params: newAdSetData }
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
          // Get the actual Facebook API error details
          const fbError = error.response?.data?.error || error;
          const errorMessage = fbError.error_user_msg || fbError.message || error.message;
          const errorCode = fbError.code;
          const errorSubcode = fbError.error_subcode;

          console.error(`  ❌ Failed to create copy ${i + 1}:`);
          console.error(`     Error Message: ${errorMessage}`);
          if (errorCode) console.error(`     Error Code: ${errorCode}`);
          if (errorSubcode) console.error(`     Error Subcode: ${errorSubcode}`);
          if (fbError.error_data) console.error(`     Error Data:`, fbError.error_data);

          results.errors.push({
            copyNumber: i + 1,
            error: errorMessage,
            fullError: fbError
          });
        }
      }

      console.log(`✅ Created ${newAdSetIds.length} ad set copies`);

      // Now create ads for each copied adset
      if (newAdSetIds.length > 0) {

        // Create ads for each copied adset with retry logic
        for (let i = 0; i < newAdSetIds.length; i++) {
          const newAdSetId = newAdSetIds[i];
          let adCreated = false;
          let lastError = null;

          // Create ad using existing post
          const adData = {
            name: `${formData.campaignName} - Ad Copy ${i + 1}`,
            adset_id: newAdSetId,
            creative: JSON.stringify({
              object_story_id: actualPostId,
              page_id: this.pageId
            }),
            status: 'ACTIVE',
            access_token: this.accessToken
          };

          console.log(`🔄 Creating Ad for AdSet ${newAdSetId} (Copy ${i + 1})...`);

          // Retry up to 3 times with exponential backoff
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await axios.post(
                `${this.baseURL}/act_${campaignAccountId}/ads`,
                null,
                { params: adData }
              );

              results.adSets.push({
                id: newAdSetId,
                name: `AdSet Copy ${i + 1}`
              });

              console.log(`✅ Created ad for AdSet copy ${i + 1}: ${newAdSetId}`);
              adCreated = true;
              break; // Success - exit retry loop

            } catch (adError) {
              lastError = adError;
              const fbError = adError.response?.data?.error;
              const isTransient = fbError?.is_transient || fbError?.code === 2;

              console.error(`❌ Attempt ${attempt}/3 failed for AdSet ${i + 1}:`, fbError?.message || adError.message);

              // If transient error and we have retries left, wait and retry
              if (isTransient && attempt < 3) {
                const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                console.log(`   ⏳ Waiting ${waitTime/1000}s before retry...`);
                await this.delay(waitTime);
              } else if (!isTransient) {
                // Non-transient error - don't retry
                console.error(`   ⚠️ Non-transient error - skipping retries`);
                break;
              }
            }
          }

          // If all retries failed, track it
          if (!adCreated) {
            const fbError = lastError?.response?.data?.error || lastError;
            console.error(`❌ Failed to create ad for AdSet ${i + 1} after 3 attempts`);
            results.errors.push({
              adSetId: newAdSetId,
              adSetIndex: i + 1,
              error: `Ad creation failed after 3 retries: ${fbError?.message || lastError?.message}`,
              errorCode: fbError?.code,
              isTransient: fbError?.is_transient
            });
          }
        }

        // After all ad sets and ads are created, ensure attribution is correct
        console.log('\n🔧 Verifying attribution settings for all duplicated ad sets...');
        const attributionResults = [];

        for (let j = 0; j < newAdSetIds.length; j++) {
          const adSetId = newAdSetIds[j];
          console.log(`  Checking ad set ${j + 1}/${newAdSetIds.length}...`);

          const result = await this.verifyAdSetAttribution(adSetId);
          attributionResults.push(result);

          // Small delay to avoid rate limits
          if (j > 0 && j % 10 === 0) {
            await this.delay(1000);
          }
        }

        // Log summary
        const updated = attributionResults.filter(r => r.updated).length;
        const correct = attributionResults.filter(r => !r.updated && !r.error).length;
        const errors = attributionResults.filter(r => r.error).length;

        console.log('\n📊 Attribution Verification Summary:');
        console.log(`  ✅ Updated: ${updated} ad sets`);
        console.log(`  ✓ Already correct: ${correct} ad sets`);
        if (errors > 0) {
          console.log(`  ⚠️ Failed to verify: ${errors} ad sets`);
        }
      }

      // Final summary with detailed breakdown
      const totalExpected = count;
      const totalSuccess = results.adSets.length;
      const totalFailed = results.errors.length;
      const adSetCreationErrors = results.errors.filter(e => !e.adSetId).length;
      const adCreationErrors = results.errors.filter(e => e.adSetId).length;

      console.log('\n🎯 ========== DUPLICATION SUMMARY ==========');
      console.log(`📊 Total Expected: ${totalExpected}`);
      console.log(`✅ Successfully Created: ${totalSuccess}/${totalExpected} (${Math.round(totalSuccess/totalExpected*100)}%)`);

      if (totalFailed > 0) {
        console.log(`❌ Failed: ${totalFailed}/${totalExpected}`);
        if (adSetCreationErrors > 0) {
          console.log(`   - Ad Set creation failures: ${adSetCreationErrors}`);
        }
        if (adCreationErrors > 0) {
          console.log(`   - Ad creation failures: ${adCreationErrors}`);
        }
        console.log(`\n📋 Failed Items:`);
        results.errors.forEach((err, idx) => {
          console.log(`   ${idx + 1}. ${err.adSetId ? `AdSet ${err.adSetId}` : `Copy ${err.copyNumber || err.adSetIndex}`}: ${err.error}`);
        });
      } else {
        console.log(`🎉 All ${totalSuccess} ad sets created successfully!`);
      }
      console.log('==========================================\n');

      // Add summary to results for frontend
      results.summary = {
        totalExpected,
        totalSuccess,
        totalFailed,
        successRate: Math.round(totalSuccess/totalExpected*100),
        hasFailures: totalFailed > 0,
        failedAdSets: results.errors.filter(e => e.adSetId).map(e => ({
          adSetId: e.adSetId,
          adSetIndex: e.adSetIndex,
          error: e.error,
          canRetry: e.isTransient
        }))
      };

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

  // NATIVE FACEBOOK: Deep copy entire campaign structure in ONE API call
  async deepCopyCampaign(sourceCampaignId, copyNumber = 1, timestamp = Date.now()) {
    try {
      console.log(`\n📋 Using Facebook's native deep_copy for campaign ${sourceCampaignId}...`);

      // Get original campaign name for the copy
      const campaignResponse = await axios.get(
        `${this.baseURL}/${sourceCampaignId}`,
        {
          params: {
            fields: 'name',
            access_token: this.accessToken
          }
        }
      );
      const originalName = campaignResponse.data.name || 'Campaign';

      // Use Facebook's native /copies endpoint with deep_copy
      const copyData = {
        deep_copy: true, // This copies EVERYTHING - campaign, adsets, ads
        status_option: 'PAUSED', // Always create paused for safety
        rename_options: JSON.stringify({
          rename_suffix: `_Copy${copyNumber}_${timestamp}`,
          rename_strategy: 'DEEP_RENAME' // Renames campaign, adsets, and ads
        }),
        // Force 1-day click, 1-day view attribution on all copied ad sets
        attribution_spec: JSON.stringify([
          { event_type: 'CLICK_THROUGH', window_days: 1 },
          { event_type: 'VIEW_THROUGH', window_days: 1 }
        ]),
        access_token: this.accessToken
      };

      console.log(`  🔄 Deep copying campaign (includes all 50 adsets and ads)...`);

      // Facebook's native campaign copy API - copies everything in one call
      const response = await axios.post(
        `${this.baseURL}/${sourceCampaignId}/copies`,
        null,
        { params: copyData }
      );

      // The response contains the copy operation details
      const copyId = response.data.copied_campaign_id || response.data.id;
      const copiedAdSetIds = response.data.copied_adset_ids || [];
      const copiedAdIds = response.data.copied_ad_ids || [];

      if (copyId) {
        console.log(`  ✅ Deep copy successful! New campaign ID: ${copyId}`);

        // Return complete campaign copy details
        const newCampaign = {
          id: copyId,
          name: `${originalName}_Copy${copyNumber}_${timestamp}`,
          status: 'PAUSED'
        };

        console.log(`  📊 Deep copy complete:`);
        console.log(`    - Campaign: ${copyId}`);
        console.log(`    - Ad Sets copied: ${copiedAdSetIds.length}`);
        console.log(`    - Ads copied: ${copiedAdIds.length}`);

        return {
          success: true,
          campaign: newCampaign,
          copyId: copyId,
          adSetIds: copiedAdSetIds,
          adIds: copiedAdIds,
          message: `Successfully deep copied campaign with ${copiedAdSetIds.length} adsets and ${copiedAdIds.length} ads`
        };
      } else {
        throw new Error('Deep copy did not return a campaign ID');
      }
    } catch (error) {
      console.error(`❌ Deep copy failed for copy ${copyNumber}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // NEW OPTIMIZED: Batch multiplication using Facebook's native deep copy
  async batchMultiplyCampaigns(sourceCampaignId, multiplyCount, updateProgress) {
    console.log('\n🚀 NATIVE FACEBOOK DEEP COPY: Creating multiple complete campaigns');
    console.log(`  Source Campaign: ${sourceCampaignId}`);
    console.log(`  Copies to create: ${multiplyCount}`);
    console.log('  Method: Facebook native deep_copy (copies everything in 1 API call per campaign)');

    try {
      const results = [];
      const errors = [];
      const timestamp = Date.now();
      const rateLimits = this.getMultiplicationRateLimits();

      // For each multiplication, use Facebook's native deep copy
      for (let i = 0; i < multiplyCount; i++) {
        const copyNumber = i + 1;

        console.log(`\n📋 Deep copying campaign ${copyNumber} of ${multiplyCount}...`);
        if (updateProgress) {
          updateProgress(`Deep copying campaign ${copyNumber} of ${multiplyCount} (includes all 50 adsets and ads)...`);
        }

        try {
          // Apply smart delay between campaigns (except for first one)
          if (i > 0) {
            console.log(`⏱️ Waiting ${rateLimits.betweenCampaigns / 1000}s before next campaign...`);
            await this.delay(rateLimits.betweenCampaigns);
          }

          // Use native deep copy - ONE API call copies everything!
          const copyResult = await this.deepCopyCampaign(sourceCampaignId, copyNumber, timestamp);

          if (copyResult.success) {
            results.push({
              copyNumber,
              campaignId: copyResult.campaign.id,
              campaignName: copyResult.campaign.name,
              adSetsCreated: copyResult.adSetIds ? copyResult.adSetIds.length : 50,
              adsCreated: copyResult.adIds ? copyResult.adIds.length : 50,
              adSetIds: copyResult.adSetIds,
              adIds: copyResult.adIds,
              status: 'success',
              message: copyResult.message
            });

            console.log(`  ✅ Copy ${copyNumber} completed successfully`);
            console.log(`    New Campaign ID: ${copyResult.campaign?.id}`);
            console.log(`    Ad Sets: ${copyResult.adSetIds?.length || 'unknown'}`);
            console.log(`    Ads: ${copyResult.adIds?.length || 'unknown'}`);
          } else {
            throw new Error('Deep copy did not return success status');
          }

        } catch (error) {
          console.error(`  ❌ Failed to create campaign copy ${copyNumber}:`, error.message);
          errors.push({
            copyNumber,
            error: error.message,
            status: 'failed'
          });
        }

        // Delay between campaign copies
        if (i < multiplyCount - 1) {
          await this.delay(2000);
        }
      }

      if (updateProgress) {
        updateProgress(`Completed: ${results.length} successful, ${errors.length} failed`);
      }

      console.log(`\n📊 Campaign Multiplication Results:`);
      console.log(`  ✅ Successful: ${results.length}`);
      console.log(`  ❌ Failed: ${errors.length}`);
      console.log(`  📈 Total campaigns created: ${results.length}`);

      return {
        success: results.length > 0,
        method: 'direct_duplication',
        results,
        errors,
        summary: {
          requested: multiplyCount,
          successful: results.length,
          failed: errors.length,
          apiCallsUsed: results.length * 50 // Approximate API calls
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
          console.log(`    ⚙️ Forcing 1-day click, 1-day view attribution on ad set ${i + 1}`);
          // Use Facebook's copy endpoint for ad sets
          const copyUrl = `${this.baseURL}/${sourceAdSetId}/copies`;
          const copyParams = {
            campaign_id: newCampaignId,
            deep_copy: true, // Deep copy to preserve all settings including attribution
            status_option: 'PAUSED',
            rename_options: JSON.stringify({
              rename_suffix: `_Copy${copyNumber}`
            }),
            // FORCE 1-DAY CLICK, 1-DAY VIEW ATTRIBUTION FROM THE START
            attribution_spec: JSON.stringify([
              { event_type: 'CLICK_THROUGH', window_days: 1 },
              { event_type: 'VIEW_THROUGH', window_days: 1 }
            ]),
            access_token: this.accessToken
          };

          const copyResponse = await axios.post(copyUrl, null, { params: copyParams });
          const newAdSetId = copyResponse.data.copied_adset_id || copyResponse.data.id;
          clonedAdSets.push(newAdSetId);

          // With deep_copy: true, ads are already copied
          // Check if copied ads exist and track them
          if (copyResponse.data.copied_ad_ids && copyResponse.data.copied_ad_ids.length > 0) {
            // Ads were copied with deep_copy
            clonedAds.push(...copyResponse.data.copied_ad_ids);
            console.log(`    ✅ Deep copied ${copyResponse.data.copied_ad_ids.length} ad(s)`);
          } else if (postId && !copyResponse.data.copied_ad_ids) {
            // Only create new ad if deep_copy didn't copy any ads
            // This handles edge case where original might not have had ads
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

      // After all ad sets are duplicated, ensure attribution is correct
      console.log('\n🔧 Verifying attribution settings for all duplicated ad sets...');
      const attributionResults = [];

      for (let i = 0; i < clonedAdSets.length; i++) {
        const adSetId = clonedAdSets[i];
        console.log(`  Checking ad set ${i + 1}/${clonedAdSets.length}...`);

        const result = await this.verifyAdSetAttribution(adSetId);
        attributionResults.push(result);

        // Small delay to avoid rate limits
        if (i > 0 && i % 10 === 0) {
          await this.delay(1000);
        }
      }

      // Log summary
      const verified = attributionResults.filter(r => r.verified).length;
      const notVerified = attributionResults.filter(r => !r.verified && !r.error).length;
      const errors = attributionResults.filter(r => r.error).length;

      console.log('\n📊 Attribution Verification Summary:');
      console.log(`  ✅ Verified correct: ${verified} ad sets`);
      console.log(`  ⚠️ Not verified: ${notVerified} ad sets`);
      if (errors > 0) {
        console.log(`  ⚠️ Failed to verify: ${errors} ad sets`);
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

  // NEW: Verification-only method that doesn't try to update (since attribution is immutable)
  async verifyAdSetAttribution(adSetId) {
    try {
      const getUrl = `${this.baseURL}/${adSetId}`;
      const getParams = {
        fields: 'attribution_spec,name',
        access_token: this.accessToken
      };

      const currentAdSet = await axios.get(getUrl, { params: getParams });
      const currentAttribution = currentAdSet.data.attribution_spec;

      if (currentAttribution && Array.isArray(currentAttribution)) {
        const hasOneClickDay = currentAttribution.some(
          spec => spec.event_type === 'CLICK_THROUGH' && spec.window_days === 1
        );
        const hasOneViewDay = currentAttribution.some(
          spec => spec.event_type === 'VIEW_THROUGH' && spec.window_days === 1
        );

        if (hasOneClickDay && hasOneViewDay && currentAttribution.length === 2) {
          console.log(`    ✅ Verified: 1-day click, 1-day view is set for ${adSetId}`);
          return { verified: true, adSetId };
        } else {
          console.log(`    ⚠️ Warning: Attribution not as expected for ${adSetId}`);
          return { verified: false, adSetId, currentAttribution };
        }
      } else {
        console.log(`    ⚠️ No attribution spec found for ${adSetId}`);
        return { verified: false, adSetId, currentAttribution };
      }
    } catch (error) {
      console.warn(`    ⚠️ Could not verify attribution for ${adSetId}: ${error.message}`);
      return { error: true, adSetId, message: error.message };
    }
  }

  // LEGACY: Helper method to ensure ad set has correct attribution settings (kept for backward compatibility)
  async ensureAdSetAttribution(adSetId) {
    try {
      // First, GET the current attribution to check if update is needed
      const getUrl = `${this.baseURL}/${adSetId}`;
      const getParams = {
        fields: 'attribution_spec,name',
        access_token: this.accessToken
      };

      const currentAdSet = await axios.get(getUrl, { params: getParams });
      const currentAttribution = currentAdSet.data.attribution_spec;

      // Check if attribution needs updating
      let needsUpdate = true;

      if (currentAttribution && Array.isArray(currentAttribution)) {
        // Check if it already has 1-day click and 1-day view
        const hasOneClickDay = currentAttribution.some(
          spec => spec.event_type === 'CLICK_THROUGH' && spec.window_days === 1
        );
        const hasOneViewDay = currentAttribution.some(
          spec => spec.event_type === 'VIEW_THROUGH' && spec.window_days === 1
        );

        if (hasOneClickDay && hasOneViewDay && currentAttribution.length === 2) {
          needsUpdate = false;
        }
      }

      if (needsUpdate) {
        // UPDATE the attribution
        const updateUrl = `${this.baseURL}/${adSetId}`;
        const updateParams = {
          attribution_spec: JSON.stringify([
            { event_type: 'CLICK_THROUGH', window_days: 1 },
            { event_type: 'VIEW_THROUGH', window_days: 1 }
          ]),
          access_token: this.accessToken
        };

        await axios.post(updateUrl, null, { params: updateParams });
        console.log(`    ✅ Attribution updated to 1-day click, 1-day view for ad set ${adSetId}`);
        return { updated: true, adSetId };
      } else {
        console.log(`    ✓ Attribution already correct for ad set ${adSetId}`);
        return { updated: false, adSetId };
      }
    } catch (error) {
      console.warn(`    ⚠️ Could not verify/update attribution for ad set ${adSetId}: ${error.message}`);
      return { error: true, adSetId, message: error.message };
    }
  }

  // Legacy method kept for backward compatibility
  async updateAdSetAttribution(adSetId) {
    try {
      const updateUrl = `${this.baseURL}/${adSetId}`;
      const updateParams = {
        attribution_spec: JSON.stringify([
          { event_type: 'CLICK_THROUGH', window_days: 1 },
          { event_type: 'VIEW_THROUGH', window_days: 1 }
        ]),
        access_token: this.accessToken
      };

      await axios.post(updateUrl, null, { params: updateParams });
      console.log(`    ✅ Attribution settings applied (1-day click, 1-day view)`);
      return true;
    } catch (error) {
      console.warn(`    ⚠️ Attribution update failed: ${error.message}`);
      return false; // Don't fail the entire duplication
    }
  }

  /**
   * Update an existing campaign
   * Facebook API endpoint: POST /{campaign_id}
   * Documentation: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group/
   */
  async updateCampaign(campaignId, updateData) {
    try {
      const url = `${this.baseURL}/${campaignId}`;
      const params = {
        access_token: this.accessToken
      };

      // Add update parameters
      if (updateData.name) params.name = updateData.name;
      if (updateData.status) params.status = updateData.status;
      if (updateData.daily_budget) params.daily_budget = updateData.daily_budget;
      if (updateData.lifetime_budget) params.lifetime_budget = updateData.lifetime_budget;
      if (updateData.special_ad_categories) {
        params.special_ad_categories = JSON.stringify(updateData.special_ad_categories);
      }

      console.log(`📝 Updating campaign ${campaignId}:`, params);
      const response = await axios.post(url, null, { params });
      console.log(`✅ Campaign ${campaignId} updated successfully`);

      return response.data;
    } catch (error) {
      console.error(`❌ Failed to update campaign ${campaignId}:`, error.response?.data || error.message);
      this.handleError(error);
    }
  }

  /**
   * Duplicate campaign using Strategy 1-50-1 based approach
   * This follows the EXACT same pattern as the working 1-50-1 strategy
   * to ensure consistent and reliable duplication without page_id errors
   */
  async duplicateCampaign(campaignId, newName, numberOfCopies = 1) {
    try {
      console.log(`🎯 Starting 1-50-1 based duplication of campaign ${campaignId}`);
      console.log(`📊 Number of copies requested: ${numberOfCopies}`);
      console.log(`🔧 Using Strategy150DuplicationService - proven working pattern`);

      // Create the Strategy 1-50-1 based duplication service
      console.log(`🔍 DEBUG: FacebookAPI parameters for Strategy150Service:`);
      console.log(`  - accessToken: ${this.accessToken ? 'SET' : 'UNDEFINED'}`);
      console.log(`  - adAccountId: ${this.adAccountId || 'UNDEFINED'}`);
      console.log(`  - pageId: ${this.pageId || 'UNDEFINED'}`);
      console.log(`  - pixelId: ${this.pixelId || 'UNDEFINED'}`);

      const strategy150Service = new Strategy150DuplicationService(
        this.accessToken,
        this.adAccountId,
        this.pageId,
        this.pixelId
      );

      // Use the new service that follows 1-50-1 pattern exactly
      const results = await strategy150Service.duplicateCampaign(campaignId, newName, numberOfCopies);

      console.log(`✅ 1-50-1 based duplication complete!`);

      // Return results in expected format
      if (numberOfCopies === 1) {
        const result = results[0];
        return {
          id: result.campaign.id,
          name: result.campaign.name,
          copyNumber: 1
        };
      } else {
        return results.map((result, index) => ({
          id: result.campaign.id,
          name: result.campaign.name,
          copyNumber: index + 1
        }));
      }

    } catch (error) {
      console.error(`❌ 1-50-1 based duplication failed for campaign ${campaignId}:`, error.message);

      // Fallback to original methods only if the new service completely fails
      console.log(`⚠️ Falling back to original duplication methods...`);
      return await this.duplicateCampaignFallback(campaignId, newName, numberOfCopies);
    }
  }

  /**
   * Fallback duplication method using original THREE-TIER strategy
   * Only used if the new Strategy 1-50-1 based service fails completely
   */
  async duplicateCampaignFallback(campaignId, newName, numberOfCopies = 1) {
    try {
      console.log(`📝 Starting fallback duplication of campaign ${campaignId}`);

      const duplicatedCampaigns = [];

      // Create the requested number of copies
      for (let copyIndex = 0; copyIndex < numberOfCopies; copyIndex++) {
        const copyNumber = copyIndex + 1;
        const campaignCopyName = numberOfCopies > 1
          ? `${newName || 'Campaign'} - Copy ${copyNumber}`
          : (newName || `Campaign - Copy`);

        console.log(`\n🔄 Creating fallback copy ${copyNumber} of ${numberOfCopies}: "${campaignCopyName}"`);

        let newCampaignId;

        // STRATEGY 1: Try native Facebook /copies endpoint FIRST (optimal - 1 API call)
        try {
          console.log(`🚀 Using Facebook native /copies endpoint (1 API call for everything!)`);
          newCampaignId = await this.duplicateCampaignDeepCopy(campaignId, campaignCopyName);
          console.log(`✅ Successfully duplicated using native endpoint!`);
        } catch (deepCopyError) {
          console.log(`⚠️ Native /copies failed (likely >51 children), trying alternatives...`);

          // STRATEGY 2: Try batch API for large campaigns (2-3 API calls)
          try {
            console.log(`📦 Using BATCH API (2-3 API calls total)`);
            const batchService = new BatchDuplicationService(this.accessToken, this.adAccountId, this.pageId);
            const results = await batchService.duplicateCampaignBatch(campaignId, campaignCopyName, 1);
            newCampaignId = this.extractCampaignIdFromBatchResult(results);
            console.log(`✅ Successfully duplicated using batch API!`);
          } catch (batchError) {
            // STRATEGY 3: Last resort - sequential copy
            console.log(`⚠️ Batch API failed, using sequential copy (last resort)...`);
            newCampaignId = await this.duplicateCampaignSequential(campaignId, campaignCopyName);
          }
        }

        if (newCampaignId) {
          duplicatedCampaigns.push({
            id: newCampaignId,
            name: campaignCopyName,
            copyNumber: copyNumber
          });
          console.log(`✅ Successfully created fallback copy ${copyNumber}: ${newCampaignId}`);
        } else {
          console.error(`❌ Failed to create fallback copy ${copyNumber}`);
        }

        // Add a small delay between copies to avoid rate limits
        if (copyIndex < numberOfCopies - 1) {
          await this.delay(1000);
        }
      }

      console.log(`\n🎉 Fallback duplication complete! Created ${duplicatedCampaigns.length} of ${numberOfCopies} requested copies`);

      // Return single campaign for backward compatibility, or array if multiple
      return numberOfCopies === 1 ? duplicatedCampaigns[0] : duplicatedCampaigns;

    } catch (error) {
      console.error(`❌ Failed fallback duplication for campaign ${campaignId}:`, error.response?.data || error.message);
      this.handleError(error);
    }
  }

  /**
   * Get the size of a campaign (number of ad sets and ads)
   */
  async getCampaignSize(campaignId) {
    try {
      // Fetch ad sets count
      const adSetsResponse = await axios.get(
        `${this.baseURL}/${campaignId}/adsets`,
        {
          params: {
            fields: 'id',
            limit: 100,
            access_token: this.accessToken
          }
        }
      );

      // Fetch ads count
      const adsResponse = await axios.get(
        `${this.baseURL}/${campaignId}/ads`,
        {
          params: {
            fields: 'id',
            limit: 100,
            access_token: this.accessToken
          }
        }
      );

      const adSetsCount = adSetsResponse.data?.data?.length || 0;
      const adsCount = adsResponse.data?.data?.length || 0;

      return {
        adSets: adSetsCount,
        ads: adsCount,
        totalObjects: 1 + adSetsCount + adsCount // 1 campaign + ad sets + ads
      };
    } catch (error) {
      console.error('Failed to get campaign size:', error.message);
      // Default to sequential copy if we can't determine size
      return { adSets: 999, ads: 999, totalObjects: 999 };
    }
  }

  /**
   * Original deep copy method for small campaigns
   */
  async duplicateCampaignDeepCopy(campaignId, newName) {
    try {
      const url = `${this.baseURL}/${campaignId}/copies`;
      const params = {
        access_token: this.accessToken,
        deep_copy: true,  // Copy all child objects (ad sets, ads)
        end_time: null,    // Remove end time for new campaign
        start_time: null,  // Remove start time for new campaign
        rename_options: JSON.stringify({
          rename_suffix: ' - Copy',
          rename_strategy: 'DEEP_RENAME'  // Rename campaign, ad sets, and ads
        }),
        status_option: 'PAUSED'  // Start new campaign as paused
      };

      // If a custom name is provided, use it
      if (newName) {
        params.name = newName;
      }

      console.log(`  📝 Using Facebook /copies endpoint for deep copy`);
      const response = await axios.post(url, null, { params });

      // Facebook returns copied_campaign_id, not id
      const newCampaignId = response.data.copied_campaign_id || response.data.id;
      console.log(`  ✅ Campaign duplicated via deep copy. New ID: ${newCampaignId}`);

      return newCampaignId;
    } catch (error) {
      console.error(`  ❌ Deep copy failed:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Sequential copy method for large campaigns
   */
  async duplicateCampaignSequential(campaignId, newName) {
    try {
      console.log(`  📋 Starting sequential copy process...`);

      // Step 1: Get original campaign details
      const originalCampaign = await axios.get(
        `${this.baseURL}/${campaignId}`,
        {
          params: {
            fields: 'name,objective,status,special_ad_categories,special_ad_category_country,daily_budget,lifetime_budget,bid_strategy,budget_remaining,account_id',
            access_token: this.accessToken
          }
        }
      );

      // Get the correct account ID
      let accountId = originalCampaign.data.account_id;
      if (accountId && accountId.startsWith('act_')) {
        accountId = accountId.substring(4);
      }

      console.log(`  📊 Using account ID: ${accountId}`);

      // Step 2: Create new campaign
      const newCampaignData = {
        name: newName || `${originalCampaign.data.name} - Copy`,
        objective: originalCampaign.data.objective,
        status: 'PAUSED',
        special_ad_categories: JSON.stringify(originalCampaign.data.special_ad_categories || []),
        access_token: this.accessToken
      };

      if (originalCampaign.data.daily_budget) {
        newCampaignData.daily_budget = originalCampaign.data.daily_budget;
      }
      if (originalCampaign.data.lifetime_budget) {
        newCampaignData.lifetime_budget = originalCampaign.data.lifetime_budget;
      }
      if (originalCampaign.data.bid_strategy) {
        newCampaignData.bid_strategy = originalCampaign.data.bid_strategy;
      }

      console.log(`  🚀 Creating new campaign...`);
      const newCampaignResponse = await axios.post(
        `${this.baseURL}/act_${accountId}/campaigns`,
        null,
        { params: newCampaignData }
      );

      const newCampaignId = newCampaignResponse.data.id;
      console.log(`  ✅ New campaign created: ${newCampaignId}`);

      // Step 3: Get all ad sets from original campaign
      const adSetsResponse = await axios.get(
        `${this.baseURL}/${campaignId}/adsets`,
        {
          params: {
            fields: 'id,name,status,targeting,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,bid_strategy,promoted_object,attribution_spec,conversion_specs,start_time,end_time,schedule,frequency_control_specs,optimization_sub_event,min_spending_target,max_spending_target,pacing_type,instagram_actor_id,destination_type',
            limit: 100,
            access_token: this.accessToken
          }
        }
      );

      const originalAdSets = adSetsResponse.data?.data || [];
      console.log(`  📦 Found ${originalAdSets.length} ad sets to copy`);

      // Step 4: Copy each ad set
      for (let i = 0; i < originalAdSets.length; i++) {
        const adSet = originalAdSets[i];
        console.log(`  📄 Copying ad set ${i + 1}/${originalAdSets.length}: ${adSet.name}`);

        try {
          // Create new ad set - properly stringify JSON fields
          const newAdSetData = {
            name: `${adSet.name} - Copy`,
            campaign_id: newCampaignId,
            targeting: typeof adSet.targeting === 'string' ? adSet.targeting : JSON.stringify(adSet.targeting),
            daily_budget: adSet.daily_budget,
            lifetime_budget: adSet.lifetime_budget,
            optimization_goal: adSet.optimization_goal,
            billing_event: adSet.billing_event,
            bid_strategy: adSet.bid_strategy,
            promoted_object: typeof adSet.promoted_object === 'string' ? adSet.promoted_object : JSON.stringify(adSet.promoted_object),
            attribution_spec: typeof adSet.attribution_spec === 'string' ? adSet.attribution_spec : JSON.stringify(adSet.attribution_spec),
            status: 'PAUSED',
            access_token: this.accessToken
          };

          // Remove undefined fields
          Object.keys(newAdSetData).forEach(key => {
            if (newAdSetData[key] === undefined || newAdSetData[key] === null) {
              delete newAdSetData[key];
            }
          });

          const newAdSetResponse = await axios.post(
            `${this.baseURL}/act_${accountId}/adsets`,
            null,
            { params: newAdSetData }
          );

          const newAdSetId = newAdSetResponse.data.id;
          console.log(`    ✅ Ad set copied: ${newAdSetId}`);

          // Step 5: Get and copy all ads for this ad set
          const adsResponse = await axios.get(
            `${this.baseURL}/${adSet.id}/ads`,
            {
              params: {
                fields: 'id,name,status,creative{id,name,object_story_spec,object_story_id,title,body,link_url,call_to_action_type,object_type,object_url,product_set_id,video_id,image_url,image_hash,actor_id,page_id,instagram_actor_id,instagram_permalink_url,instagram_story_id,asset_feed_spec,degrees_of_freedom_spec,recommender_settings,source_instagram_media_id,interactive_components_spec,playable_asset_id,dynamic_ad_voice,effective_object_story_id},tracking_specs,conversion_specs,url_tags,preview_shareable_link,pixel_id,pixel_rule,pixel_aggregation_rule,data_driven_convs',
                limit: 100,
                access_token: this.accessToken
              }
            }
          );

          const ads = adsResponse.data?.data || [];
          console.log(`    📎 Found ${ads.length} ads to copy`);

          for (let j = 0; j < ads.length; j++) {
            const ad = ads[j];
            try {
              // Check if this ad uses an existing post (object_story_id)
              const objectStoryId = ad.creative?.object_story_id ||
                                   ad.creative?.effective_object_story_id;
              const pageId = ad.creative?.page_id;

              // DEBUG: Log what creative data we actually have
              console.log(`      🔍 Original ad data:`, {
                adId: ad.id,
                adName: ad.name,
                creativeId: ad.creative?.id,
                creativeKeys: Object.keys(ad.creative || {}),
                fullCreative: ad.creative
              });

              console.log(`      🔍 Extracted values:`, {
                objectStoryId: ad.creative?.object_story_id,
                effectiveObjectStoryId: ad.creative?.effective_object_story_id,
                pageId: ad.creative?.page_id,
                servicePageId: this.pageId
              });

              let newAdData;

              if (objectStoryId) {
                // This is an existing post ad - use SAME pattern as 1-50-1 strategy
                console.log(`      🔗 Using existing post: ${objectStoryId}`);
                newAdData = {
                  name: `${ad.name} - Copy`,
                  adset_id: newAdSetId,
                  creative: JSON.stringify({
                    object_story_id: objectStoryId,
                    page_id: this.pageId  // FIXED: Use service pageId like 1-50-1 does
                  }),
                  status: 'PAUSED',
                  access_token: this.accessToken
                };
              } else if (ad.creative?.id) {
                // Reference existing creative by ID - ADDED: new fallback option
                console.log(`      🎨 Using existing creative ID: ${ad.creative.id}`);
                newAdData = {
                  name: `${ad.name} - Copy`,
                  adset_id: newAdSetId,
                  creative: JSON.stringify({
                    creative_id: ad.creative.id
                  }),
                  status: 'PAUSED',
                  access_token: this.accessToken
                };
              } else {
                // Create basic ad with minimal creative reference - FIXED: avoid page_id issues
                console.log(`      📋 Creating basic ad copy without problematic fields`);
                newAdData = {
                  name: `${ad.name} - Copy`,
                  adset_id: newAdSetId,
                  creative: JSON.stringify({
                    creative_id: ad.creative?.id || 'temp_placeholder'
                  }),
                  status: 'PAUSED',
                  access_token: this.accessToken
                };
              }

              // Add tracking specs if they exist
              if (ad.tracking_specs) {
                newAdData.tracking_specs = typeof ad.tracking_specs === 'string'
                  ? ad.tracking_specs
                  : JSON.stringify(ad.tracking_specs);
              }

              // Remove undefined fields
              Object.keys(newAdData).forEach(key => {
                if (newAdData[key] === undefined || newAdData[key] === null) {
                  delete newAdData[key];
                }
              });

              // DEBUG: Log exact API request data
              console.log(`      🚀 About to make API call with data:`, {
                url: `${this.baseURL}/act_${accountId}/ads`,
                params: newAdData,
                creativeString: newAdData.creative
              });

              await axios.post(
                `${this.baseURL}/act_${accountId}/ads`,
                null,
                { params: newAdData }
              );

              console.log(`      ✅ Ad ${j + 1}/${ads.length} copied`);
            } catch (adError) {
              console.error(`      ⚠️ Failed to copy ad ${j + 1}:`, adError.message);
              // Log more details for debugging
              if (adError.response?.data?.error) {
                console.error(`      📛 Facebook error:`, adError.response.data.error.message);
              }
            }
          }

        } catch (adSetError) {
          console.error(`    ⚠️ Failed to copy ad set:`, adSetError.message);
          // Log detailed error for debugging
          if (adSetError.response?.data?.error) {
            const fbError = adSetError.response.data.error;
            console.error(`    📛 Facebook API Error:`, {
              message: fbError.message,
              type: fbError.type,
              code: fbError.code,
              error_subcode: fbError.error_subcode
            });
          }
        }

        // Small delay to avoid rate limits
        if (i < originalAdSets.length - 1) {
          await this.delay(500);
        }
      }

      console.log(`  🎉 Sequential copy complete for campaign ${newCampaignId}`);
      return newCampaignId;

    } catch (error) {
      console.error(`  ❌ Sequential copy failed:`, error.message);
      throw error;
    }
  }

  /**
   * Extract campaign ID from batch API results
   */
  extractCampaignIdFromBatchResult(results) {
    if (!results || !results.length) return null;

    // Find the campaign creation result (should be first)
    for (const result of results) {
      if (result && result[0] && result[0].code === 200) {
        try {
          const body = JSON.parse(result[0].body);
          if (body.id) {
            return body.id;
          }
        } catch (e) {
          continue;
        }
      }
    }
    return null;
  }

  /**
   * Create a new campaign (wrapper for existing method)
   */
  async createCampaignFromExisting(adAccountId, campaignData) {
    try {
      const url = `${this.baseURL}/act_${adAccountId}/campaigns`;
      const params = {
        name: campaignData.name,
        objective: campaignData.objective,
        status: campaignData.status || 'PAUSED',
        special_ad_categories: JSON.stringify(campaignData.special_ad_categories || []),
        access_token: this.accessToken
      };

      if (campaignData.daily_budget) {
        params.daily_budget = campaignData.daily_budget;
      }
      if (campaignData.lifetime_budget) {
        params.lifetime_budget = campaignData.lifetime_budget;
      }

      const response = await axios.post(url, null, { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}

module.exports = FacebookAPI;