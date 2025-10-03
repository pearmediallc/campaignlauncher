import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Typography,
  CircularProgress
} from '@mui/material';
import { FormProvider, useForm } from 'react-hook-form';
import { Strategy150FormData } from '../../../types/strategy150';
import CampaignSection from './CampaignSection';
import AdSetSection from './AdSetSection';
import AdSection from './AdSection';
import TemplateManager from '../../Templates/TemplateManager';
import { TemplateData, templateApi } from '../../../services/templateApi';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { useFacebookResources } from '../../../hooks/useFacebookResources';


interface Phase1SetupProps {
  onSubmit: (data: Strategy150FormData) => void;
  error?: string;
}

const Phase1Setup: React.FC<Phase1SetupProps> = ({ onSubmit, error }) => {
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<Strategy150FormData | null>(null);
  const { resources } = useFacebookResources();

  // System default values (fallback if no user template)
  const systemDefaults: Strategy150FormData = {
    // Campaign Level Defaults
    campaignName: '',
    buyingType: 'AUCTION',
    objective: 'OUTCOME_SALES',
    budgetLevel: 'campaign',
    specialAdCategories: [],
    campaignBudgetOptimization: true,
    bidStrategy: 'LOWEST_COST_WITHOUT_CAP',

    // Campaign Budget
    campaignBudget: {
      dailyBudget: 50,
      lifetimeBudget: undefined
    },

    // Ad Set Level Defaults
    performanceGoal: 'maximize_conversions',
    pixel: '',
    conversionEvent: 'Purchase',
    attributionSetting: '1_day_click_1_day_view',
    attributionWindow: '1_day',

    // Ad Set Budget & Schedule
    adSetBudget: {
      dailyBudget: 50,
      lifetimeBudget: undefined,
      scheduleType: 'run_continuously',
      spendingLimits: {
        enabled: false,
        valueType: 'percentage',
        dailyMin: undefined,
        dailyMax: undefined,
        lifetimeMin: undefined,
        lifetimeMax: undefined
      }
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
  };

  const methods = useForm<Strategy150FormData>({
    defaultValues: systemDefaults
  });

  // Load user's default template on mount
  useEffect(() => {
    const loadUserDefaultTemplate = async () => {
      try {
        setLoadingTemplate(true);
        const defaultTemplate = await templateApi.getDefaultTemplate();

        if (defaultTemplate && defaultTemplate.templateData) {
          // Deep merge: system defaults → user template
          const mergedDefaults = deepMerge(systemDefaults, defaultTemplate.templateData);

          // Apply merged defaults to form
          methods.reset(mergedDefaults);
        } else {
          // No default template, use system defaults
          methods.reset(systemDefaults);
        }
      } catch (error) {
        console.log('No default template found or error loading, using system defaults');
        methods.reset(systemDefaults);
      } finally {
        setLoadingTemplate(false);
      }
    };

    loadUserDefaultTemplate();
  }, []);

  // Deep merge function for nested objects
  const deepMerge = (target: any, source: any): any => {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }

    return output;
  };

  const isObject = (item: any): boolean => {
    return item && typeof item === 'object' && !Array.isArray(item);
  };

  const handleFormSubmit = methods.handleSubmit((data: Strategy150FormData) => {
    // Show confirmation dialog before submitting
    setPendingFormData(data);
    setConfirmDialogOpen(true);
  });

  const handleConfirmSubmit = () => {
    // User confirmed - proceed with campaign creation
    setConfirmDialogOpen(false);
    if (pendingFormData) {
      onSubmit(pendingFormData);
    }
  };

  const handleCancelSubmit = () => {
    // User cancelled - close dialog and let them review
    setConfirmDialogOpen(false);
    setPendingFormData(null);
  };

  // Template management handlers
  const handleLoadTemplate = (templateData: TemplateData) => {
    // Load template data into form
    Object.keys(templateData).forEach((key) => {
      const value = templateData[key as keyof TemplateData];
      if (value !== undefined && value !== null) {
        methods.setValue(key as keyof Strategy150FormData, value);
      }
    });
  };

  const handleClearForm = () => {
    methods.reset();
  };

  // Form sections for better organization
  const formSections = [
    { label: 'Campaign', component: 'campaign' },
    { label: 'Ad Set', component: 'adset' },
    { label: 'Ad Creative', component: 'ad' }
  ];

  // Show loading state while fetching default template
  if (loadingTemplate) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading your default template...
        </Typography>
      </Box>
    );
  }

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={handleFormSubmit}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Template Manager Section */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            📑 Campaign Templates
          </Typography>
          <TemplateManager
            formData={methods.getValues()}
            onLoadTemplate={handleLoadTemplate}
            onClearForm={handleClearForm}
          />
        </Paper>

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

        {/* Budget Confirmation Dialog */}
        <ConfirmationDialog
          open={confirmDialogOpen}
          formData={pendingFormData}
          selectedAdAccount={resources.selectedAdAccount}
          selectedPage={resources.selectedPage}
          selectedPixel={resources.selectedPixel}
          onConfirm={handleConfirmSubmit}
          onCancel={handleCancelSubmit}
        />
      </Box>
    </FormProvider>
  );
};

export default Phase1Setup;