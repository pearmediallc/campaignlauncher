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
        adSetBudget: data.adSetBudget || {
          dailyBudget: data.budgetType === 'daily' ? 50 : undefined,
          lifetimeBudget: data.budgetType === 'lifetime' ? 350 : undefined
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
      console.log('📤 Using working campaign creation flow');

      // Transform to match working CampaignForm structure
      // IMPORTANT: Only send fields that backend validates and expects
      const workingCampaignData: any = {
        // Required fields
        campaignName: campaignData.campaignName,
        primaryText: campaignData.primaryText,
        headline: campaignData.headline,
        description: campaignData.description || '',

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
        image: campaignData.image,

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

      console.log('📤 Sending to working endpoint:', workingCampaignData);

      // Use the working API method
      const { campaignApi } = await import('../../services/api');
      const result = await campaignApi.createCampaign(workingCampaignData);

      console.log('📥 Response from working endpoint:', result);

      // Enhanced error logging (CampaignResponse only has 'error' field, not 'errors')
      if (result.error) {
        console.error('❌ Campaign creation error:', result.error);
      }

      if (result.success) {
        // Transform CampaignResponse to Strategy150Response format
        const strategy150Result: Strategy150Response = {
          success: true,
          message: result.message || 'Campaign created successfully',
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
      console.error('Phase 1 error:', error);

      // Extract detailed error message
      let errorMessage = 'Unknown error occurred';
      if (error.response?.data?.errors) {
        // Validation errors from backend
        const validationErrors = error.response.data.errors;
        errorMessage = validationErrors.map((e: any) => e.msg || e.message).join(', ');
        console.error('Validation errors:', validationErrors);
      } else if (error.response?.data?.error) {
        // General error message
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setPhase('error');
    }
  };

  const handleAutoPostCapture = async (adId?: string) => {
    if (!adId) {
      setPhase('manual');
      return;
    }

    try {
      // Use existing post ID capture endpoint
      const response = await fetch(`/api/campaigns/post-id/${adId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success && result.postId) {
        setPostId(result.postId);
        setPhase('duplicating');
        setActiveStep(2);
      } else {
        // Auto-capture failed, switch to manual input
        setPhase('manual');
      }
    } catch (error) {
      console.error('Auto post capture error:', error);
      setPhase('manual');
    }
  };

  const handlePostIdCaptured = (capturedPostId: string) => {
    setPostId(capturedPostId);
    setPhase('duplicating');
    setActiveStep(2);
  };

  const handleManualPostId = (manualPostId: string) => {
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

            {getPhaseComponent()}
          </>
        ) : (
          /* Campaign Management Tab */
          <CampaignManagementContainer />
        )}

      </Paper>
    </Container>
  );
};

export default Strategy150Container;