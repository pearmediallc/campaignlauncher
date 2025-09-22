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
    try {
      const url = `${this.baseURL}/act_${this.adAccountId}/campaigns`;

      // Use passed parameters instead of hardcoded values
      const params = {
        name: `[REVIEW] ${campaignData.name}`,
        objective: campaignData.objective || 'OUTCOME_LEADS',
        status: campaignData.status || 'PAUSED',
        special_ad_categories: JSON.stringify(campaignData.specialAdCategories || []),
        buying_type: campaignData.buyingType || 'AUCTION',
        access_token: this.accessToken
      };

      // Add bid strategy at campaign level
      if (campaignData.bidStrategy) {
        params.bid_strategy = campaignData.bidStrategy;
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

      console.log('🔵 Creating campaign with params:', {
        ...params,
        access_token: '[HIDDEN]'
      });
      console.log('🔵 Special Ad Categories being sent:', params.special_ad_categories);
      console.log('🔵 Objective being sent:', params.objective);
      console.log('🔵 Buying Type being sent:', params.buying_type);

      const response = await axios.post(url, null, { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async createAdSet(adSetData) {
    try {
      const url = `${this.baseURL}/act_${this.adAccountId}/adsets`;
      
      console.log('Creating AdSet with data:', {
        budgetType: adSetData.budgetType,
        schedule: adSetData.schedule,
        lifetimeBudget: adSetData.lifetimeBudget,
        dailyBudget: adSetData.dailyBudget,
        conversionLocation: adSetData.conversionLocation,
        pixelId: this.pixelId,
        pageId: this.pageId
      });
      
      // Validate required fields
      if (adSetData.conversionLocation === 'website' && !this.pixelId) {
        throw new Error('Pixel ID is required for website conversion campaigns. No pixel found for the selected ad account.');
      }
      
      const params = {
        name: `[REVIEW] ${adSetData.campaignName} - AdSet`,
        campaign_id: adSetData.campaignId,
        billing_event: 'IMPRESSIONS',
        optimization_goal: this.getOptimizationGoal(adSetData),
        bid_strategy: adSetData.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
        promoted_object: this.getPromotedObject(adSetData),
        status: 'PAUSED',
        access_token: this.accessToken
      };

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
      
      // Handle budget based on type
      if (adSetData.budgetType === 'lifetime') {
        const lifetimeBudgetCents = Math.round(adSetData.lifetimeBudget * 100);
        params.lifetime_budget = lifetimeBudgetCents;
      } else {
        const dailyBudgetCents = Math.round(adSetData.dailyBudget * 100);
        params.daily_budget = dailyBudgetCents;
      }

      // Add bid caps and constraints if provided
      if (adSetData.costCap) {
        params.bid_cap = Math.round(parseFloat(adSetData.costCap) * 100);
      }
      if (adSetData.minRoas) {
        params.min_roas = parseFloat(adSetData.minRoas);
      }
      if (adSetData.bidAmount) {
        params.bid_amount = Math.round(parseFloat(adSetData.bidAmount) * 100);
      }
      
      // Build targeting from provided data with correct field names
      // For special ad categories, age_max should be 65+ (which is represented as no age_max or 65)
      const hasSpecialAdCategories = adSetData.specialAdCategories && adSetData.specialAdCategories.length > 0;

      const targeting = {};

      // For special ad categories (HOUSING/EMPLOYMENT/CREDIT), use broader age targeting
      if (hasSpecialAdCategories) {
        targeting.age_min = 18;
        // Don't set age_max to allow 65+ (Facebook requirement for special ad categories)
      } else {
        // Regular campaigns can use specific age targeting
        targeting.age_min = adSetData.targeting?.ageMin || adSetData.targeting?.age_min || 18;
        targeting.age_max = adSetData.targeting?.ageMax || adSetData.targeting?.age_max || 65;
      }

      // Handle gender targeting - check both locations for gender data
      // BUT: If special ad categories include HOUSING, EMPLOYMENT, or CREDIT, skip gender targeting
      const hasRestrictedCategories = adSetData.specialAdCategories &&
        adSetData.specialAdCategories.some(cat => ['HOUSING', 'EMPLOYMENT', 'CREDIT'].includes(cat));

      if (!hasRestrictedCategories) {
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

      const response = await axios.post(url, null, { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
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
        status: 'PAUSED',
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
    try {
      // Create campaign with Strategy 150 specific settings
      const campaign = await this.createCampaign({
        name: campaignData.campaignName,
        objective: this.mapObjective(campaignData.objective),
        buyingType: campaignData.buyingType ? campaignData.buyingType.toUpperCase() : 'AUCTION',
        specialAdCategories: campaignData.specialAdCategories,
        bidStrategy: campaignData.bidStrategy,
        status: campaignData.status || 'PAUSED',
        daily_budget: campaignData.campaignBudgetOptimization && campaignData.campaignBudget?.dailyBudget ? campaignData.campaignBudget.dailyBudget : undefined,
        lifetime_budget: campaignData.campaignBudgetOptimization && campaignData.campaignBudget?.lifetimeBudget ? campaignData.campaignBudget.lifetimeBudget : undefined
      });

      // Create ad set with Strategy 150 specific settings
      const adSet = await this.createAdSet({
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

      // Create initial ad
      const mediaAssets = await this.prepareMediaAssets(campaignData);
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

      return {
        campaign,
        adSet,
        ads: [ad]
      };
    } catch (error) {
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
        // Return the most recent post (likely to be our ad)
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
      // Get original ad set data
      const originalAdSetResponse = await axios.get(`${this.baseURL}/${originalAdSetId}`, {
        params: {
          fields: 'name,targeting,bid_amount,billing_event,optimization_goal,bid_strategy,daily_budget,lifetime_budget,campaign_id',
          access_token: this.accessToken
        }
      });

      const originalAdSet = originalAdSetResponse.data;

      // Create 49 duplicate ad sets
      for (let i = 1; i <= count; i++) {
        try {
          // Create duplicate ad set
          const duplicateAdSetData = {
            name: `${originalAdSet.name} - Copy ${i}`,
            campaign_id: campaignId,
            billing_event: originalAdSet.billing_event,
            optimization_goal: originalAdSet.optimization_goal,
            bid_strategy: originalAdSet.bid_strategy,
            targeting: JSON.stringify(originalAdSet.targeting),
            status: 'PAUSED',
            access_token: this.accessToken
          };

          // Add budget information
          if (originalAdSet.daily_budget) {
            duplicateAdSetData.daily_budget = originalAdSet.daily_budget;
          }
          if (originalAdSet.lifetime_budget) {
            duplicateAdSetData.lifetime_budget = originalAdSet.lifetime_budget;
          }

          const adSetResponse = await axios.post(
            `${this.baseURL}/act_${this.adAccountId}/adsets`,
            null,
            { params: duplicateAdSetData }
          );

          const newAdSetId = adSetResponse.data.id;

          // Create ad using existing post
          const adData = {
            name: `${formData.campaignName} - Ad Copy ${i}`,
            adset_id: newAdSetId,
            creative: JSON.stringify({
              object_story_id: postId,
              page_id: this.pageId
            }),
            status: 'PAUSED',
            access_token: this.accessToken
          };

          await axios.post(
            `${this.baseURL}/act_${this.adAccountId}/ads`,
            null,
            { params: adData }
          );

          results.adSets.push({
            id: newAdSetId,
            name: duplicateAdSetData.name
          });

          console.log(`✅ Created ad set copy ${i}: ${newAdSetId}`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Error creating ad set copy ${i}:`, error);
          results.errors.push({
            adSetIndex: i,
            error: error.message
          });
        }
      }

      console.log(`Strategy 1-50-1 duplication completed. Success: ${results.adSets.length}, Errors: ${results.errors.length}`);
      return results;

    } catch (error) {
      console.error('Error in duplicateAdSetsWithExistingPost:', error);
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
    const promotedObject = {};

    if (adSetData.conversionLocation === 'calls') {
      promotedObject.page_id = this.pageId;
    } else if (adSetData.conversionLocation === 'website' && this.pixelId) {
      promotedObject.pixel_id = this.pixelId;

      // Map conversion events to proper Meta API case-sensitive format
      const eventMap = {
        'LEAD': 'Lead',
        'lead': 'Lead',
        'Lead': 'Lead',
        'PURCHASE': 'Purchase',
        'purchase': 'Purchase',
        'Purchase': 'Purchase',
        'ADD_TO_CART': 'AddToCart',
        'add_to_cart': 'AddToCart',
        'AddToCart': 'AddToCart',
        'COMPLETE_REGISTRATION': 'CompleteRegistration',
        'complete_registration': 'CompleteRegistration',
        'CompleteRegistration': 'CompleteRegistration',
        'PAGE_VIEW': 'PageView',
        'page_view': 'PageView',
        'PageView': 'PageView',
        'VIEW_CONTENT': 'ViewContent',
        'view_content': 'ViewContent',
        'ViewContent': 'ViewContent',
        'INITIATE_CHECKOUT': 'InitiateCheckout',
        'initiate_checkout': 'InitiateCheckout',
        'InitiateCheckout': 'InitiateCheckout',
        'ADD_PAYMENT_INFO': 'AddPaymentInfo',
        'add_payment_info': 'AddPaymentInfo',
        'AddPaymentInfo': 'AddPaymentInfo'
      };

      const conversionEvent = adSetData.conversionEvent || 'Lead';
      promotedObject.custom_event_type = eventMap[conversionEvent] || conversionEvent;

    } else if (adSetData.conversionLocation === 'app') {
      promotedObject.application_id = adSetData.applicationId || process.env.FB_APP_ID;
      promotedObject.object_store_url = adSetData.appStoreUrl;
      if (adSetData.conversionEvent) {
        promotedObject.custom_event_type = adSetData.conversionEvent;
      }
    }

    return JSON.stringify(promotedObject);
  }

  mapObjective(objective) {
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
      'engagement': 'OUTCOME_ENGAGEMENT'
    };

    return objectiveMap[objective?.toLowerCase()] || objective || 'OUTCOME_LEADS';
  }

  handleError(error) {
    if (error.response) {
      const fbError = error.response.data.error;
      const errorMessage = fbError ? fbError.message : 'Facebook API Error';
      const errorCode = fbError ? fbError.code : 'UNKNOWN';

      // Enhanced error logging for debugging
      console.error('🔴 Facebook API Error Details:');
      console.error('  Error Code:', errorCode);
      console.error('  Error Message:', errorMessage);
      if (fbError) {
        console.error('  Error Type:', fbError.type);
        console.error('  Error Subcode:', fbError.error_subcode);
        console.error('  Error User Title:', fbError.error_user_title);
        console.error('  Error User Message:', fbError.error_user_msg);
        console.error('  Fbtrace ID:', fbError.fbtrace_id);
        if (fbError.error_data) {
          console.error('  Error Data:', JSON.stringify(fbError.error_data, null, 2));
        }
        console.error('  Full Error Object:', JSON.stringify(fbError, null, 2));
      }
      console.error('  Request URL:', error.config?.url);
      console.error('  Request Method:', error.config?.method);
      console.error('  Request Data:', error.config?.data);
      console.error('  Request Params:', error.config?.params);

      const customError = new Error(`Facebook API Error: ${errorMessage} (Code: ${errorCode})`);
      customError.status = error.response.status;
      customError.fbError = fbError;

      throw customError;
    } else if (error.request) {
      throw new Error('No response from Facebook API');
    } else {
      throw error;
    }
  }
}

module.exports = FacebookAPI;