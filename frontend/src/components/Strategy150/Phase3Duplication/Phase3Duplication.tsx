import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon, ContentCopy } from '@mui/icons-material';
import { Strategy150Response, Strategy150FormData, DuplicationProgress } from '../../../types/strategy150';

interface Phase3DuplicationProps {
  campaignResult: Strategy150Response | null;
  postId: string;
  formData: Strategy150FormData | null;
  onCompleted: () => void;
}

const Phase3Duplication: React.FC<Phase3DuplicationProps> = ({
  campaignResult,
  postId,
  formData,
  onCompleted
}) => {
  const [progress, setProgress] = useState<DuplicationProgress>({
    completed: 0,
    total: 49,
    currentOperation: 'Starting duplication process...',
    adSets: [],
    errors: []
  });

  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // Start duplication if we have campaign result and form data
    // Post ID is optional - backend will fetch it automatically if missing
    if (campaignResult && formData) {
      startDuplication();
    }
  }, [campaignResult, formData]); // Removed postId dependency

  const startDuplication = async () => {
    try {
      const response = await fetch('/api/campaigns/strategy-150/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          campaignId: campaignResult?.data?.campaign.id,
          originalAdSetId: campaignResult?.data?.adSet.id,
          postId: postId,
          formData: formData,
          count: 49
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start duplication process');
      }

      // Start polling for progress
      pollProgress();
    } catch (error) {
      console.error('Duplication start error:', error);
      setProgress(prev => ({
        ...prev,
        currentOperation: 'Error starting duplication process',
        errors: [...prev.errors, { adSetIndex: -1, error: error instanceof Error ? error.message : 'Unknown error' }]
      }));
    }
  };

  const pollProgress = async () => {
    try {
      const response = await fetch(`/api/campaigns/strategy-150/progress/${campaignResult?.data?.campaign.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const progressData: DuplicationProgress = await response.json();
        setProgress(progressData);

        if (progressData.completed >= progressData.total) {
          setIsCompleted(true);
          setTimeout(() => {
            onCompleted();
          }, 2000);
        } else {
          // Continue polling
          setTimeout(pollProgress, 2000);
        }
      } else {
        throw new Error('Failed to fetch progress');
      }
    } catch (error) {
      console.error('Progress polling error:', error);
      // Retry after delay
      setTimeout(pollProgress, 5000);
    }
  };

  const progressPercentage = (progress.completed / progress.total) * 100;

  return (
    <Box sx={{ py: 4 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ContentCopy color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">
              Duplicating Ad Sets (1-49-1)
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip
              label={`Using Post ID: ${postId}`}
              variant="outlined"
              size="small"
            />
            <Chip
              label={`Original Campaign: ${campaignResult?.data?.campaign.name}`}
              variant="outlined"
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">
              Progress: {progress.completed} / {progress.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progressPercentage.toFixed(1)}%
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{ height: 12, borderRadius: 6, mb: 2 }}
          />

          <Typography variant="body2" color="text.secondary">
            {progress.currentOperation}
          </Typography>
        </Box>

        {progress.errors.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              {progress.errors.length} Error(s) Encountered
            </Typography>
            {progress.errors.slice(0, 3).map((error, index) => (
              <Typography key={index} variant="body2">
                Ad Set {error.adSetIndex}: {error.error}
              </Typography>
            ))}
            {progress.errors.length > 3 && (
              <Typography variant="body2">
                ...and {progress.errors.length - 3} more errors
              </Typography>
            )}
          </Alert>
        )}

        {progress.adSets.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Created Ad Sets ({progress.adSets.length})
            </Typography>
            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
              {progress.adSets.slice(-5).map((adSet, index) => (
                <ListItem key={adSet.id}>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={adSet.name}
                    secondary={`ID: ${adSet.id}`}
                  />
                </ListItem>
              ))}
              {progress.adSets.length > 5 && (
                <ListItem>
                  <ListItemText
                    primary={`...and ${progress.adSets.length - 5} more ad sets`}
                    sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                  />
                </ListItem>
              )}
            </List>
          </Box>
        )}

        {isCompleted && (
          <Alert severity="success" sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              🎉 Duplication Complete!
            </Typography>
            <Typography variant="body2">
              Successfully created {progress.completed} ad sets using the same creative.
              {progress.errors.length > 0 && ` ${progress.errors.length} ad sets had errors and may need manual review.`}
            </Typography>
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default Phase3Duplication;