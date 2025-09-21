import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import { CheckCircle, Schedule, Error as ErrorIcon, Refresh } from '@mui/icons-material';
import { Strategy150Response, Strategy150Phase } from '../../../types/strategy150';

interface Phase2PostCaptureProps {
  campaignResult: Strategy150Response | null;
  phase: Strategy150Phase;
  onPostIdCaptured: (postId: string) => void;
  onManualInput: (postId: string) => void;
  onRetry: () => void;
}

const Phase2PostCapture: React.FC<Phase2PostCaptureProps> = ({
  campaignResult,
  phase,
  onPostIdCaptured,
  onManualInput,
  onRetry
}) => {
  const [manualPostId, setManualPostId] = useState('');
  const [waitingTime, setWaitingTime] = useState(0);
  const [attemptCount, setAttemptCount] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    if (phase === 'waiting') {
      const interval = setInterval(() => {
        setWaitingTime(prev => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [phase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleManualSubmit = () => {
    if (!manualPostId.trim()) {
      setError('Please enter a valid Post ID');
      return;
    }

    // Basic validation for Facebook post ID format
    if (!/^\d+_\d+$/.test(manualPostId.trim())) {
      setError('Post ID should be in format: 123456789_987654321');
      return;
    }

    setError('');
    onManualInput(manualPostId.trim());
  };

  const handleVerifyPostId = async (postId: string) => {
    try {
      const response = await fetch(`/api/campaigns/strategy-150/verify-post/${postId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        return true;
      } else {
        setError('Post ID verification failed. Please check the ID and try again.');
        return false;
      }
    } catch (error) {
      console.error('Post ID verification error:', error);
      setError('Failed to verify Post ID. Please check your connection and try again.');
      return false;
    }
  };

  if (phase === 'creating') {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6" gutterBottom>
          Creating Initial Campaign...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Setting up your 1-1-1 campaign structure
        </Typography>
      </Box>
    );
  }

  if (phase === 'waiting') {
    return (
      <Box sx={{ py: 4 }}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CheckCircle color="success" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Campaign Created Successfully!
              </Typography>
            </Box>

            {campaignResult?.data && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Chip
                  label={`Campaign: ${campaignResult.data.campaign.name}`}
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={`Ad Set: ${campaignResult.data.adSet.name}`}
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={`Ads: ${campaignResult.data.ads.length}`}
                  variant="outlined"
                  size="small"
                />
              </Box>
            )}
          </CardContent>
        </Card>

        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Schedule sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Waiting for Post ID Collection
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Waiting for the ad to be fully processed by Facebook so we can capture the Post ID...
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Elapsed Time: {formatTime(waitingTime)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min((waitingTime / 60) * 100, 100)}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary">
              Attempting to fetch Post ID (Attempt {attemptCount}/2)
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={onRetry}
            disabled={waitingTime < 30}
          >
            Retry Now
          </Button>
        </Paper>
      </Box>
    );
  }

  if (phase === 'manual') {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Manual Post ID Required
          </Typography>
          <Typography variant="body2">
            We couldn't automatically capture the Post ID. Please manually enter it from Facebook Ads Manager.
          </Typography>
        </Alert>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            How to find your Post ID:
          </Typography>
          <Box component="ol" sx={{ mb: 3, pl: 2 }}>
            <li>Go to Facebook Ads Manager</li>
            <li>Find your newly created campaign: "{campaignResult?.data?.campaign.name}"</li>
            <li>Click on the ad to view its details</li>
            <li>Look for the "Post ID" in the ad preview or details section</li>
            <li>Copy the Post ID (format: 123456789_987654321)</li>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              label="Post ID"
              placeholder="123456789_987654321"
              value={manualPostId}
              onChange={(e) => setManualPostId(e.target.value)}
              error={!!error}
              helperText={error || 'Enter the Post ID from Facebook Ads Manager'}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              onClick={handleManualSubmit}
              disabled={!manualPostId.trim()}
              sx={{ mt: 1 }}
            >
              Verify & Continue
            </Button>
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={onRetry}
            >
              Try Auto-Capture Again
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Unexpected Phase
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Phase: {phase}
      </Typography>
    </Box>
  );
};

export default Phase2PostCapture;