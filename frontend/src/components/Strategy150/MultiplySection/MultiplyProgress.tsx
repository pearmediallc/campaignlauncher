import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as PendingIcon,
  Error as ErrorIcon,
  Campaign as CampaignIcon,
  Timer as TimerIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface MultiplyProgressProps {
  totalCampaigns: number;
  currentProgress?: {
    progress: number;
    total: number;
    percentComplete: number;
    currentOperation: string;
    elapsedSeconds: number;
    remainingSeconds: number;
    campaigns: Array<any>;
    errors: Array<{
      copyNumber: number;
      error: string;
    }>;
    status: string;
  };
  jobId?: string | null;
  estimatedSeconds?: number;
}

const MultiplyProgress: React.FC<MultiplyProgressProps> = ({
  totalCampaigns,
  currentProgress,
  jobId,
  estimatedSeconds
}) => {
  const progress = currentProgress || {
    progress: 0,
    total: totalCampaigns,
    percentComplete: 0,
    currentOperation: 'Initializing multiplication process...',
    elapsedSeconds: 0,
    remainingSeconds: estimatedSeconds || 0,
    campaigns: [],
    errors: [],
    status: 'started'
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusIcon = (index: number) => {
    if (index < progress.progress) {
      return <CheckIcon color="success" />;
    } else if (index === progress.progress) {
      return <CircularProgress size={20} />;
    } else {
      return <PendingIcon color="disabled" />;
    }
  };

  const getStatusText = (index: number) => {
    if (index < progress.progress) {
      return 'Completed';
    } else if (index === progress.progress) {
      return 'In Progress';
    } else {
      return 'Pending';
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Multiplying Campaign
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Overall Progress
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{ flexGrow: 1, mr: 2 }}>
              <LinearProgress
                variant="determinate"
                value={progress.percentComplete}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Typography variant="body2" color="textSecondary">
              {progress.percentComplete}%
            </Typography>
          </Box>
          <Typography variant="body2" color="textSecondary">
            {progress.progress} of {progress.total} campaigns completed
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Current Operation:</strong> {progress.currentOperation}
          </Typography>
        </Alert>

        <Typography variant="subtitle2" gutterBottom>
          Campaign Multiplication Status:
        </Typography>

        <List>
          {Array.from({ length: totalCampaigns }, (_, index) => {
            const campaignNumber = index + 1;
            const completedCampaign = progress.campaigns[index];
            const hasError = progress.errors.find(e => e.copyNumber === campaignNumber);

            return (
              <ListItem key={index}>
                <ListItemIcon>
                  {hasError ? (
                    <ErrorIcon color="error" />
                  ) : (
                    getStatusIcon(index)
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>
                        Campaign Copy {campaignNumber}
                      </Typography>
                      {completedCampaign && (
                        <Chip
                          label={completedCampaign.status === 'success' ? 'Success' : 'Failed'}
                          color={completedCampaign.status === 'success' ? 'success' : 'error'}
                          size="small"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    completedCampaign ? (
                      <>
                        {completedCampaign.campaign?.name}
                        {completedCampaign.campaign?.id && (
                          <Typography variant="caption" display="block">
                            ID: {completedCampaign.campaign?.id}
                          </Typography>
                        )}
                      </>
                    ) : hasError ? (
                      <Typography variant="caption" color="error">
                        Error: {hasError.error}
                      </Typography>
                    ) : (
                      getStatusText(index)
                    )
                  }
                />
              </ListItem>
            );
          })}
        </List>

        {progress.errors.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              {progress.errors.length} campaign(s) failed to multiply. You can retry these individually later.
            </Typography>
          </Alert>
        )}
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimerIcon color="action" />
          <Typography variant="body2" color="textSecondary">
            Elapsed: {formatTime(progress.elapsedSeconds)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimerIcon color="action" />
          <Typography variant="body2" color="textSecondary">
            Remaining: {formatTime(progress.remainingSeconds)}
          </Typography>
        </Box>
      </Box>

      <Alert severity="info">
        <Typography variant="body2">
          This process may take several minutes depending on the number of campaigns being created.
          Each campaign includes 50 ad sets and their corresponding ads.
        </Typography>
      </Alert>
    </Box>
  );
};

export default MultiplyProgress;