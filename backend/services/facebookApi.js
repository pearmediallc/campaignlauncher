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
      const params = {
        name: `[REVIEW] ${campaignData.name}`,
        objective: 'OUTCOME_LEADS',
        status: 'PAUSED',
        special_ad_categories: JSON.stringify([]),
        buying_type: 'AUCTION',
        access_token: this.accessToken
      };

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
        optimization_goal: adSetData.conversionLocation === 'calls' ? 'CALLS' : 'OFFSITE_CONVERSIONS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        promoted_object: adSetData.conversionLocation === 'calls' ? 
          JSON.stringify({
            page_id: this.pageId
          }) : 
          JSON.stringify({
            pixel_id: this.pixelId,
            custom_event_type: 'LEAD'
          }),
        status: 'PAUSED',
        access_token: this.accessToken
      };
      
      // Handle budget based on type
      if (adSetData.budgetType === 'lifetime') {
        const lifetimeBudgetCents = Math.round(adSetData.lifetimeBudget * 100);
        params.lifetime_budget = lifetimeBudgetCents;
      } else {
        const dailyBudgetCents = Math.round(adSetData.dailyBudget * 100);
        params.daily_budget = dailyBudgetCents;
      }
      
      // Build targeting from provided data
      const targeting = {
        age_min: adSetData.targeting?.ageMin || 18,
        age_max: adSetData.targeting?.ageMax || 65,
      };
      
      // Add location targeting
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
      if (adSetData.placements) {
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
      } else {
        // Default placements
        targeting.publisher_platforms = ['facebook', 'instagram', 'audience_network', 'messenger'];
        targeting.facebook_positions = ['feed', 'right_hand_column', 'instant_article', 'marketplace', 'video_feeds', 'story'];
        targeting.instagram_positions = ['stream', 'story', 'explore', 'reels'];
        targeting.audience_network_positions = ['classic', 'rewarded_video'];
        targeting.messenger_positions = ['messenger_home', 'story'];
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

  handleError(error) {
    if (error.response) {
      const fbError = error.response.data.error;
      const errorMessage = fbError ? fbError.message : 'Facebook API Error';
      const errorCode = fbError ? fbError.code : 'UNKNOWN';
      
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