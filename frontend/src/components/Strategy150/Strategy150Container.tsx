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

      // Map Strategy150FormData to existing CampaignFormData format
      const campaignData = {
        // Basic campaign data
        campaignName: data.campaignName,
        primaryText: data.primaryText,
        headline: data.headline,
        description: data.description,
        url: data.url,
        callToAction: data.callToAction,
        displayLink: data.displayLink,

        // Media data
        mediaType: data.mediaType,
        image: data.image,
        video: data.video,
        images: data.images,

        // Facebook resources
        facebookPage: data.facebookPage,
        pixel: data.pixel,

        // Strategy 1-50-1 specific
        strategy: '1-50-1',
        publishDirectly: data.publishDirectly,

        // Ad set budget (for the initial ad set)
        budgetType: data.budgetType,
        dailyBudget: data.budgetType === 'daily' ? 1 : undefined, // $1 default for duplication
        lifetimeBudget: data.budgetType === 'lifetime' ? 7 : undefined, // $7 default for duplication

        // Meta API compliance fields
        buyingType: data.buyingType,
        objective: data.objective,
        budgetLevel: data.budgetLevel,
        specialAdCategories: data.specialAdCategories,
        performanceGoal: data.performanceGoal,
        conversionEvent: data.conversionEvent,
        attributionSetting: data.attributionSetting,
        attributionWindow: data.attributionWindow,
        bidStrategy: data.bidStrategy,
        costCap: data.costCap,
        minRoas: data.minRoas
      };

      // Call the existing campaign creation API
      const response = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(campaignData)
      });

      const result = await response.json();

      if (result.success) {
        // Transform response to Strategy150Response format
        const strategy150Result: Strategy150Response = {
          success: true,
          message: 'Campaign created successfully',
          data: {
            phase: 'waiting',
            campaign: {
              id: result.data.campaignId,
              name: data.campaignName
            },
            adSet: {
              id: result.data.adSetId,
              name: `${data.campaignName} - Ad Set 1`
            },
            ads: [{
              id: result.data.adId,
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
        throw new Error(result.error || 'Failed to create campaign');
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