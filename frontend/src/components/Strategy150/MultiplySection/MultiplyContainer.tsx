import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Divider,
  Tooltip,
  IconButton,
  Chip
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import CampaignIdInput from './CampaignIdInput';
import MultiplyProgress from './MultiplyProgress';
import MultiplyResults from './MultiplyResults';
import api from '../../../services/api';

interface MultiplyContainerProps {
  initialCampaignId?: string;
  initialPostId?: string;
  onComplete?: () => void;
  standalone?: boolean;
}

const MultiplyContainer: React.FC<MultiplyContainerProps> = ({
  initialCampaignId,
  initialPostId,
  onComplete,
  standalone = true
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form data
  const [campaignId, setCampaignId] = useState(initialCampaignId || '');
  const [postId, setPostId] = useState(initialPostId || '');
  const [multiplyCount, setMultiplyCount] = useState(1);
  const [manualInput, setManualInput] = useState(!initialCampaignId);

  // Results
  const [multiplicationResults, setMultiplicationResults] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);

  // Auto-populate from session storage if available
  useEffect(() => {
    if (!initialCampaignId) {
      const storedData = sessionStorage.getItem('lastCreatedCampaign');
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          // Only use if created within last hour
          if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
            setCampaignId(parsed.campaignId || '');
            setPostId(parsed.postId || '');
            setManualInput(false);
          }
        } catch (e) {
          console.error('Failed to parse stored campaign data:', e);
        }
      }
    }
  }, [initialCampaignId]);

  const steps = ['Campaign Selection', 'Multiplication Settings', 'Processing', 'Results'];

  const handleMultiply = async () => {
    if (!campaignId) {
      setError('Please provide a campaign ID');
      return;
    }

    if (multiplyCount < 1 || multiplyCount > 9) {
      setError('Multiply count must be between 1 and 9');
      return;
    }

    setLoading(true);
    setError(null);
    setActiveStep(2);

    try {
      const response = await api.post('/campaigns/strategy-150/multiply', {
        sourceCampaignId: campaignId,
        sourcePostId: postId || undefined,
        multiplyCount,
        manualInput
      });

      if (response.data.success) {
        setMultiplicationResults(response.data.data);
        setActiveStep(3);
        setSuccess(true);

        // Clear session storage after successful multiplication
        sessionStorage.removeItem('lastCreatedCampaign');

        if (onComplete) {
          onComplete();
        }
      } else {
        throw new Error(response.data.error || 'Multiplication failed');
      }
    } catch (err: any) {
      console.error('Multiplication error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to multiply campaign');
      setActiveStep(1); // Go back to settings
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setCampaignId('');
    setPostId('');
    setMultiplyCount(1);
    setMultiplicationResults(null);
    setError(null);
    setSuccess(false);
    setManualInput(true);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Campaign to Multiply
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Enter the campaign ID of a Strategy 1-50-1 campaign you want to multiply
            </Typography>

            {!manualInput && campaignId && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Auto-populated from your last created campaign. You can modify if needed.
              </Alert>
            )}

            <CampaignIdInput
              campaignId={campaignId}
              postId={postId}
              onCampaignIdChange={setCampaignId}
              onPostIdChange={setPostId}
              onValidationComplete={(isValid) => {
                if (isValid && campaignId) {
                  setActiveStep(1);
                }
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="contained"
                onClick={() => setActiveStep(1)}
                disabled={!campaignId}
              >
                Next
              </Button>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Multiplication Settings
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Campaign to multiply:</strong> {campaignId}
                  </Typography>
                  {postId && (
                    <Typography variant="body2">
                      <strong>Post ID:</strong> {postId}
                    </Typography>
                  )}
                </Alert>
              </Box>

              <Box sx={{ maxWidth: 400 }}>
                <FormControl fullWidth>
                  <InputLabel>Number of Copies</InputLabel>
                  <Select
                    value={multiplyCount}
                    onChange={(e) => setMultiplyCount(Number(e.target.value))}
                    label="Number of Copies"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <MenuItem key={num} value={num}>
                        {num} {num === 1 ? 'Copy' : 'Copies'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Alert severity="warning">
                  <Typography variant="body2">
                    This will create {multiplyCount} complete {multiplyCount === 1 ? 'copy' : 'copies'} of the campaign,
                    each with 50 ad sets and ads. All campaigns will be created in PAUSED state for safety.
                  </Typography>
                </Alert>
              </Box>

              {error && (
                <Box>
                  <Alert severity="error">{error}</Alert>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button onClick={() => setActiveStep(0)}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleMultiply}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CopyIcon />}
              >
                {loading ? 'Processing...' : `Create ${multiplyCount} ${multiplyCount === 1 ? 'Copy' : 'Copies'}`}
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <MultiplyProgress
            totalCampaigns={multiplyCount}
            currentProgress={progressData}
          />
        );

      case 3:
        return (
          <Box>
            <MultiplyResults
              results={multiplicationResults}
              onNewMultiplication={handleReset}
            />
            {standalone && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={handleReset}
                  startIcon={<RefreshIcon />}
                >
                  Multiply Another Campaign
                </Button>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent>
        {standalone && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <CopyIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
              <Box>
                <Typography variant="h5">
                  Multiply Campaign
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Clone your Strategy 1-50-1 campaigns at scale
                </Typography>
              </Box>
            </Box>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Divider sx={{ mb: 3 }} />
          </>
        )}

        {renderStepContent()}
      </CardContent>
    </Card>
  );
};

export default MultiplyContainer;