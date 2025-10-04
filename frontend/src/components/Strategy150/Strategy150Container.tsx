import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Container,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { Strategy150FormData, Strategy150Phase, Strategy150Response } from '../../types/strategy150';
import Phase1Setup from './Phase1Setup/Phase1Setup';
import Phase2PostCapture from './Phase2PostCapture/Phase2PostCapture';
import Phase3Duplication from './Phase3Duplication/Phase3Duplication';
import CompletionSummary from './CompletionSummary/CompletionSummary';
import CampaignManagementContainer from './CampaignManagement/CampaignManagementContainer';
import MultiplyContainer from './MultiplySection/MultiplyContainer';

const steps = [
  'Campaign Setup (1-1-1)',
  'Post ID Collection',
  'Duplication (1-49-1)',
  'Completion'
];

const Strategy150Container: React.FC = () => {
  // Tab management
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  // Existing state for campaign creation
  const [phase, setPhase] = useState<Strategy150Phase>('setup');
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Strategy150FormData | null>(null);
  const [campaignResult, setCampaignResult] = useState<Strategy150Response | null>(null);
  const [postId, setPostId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [skippedFields, setSkippedFields] = useState<any>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);


  const getPhaseComponent = () => {
    switch (phase) {
      case 'setup':
        return (
          <Phase1Setup
            onSubmit={handlePhase1Submit}
            error={error}
          />
        );
      case 'creating':
      case 'waiting':
      case 'manual':
        return (
          <Phase2PostCapture
            campaignResult={campaignResult}
            phase={phase}
            onPostIdCaptured={handlePostIdCaptured}
            onManualInput={handleManualPostId}
            onRetry={handleRetryPostCapture}
          />
        );
      case 'duplicating':
        return (
          <Phase3Duplication
            campaignResult={campaignResult}
            postId={postId}
            formData={formData}
            onCompleted={handleDuplicationCompleted}
          />
        );
      case 'completed':
        return (
          <CompletionSummary
            campaignResult={campaignResult}
            postId={postId}
            onCreateNew={handleCreateNew}
          />
        );
      case 'error':
        return (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6">Error</Typography>
            {error}
          </Alert>
        );
      default:
        return null;
    }
  };

  const handlePhase1Submit = async (data: Strategy150FormData) => {
    console.log('\n🎯 ========== STRATEGY 1-50-1 CLIENT START ==========');
    console.log('📄 Form Data Received:', data);
    console.log('📊 Key Parameters:');
    console.log('  - Campaign Name:', data.campaignName);
    console.log('  - Objective:', data.objective);
    console.log('  - Budget Type:', data.budgetType);
    console.log('  - Daily Budget:', data.adSetBudget?.dailyBudget || 'Not set');
    console.log('  - Conversion Event:', data.conversionEvent);

    try {
      setFormData(data);
      setPhase('creating');
      setActiveStep(1);
      setError('');

      // Map Strategy150FormData to Strategy 1-50-1 endpoint format
      const campaignData = {
        // Basic campaign data
        campaignName: data.campaignName,
        primaryText: data.primaryText,
        headline: data.headline,
        description: data.description,
        url: data.url,
        urlType: data.urlType,
        callToAction: data.callToAction,
        displayLink: data.displayLink,

        // Media data
        mediaType: data.mediaType,
        mediaFiles: data.mediaFiles,
        image: data.image,
        video: data.video,
        images: data.images,
        mediaSpecs: data.mediaSpecs,

        // Facebook resources
        facebookPage: data.facebookPage,
        instagramAccount: data.instagramAccount,
        pixel: data.pixel,

        // Strategy 1-50-1 specific
        strategy: '1-50-1',
        publishDirectly: data.publishDirectly,

        // Budget configuration
        budgetType: data.budgetType || 'daily',
        budgetLevel: data.budgetLevel || 'adset',

        // Send budgets at root level for backend compatibility (ensure they're numbers)
        dailyBudget: data.budgetType === 'daily' || !data.budgetType ?
                    (data.adSetBudget?.dailyBudget ? parseFloat(String(data.adSetBudget.dailyBudget).replace(/[$,]/g, '')) : 50) : undefined,
        lifetimeBudget: data.budgetType === 'lifetime' ?
                       (data.adSetBudget?.lifetimeBudget ? parseFloat(String(data.adSetBudget.lifetimeBudget).replace(/[$,]/g, '')) : 350) : undefined,

        // Campaign budget (for CBO)
        campaignBudget: data.campaignBudget,
        campaignBudgetOptimization: data.campaignBudgetOptimization,

        // Ad set budget (keep for backward compatibility)
        adSetBudget: {
          dailyBudget: data.adSetBudget?.dailyBudget || (data.budgetType === 'daily' ? 50 : undefined),
          lifetimeBudget: data.adSetBudget?.lifetimeBudget || (data.budgetType === 'lifetime' ? 350 : undefined),
          spendingLimits: data.adSetBudget?.spendingLimits
        },

        // Meta API compliance fields
        buyingType: data.buyingType || 'AUCTION',
        objective: data.objective,
        specialAdCategories: data.specialAdCategories || [],
        performanceGoal: data.performanceGoal || 'maximize_conversions',
        conversionEvent: data.conversionEvent,
        conversionLocation: data.conversionLocation || 'website',
        attributionSetting: data.attributionSetting,
        attributionWindow: data.attributionWindow,
        bidStrategy: data.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
        bidAmount: data.bidAmount,
        costCap: data.costCap,
        minRoas: data.minRoas,

        // Targeting
        targeting: data.targeting || {
          locations: { countries: ['US'] },
          demographics: {
            ageMin: 18,
            ageMax: 65,
            genders: ['all']
          }
        },

        // Placements
        placementType: data.placementType || 'automatic',
        placements: data.placements,

        // Duplication settings for Strategy 1-50-1
        duplicationSettings: data.duplicationSettings || {
          defaultBudgetPerAdSet: 1,
          budgetDistributionType: 'equal'
        }
      };

      // Use the working campaignApi.createCampaign instead of custom endpoint
      console.log('\n🔄 Processing Form Data...');
      console.log('📤 Using working campaign creation flow');
      console.log('📝 Budget configuration:');
      console.log('  - Budget Type:', data.budgetType);
      console.log('  - Daily Budget:', data.adSetBudget?.dailyBudget || 'Not set');
      console.log('  - Lifetime Budget:', data.adSetBudget?.lifetimeBudget || 'Not set');

      // Transform to match working CampaignForm structure
      // IMPORTANT: Only send fields that backend validates and expects
      const workingCampaignData: any = {
        // Required fields
        campaignName: campaignData.campaignName,
        primaryText: campaignData.primaryText,
        headline: campaignData.headline,
        description: campaignData.description || '',

        // CRITICAL: Include objective from Strategy150 data
        objective: campaignData.objective || 'OUTCOME_LEADS',
        buyingType: campaignData.buyingType || 'AUCTION',
        budgetLevel: campaignData.budgetLevel || 'adset',
        specialAdCategories: campaignData.specialAdCategories || [],
        performanceGoal: campaignData.performanceGoal || 'maximize_conversions',
        conversionEvent: campaignData.conversionEvent || 'Lead',

        // Bid strategy and related fields
        bidStrategy: campaignData.bidStrategy,
        bidAmount: campaignData.bidAmount,
        costCap: campaignData.costCap,
        minRoas: campaignData.minRoas,

        // URL fields
        url: campaignData.url || '',
        urlType: (campaignData.urlType === 'lead_gen' || campaignData.urlType === 'call') ? campaignData.urlType : 'lead_gen',

        // Budget - send the appropriate one based on budgetType
        budgetType: campaignData.budgetType || 'daily',

        // Call to action
        callToAction: campaignData.callToAction || 'LEARN_MORE',

        // Required field for CampaignFormData
        conversionLocation: campaignData.conversionLocation || 'website',

        // Targeting in working format
        targeting: {
          locations: campaignData.targeting?.locations || { countries: ['US'] },
          ageMin: 18,
          ageMax: 65,
        },

        // Media
        mediaType: campaignData.mediaType || 'single_image',
        mediaFiles: campaignData.mediaFiles,
        image: campaignData.image,
        video: campaignData.video,
        images: campaignData.images,

        // Placements
        placements: {
          facebook: campaignData.placements?.facebook || ['feed'],
          instagram: campaignData.placements?.instagram || ['stream'],
          audience_network: campaignData.placements?.audienceNetwork || [],
          messenger: campaignData.placements?.messenger || []
        }
      };

      // Add budget based on type (make sure to get the actual values)
      if (campaignData.budgetType === 'lifetime') {
        workingCampaignData.lifetimeBudget = campaignData.lifetimeBudget || campaignData.adSetBudget?.lifetimeBudget || 350;
      } else {
        workingCampaignData.dailyBudget = campaignData.dailyBudget || campaignData.adSetBudget?.dailyBudget || 50;
      }

      // CRITICAL: Include adSetBudget with spendingLimits for ad set level controls
      workingCampaignData.adSetBudget = campaignData.adSetBudget;

      // Log to verify budget is being set
      console.log('💰 Budget configuration:', {
        budgetType: workingCampaignData.budgetType,
        dailyBudget: workingCampaignData.dailyBudget,
        lifetimeBudget: workingCampaignData.lifetimeBudget
      });

      // Remove any undefined fields before sending
      Object.keys(workingCampaignData).forEach(key => {
        if (workingCampaignData[key] === undefined) {
          delete workingCampaignData[key];
        }
      });

      console.log('\n📤 Sending Request to Backend...');
      console.log('🔗 Endpoint: /api/campaigns/strategy-150/create');
      console.log('📦 Payload size:', JSON.stringify(workingCampaignData).length, 'bytes');
      console.log('📊 Request data:', workingCampaignData);

      // Create FormData to handle file uploads properly
      const formData = new FormData();

      // Add all non-file fields to FormData
      Object.keys(workingCampaignData).forEach(key => {
        const value = workingCampaignData[key as keyof typeof workingCampaignData];

        if (key === 'media' || key === 'mediaFiles' || key === 'image') {
          // Skip file fields, we'll handle them separately
          return;
        }

        if (value === undefined || value === null) {
          return;
        }

        // Handle arrays and objects
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === 'object' && !(value instanceof File)) {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'dailyBudget' || key === 'lifetimeBudget') {
          // Keep budget values in dollars (backend will convert to cents)
          formData.append(key, String(Number(value)));
        } else {
          formData.append(key, String(value));
        }
      });

      // Handle media files based on mediaType
      if (workingCampaignData.mediaType === 'single_image' && workingCampaignData.image instanceof File) {
        formData.append('media', workingCampaignData.image);
      } else if (workingCampaignData.mediaType === 'single_video' && workingCampaignData.video instanceof File) {
        formData.append('media', workingCampaignData.video);
      } else if (workingCampaignData.mediaType === 'carousel' && workingCampaignData.images && Array.isArray(workingCampaignData.images)) {
        workingCampaignData.images.forEach((file: File) => {
          formData.append('media', file);
        });
      } else if (workingCampaignData.mediaFiles && Array.isArray(workingCampaignData.mediaFiles)) {
        // Fallback to mediaFiles if specific fields aren't set
        workingCampaignData.mediaFiles.forEach((file: File) => {
          formData.append('media', file);
        });
      }

      // Ensure special ad categories is properly formatted
      if (workingCampaignData.specialAdCategories) {
        const categories = Array.isArray(workingCampaignData.specialAdCategories)
          ? workingCampaignData.specialAdCategories
          : [workingCampaignData.specialAdCategories];
        formData.set('specialAdCategories', JSON.stringify(categories));
      }

      // Handle nested budget object - keep values in dollars
      if (workingCampaignData.adSetBudget) {
        const adSetBudget = {
          ...workingCampaignData.adSetBudget,
          dailyBudget: workingCampaignData.adSetBudget.dailyBudget ? workingCampaignData.adSetBudget.dailyBudget : undefined,
          lifetimeBudget: workingCampaignData.adSetBudget.lifetimeBudget ? workingCampaignData.adSetBudget.lifetimeBudget : undefined
        };
        formData.set('adSetBudget', JSON.stringify(adSetBudget));
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5002/api'}/campaigns/strategy-150/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          // Don't set Content-Type, let the browser set it with boundary for multipart
        },
        body: formData
      });

      const result = await response.json();

      console.log('📥 Response from working endpoint:', result);

      // Enhanced error logging (CampaignResponse only has 'error' field, not 'errors')
      if (result.error) {
        console.error('❌ Campaign creation error:', result.error);
      }

      if (result.success) {
        // Get resource details for display
        const accountName = result.data?.adAccount?.name || 'Unknown Account';
        const pageName = result.data?.page?.name || data.facebookPage || 'Unknown Page';
        const pixelId = data.pixel || 'No Pixel';

        // Enhanced message with creation details
        const enhancedMessage = `✅ Campaign created successfully!\n
📊 Account: ${accountName}
📱 Page: ${pageName}
🎯 Pixel: ${pixelId}`;

        // Transform CampaignResponse to Strategy150Response format
        const strategy150Result: Strategy150Response = {
          success: true,
          message: enhancedMessage,
          data: {
            phase: 'waiting', // Set to waiting since we'll capture Post ID next
            campaign: result.data?.campaign || {
              id: 'unknown',
              name: data.campaignName
            },
            adSet: result.data?.adSet || {
              id: 'unknown',
              name: `${data.campaignName} - Ad Set 1`
            },
            ads: result.data?.ads || [{
              id: 'unknown',
              name: `${data.campaignName} - Ad 1`
            }]
          }
        };

        console.log('📝 Transformed response:', strategy150Result);
        setCampaignResult(strategy150Result);

        // Check if fallback was used (fields were skipped)
        if (result.data?.adSet?._skippedFields) {
          setSkippedFields(result.data.adSet._skippedFields);
          setFallbackUsed(true);
          console.log('📢 Some fields were skipped for successful creation:', result.data.adSet._skippedFields);
        }

        setPhase('waiting');

        // Extract ad ID from the first ad for Post ID capture
        const adId = result.data?.ads?.[0]?.id;
        console.log('🎯 Extracted ad ID for Post ID capture:', adId);

        if (adId) {
          // Start automatic post ID capture with extracted ad ID
          setTimeout(() => {
            console.log('⏰ Starting Post ID capture for ad:', adId);
            handleAutoPostCapture(adId);
          }, 30000); // Wait 30 seconds before trying to fetch post ID
        } else {
          console.warn('⚠️ No ad ID found in response, switching to manual input');
          setPhase('manual');
        }
      } else {
        // Handle errors (CampaignResponse only has 'error' field)
        throw new Error(result.error || 'Failed to create campaign');
      }
    } catch (error: any) {
      console.error('\n❌ ========== STRATEGY 1-50-1 FAILED ==========');
      console.error('🔴 Phase 1 error:', error);
      console.error('📍 Error Type:', error.name);
      console.error('📍 Error Status:', error.response?.status);
      console.error('📍 Error URL:', error.config?.url);

      // Extract detailed error message
      let errorMessage = 'Unknown error occurred';

      if (error.response?.data?.errors) {
        // Validation errors from backend
        const validationErrors = error.response.data.errors;
        errorMessage = validationErrors.map((e: any) => e.msg || e.message).join(', ');
        console.error('📋 Validation errors:', validationErrors);
      } else if (error.response?.data?.error) {
        // General error message from backend
        errorMessage = error.response.data.error;
        console.error('📋 Backend error message:', errorMessage);

        // Check for specific Facebook errors
        if (errorMessage.includes('promoted_object') || errorMessage.includes('custom_event_type')) {
          console.error('🎯 Facebook API field validation error detected');
          console.error('💡 Suggestion: Backend should retry with safe mode automatically');
        }
      } else if (error.message) {
        errorMessage = error.message;
        console.error('📋 Client error message:', errorMessage);
      }

      console.error('📊 Full error object:', error);
      console.error('==========================================\n');

      setError(errorMessage);
      setPhase('error');
    }
  };

  const handleAutoPostCapture = async (adId?: string, retryCount = 0): Promise<void> => {
    if (!adId) {
      setPhase('manual');
      return;
    }

    console.log('Attempting auto post capture for ad:', adId, 'Retry:', retryCount);

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

      const response = await fetch(`/api/campaigns/strategy-150/post-id/${adId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Received non-JSON response, likely HTML error page');
        throw new Error('Invalid response format');
      }

      // Check if response is ok before parsing
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.postId) {
        setPostId(result.postId);
        setPhase('duplicating');
        setActiveStep(2);
      } else if (retryCount < 2) {
        // Retry with exponential backoff
        console.log('Post ID not ready yet, retrying in 5 seconds...');
        setTimeout(() => {
          handleAutoPostCapture(adId, retryCount + 1);
        }, 5000 * (retryCount + 1));
      } else {
        // Auto-capture failed after retries, switch to manual input
        console.log('Auto-capture failed after retries');
        setPhase('manual');
      }
    } catch (error: any) {
      console.error('Auto post capture error:', error);

      if (error.name === 'AbortError') {
        console.error('Request timed out after 45 seconds');
      }

      // Retry on network errors if we haven't exceeded retry count
      if (retryCount < 2 && (error.name === 'AbortError' || error.message === 'Invalid response format')) {
        console.log('Retrying due to network error...');
        setTimeout(() => {
          handleAutoPostCapture(adId, retryCount + 1);
        }, 3000);
      } else {
        setPhase('manual');
      }
    }
  };

  const handlePostIdCaptured = (capturedPostId: string) => {
    // Keep the original Facebook format with underscore
    setPostId(capturedPostId);
    setPhase('duplicating');
    setActiveStep(2);
  };

  const handleManualPostId = (manualPostId: string) => {
    // Keep the original Facebook format with underscore
    setPostId(manualPostId);
    setPhase('duplicating');
    setActiveStep(2);
  };

  const handleRetryPostCapture = () => {
    if (campaignResult?.data?.ads?.[0]?.id) {
      setPhase('waiting');
      handleAutoPostCapture(campaignResult.data.ads[0].id);
    }
  };

  const handleDuplicationCompleted = () => {
    setPhase('completed');
    setActiveStep(3);
  };

  const handleCreateNew = () => {
    setPhase('setup');
    setActiveStep(0);
    setFormData(null);
    setCampaignResult(null);
    setPostId('');
    setError('');
    setSkippedFields(null);
    setFallbackUsed(false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Strategy 1-50-1
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Create and manage your 1-campaign-50-adsets campaigns with advanced controls
          </Typography>

          {/* Tab Navigation */}
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            centered
            sx={{ mb: 4 }}
          >
            <Tab label="Create Campaign" value="create" />
            <Tab label="Manage Campaigns" value="manage" />
            <Tab label="Multiply Campaign" value="multiply" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 'create' ? (
          <>
            {/* Existing Campaign Creation Flow */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
                Create 1 campaign with 1 ad set and 1 ad, then duplicate into 49 additional ad sets using the same creative
              </Typography>

              <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Fallback Warning */}
            {fallbackUsed && skippedFields && (
              <Alert
                severity="warning"
                sx={{ mb: 3 }}
                action={
                  <Typography variant="caption" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
                    <a
                      href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${localStorage.getItem('fb_ad_account_id')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit' }}
                    >
                      Configure in Facebook
                    </a>
                  </Typography>
                }
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  Campaign created successfully with some optimizations disabled
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  The following fields were skipped to ensure successful campaign creation:
                </Typography>
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 3 }}>
                  {Object.keys(skippedFields).map(field => (
                    <li key={field}>
                      <Typography variant="caption">
                        <strong>{field}</strong>: You may need to set conversion tracking manually
                      </Typography>
                    </li>
                  ))}
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Your campaign was created successfully, but you may want to configure these settings in Facebook Ads Manager for optimal performance.
                </Typography>
              </Alert>
            )}

            {getPhaseComponent()}
          </>
        ) : activeTab === 'manage' ? (
          /* Campaign Management Tab */
          <CampaignManagementContainer />
        ) : activeTab === 'multiply' ? (
          /* Campaign Multiplication Tab */
          <MultiplyContainer />
        ) : null}

      </Paper>
    </Container>
  );
};

export default Strategy150Container;