import React from 'react';
import {
  Box,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { FormProvider, useForm } from 'react-hook-form';
import { Strategy150FormData } from '../../../types/strategy150';
import CampaignSection from './CampaignSection';
import AdSetSection from './AdSetSection';
import AdSection from './AdSection';


interface Phase1SetupProps {
  onSubmit: (data: Strategy150FormData) => void;
  error?: string;
}

const Phase1Setup: React.FC<Phase1SetupProps> = ({ onSubmit, error }) => {
  const methods = useForm<Strategy150FormData>({
    defaultValues: {
      // Campaign Level Defaults
      campaignName: '',
      buyingType: 'AUCTION',
      objective: 'OUTCOME_LEADS',
      budgetLevel: 'adset',
      specialAdCategories: [],
      campaignBudgetOptimization: false,
      bidStrategy: 'LOWEST_COST_WITHOUT_CAP',

      // Campaign Budget
      campaignBudget: {
        dailyBudget: 50,
        lifetimeBudget: undefined
      },

      // Ad Set Level Defaults
      performanceGoal: 'maximize_conversions',
      pixel: '',
      conversionEvent: 'Lead',
      attributionSetting: 'standard',
      attributionWindow: '1_day',

      // Ad Set Budget & Schedule
      adSetBudget: {
        dailyBudget: 50,
        lifetimeBudget: undefined,
        scheduleType: 'run_continuously',
        spendingLimits: {}
      },

      // Ad Level Defaults
      facebookPage: '',
      urlType: 'website',
      url: '',
      headline: '',
      description: '',
      primaryText: '',
      mediaType: 'single_image',
      callToAction: 'LEARN_MORE',
      publishDirectly: false,

      // Enhanced Targeting
      targeting: {
        locations: {
          countries: ['US']
        },
        ageMin: 18,
        ageMax: 65,
        genders: ['all']
      },

      // Placements
      placementType: 'automatic',
      placements: {
        facebook: ['feed', 'stories'],
        instagram: ['stream', 'stories'],
        audienceNetwork: ['classic'],
        messenger: [],
        devices: ['mobile', 'desktop'],
        platforms: ['all']
      },

      // Duplication Settings
      duplicationSettings: {
        defaultBudgetPerAdSet: 1,
        budgetDistributionType: 'equal'
      },

      // Budget type for consistency
      budgetType: 'daily'
    }
  });

  const handleFormSubmit = methods.handleSubmit((data: Strategy150FormData) => {
    // Process form data
    // Process and submit form data
    onSubmit(data);
  });

  // Form sections for better organization
  const formSections = [
    { label: 'Campaign', component: 'campaign' },
    { label: 'Ad Set', component: 'adset' },
    { label: 'Ad Creative', component: 'ad' }
  ];

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={handleFormSubmit}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Optional: Add stepper for visual progress */}
        <Stepper activeStep={-1} sx={{ mb: 4 }}>
          {formSections.map((section) => (
            <Step key={section.label} completed>
              <StepLabel>{section.label} Configuration</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Campaign Section */}
        <CampaignSection />

        {/* Ad Set Section */}
        <AdSetSection />

        {/* Ad Section */}
        <AdSection />

        {/* Submit Button */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            sx={{ minWidth: 300, py: 1.5 }}
            color="primary"
          >
            Create Initial Campaign (1-1-1)
          </Button>
        </Box>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mt: 3 }}>
          After creating the initial campaign, you'll be able to capture the Post ID and duplicate it into 49 additional ad sets with $1 budget each.
        </Alert>
      </Box>
    </FormProvider>
  );
};

export default Phase1Setup;