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

      // Call the Strategy 1-50-1 dedicated API endpoint
      // Enhanced logging - log each field individually
      console.log('📤 Sending Strategy 1-50-1 campaign data:', campaignData);
      console.log('📊 Field-by-field validation check:');
      console.log('  ✓ campaignName:', campaignData.campaignName, typeof campaignData.campaignName);
      console.log('  ✓ objective:', campaignData.objective, typeof campaignData.objective);
      console.log('  ✓ primaryText:', campaignData.primaryText, typeof campaignData.primaryText);
      console.log('  ✓ headline:', campaignData.headline, typeof campaignData.headline);
      console.log('  ✓ description:', campaignData.description, typeof campaignData.description);
      console.log('  ✓ url:', campaignData.url, typeof campaignData.url);
      console.log('  ✓ urlType:', campaignData.urlType, typeof campaignData.urlType);
      console.log('  ✓ budgetType:', campaignData.budgetType, typeof campaignData.budgetType);
      console.log('  ✓ budgetLevel:', campaignData.budgetLevel, typeof campaignData.budgetLevel);
      console.log('  ✓ dailyBudget:', campaignData.dailyBudget, typeof campaignData.dailyBudget);
      console.log('  ✓ lifetimeBudget:', campaignData.lifetimeBudget, typeof campaignData.lifetimeBudget);
      console.log('  ✓ buyingType:', campaignData.buyingType, typeof campaignData.buyingType);
      console.log('  ✓ specialAdCategories:', campaignData.specialAdCategories, Array.isArray(campaignData.specialAdCategories));
      console.log('  ✓ performanceGoal:', campaignData.performanceGoal, typeof campaignData.performanceGoal);
      console.log('  ✓ conversionEvent:', campaignData.conversionEvent, typeof campaignData.conversionEvent);
      console.log('  ✓ bidStrategy:', campaignData.bidStrategy, typeof campaignData.bidStrategy);
      console.log('  ✓ targeting:', campaignData.targeting);
      console.log('  ✓ placementType:', campaignData.placementType, typeof campaignData.placementType);
      console.log('  ✓ facebookPage:', campaignData.facebookPage);
      console.log('  ✓ instagramAccount:', campaignData.instagramAccount);
      console.log('  ✓ pixel:', campaignData.pixel);
      console.log('  ✓ mediaType:', campaignData.mediaType, typeof campaignData.mediaType);
      console.log('  ✓ publishDirectly:', campaignData.publishDirectly, typeof campaignData.publishDirectly);

      // Check for undefined or null critical fields
      const criticalFields = ['campaignName', 'objective', 'primaryText', 'headline'];
      const missingFields = criticalFields.filter(field => !(campaignData as any)[field]);
      if (missingFields.length > 0) {
        console.warn('⚠️ Missing critical fields:', missingFields);
      }

      const response = await fetch('/api/campaigns/strategy-150/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(campaignData)
      });

      const result = await response.json();
      console.log('📥 Response:', response.status, result);

      // Enhanced error logging
      if (result.errors && Array.isArray(result.errors)) {
        console.error('❌ Validation errors detected:', result.errors.length, 'error(s)');
        result.errors.forEach((err: any, index: number) => {
          console.error(`  Error ${index + 1}:`, {
            field: err.path || err.param || 'unknown',
            message: err.msg || err.message || 'no message',
            value: err.value !== undefined ? err.value : 'undefined',
            location: err.location || 'body',
            type: err.type || 'unknown'
          });
        });
        // Also log the raw error for debugging
        console.error('  Raw error object:', JSON.stringify(result.errors, null, 2));
      }

      if (result.success) {
        // Transform response to Strategy150Response format
        const strategy150Result: Strategy150Response = {
          success: true,
          message: result.message || 'Campaign created successfully',
          data: {
            phase: result.data?.phase || 'waiting',
            campaign: result.data?.campaign || {
              id: result.data?.campaignId,
              name: data.campaignName
            },
            adSet: result.data?.adSet || {
              id: result.data?.adSetId,
              name: `${data.campaignName} - Ad Set 1`
            },
            ads: result.data?.ads || [{
              id: result.data?.adId,
              name: `${data.campaignName} - Ad 1`
            }]
          }
        };

        setCampaignResult(strategy150Result);
        setPhase('waiting');

        // Start automatic post ID capture
        setTimeout(() => {
          handleAutoPostCapture(result.data.adId);
        }, 30000); // Wait 30 seconds before trying to fetch post ID
      } else {
        // Handle validation errors
        if (result.errors && Array.isArray(result.errors)) {
          const errorMessages = result.errors.map((e: any) => e.msg || e.message || e).join('; ');
          throw new Error(`Validation failed: ${errorMessages}`);
        } else {
          throw new Error(result.error || 'Failed to create campaign');
        }
      }
    } catch (error) {
      console.error('Phase 1 error:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
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