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
  Campaign as CampaignIcon
} from '@mui/icons-material';

interface MultiplyProgressProps {
  totalCampaigns: number;
  currentProgress?: {
    current: number;
    total: number;
    percentage: number;
    currentOperation: string;
    completedCampaigns: Array<{
      id: string;
      name: string;
      status: 'success' | 'failed';
    }>;
    errors: Array<{
      campaign: number;
      message: string;
    }>;
  };
}

const MultiplyProgress: React.FC<MultiplyProgressProps> = ({
  totalCampaigns,
  currentProgress
}) => {
  const progress = currentProgress || {
    current: 0,
    total: totalCampaigns,
    percentage: 0,
    currentOperation: 'Initializing multiplication process...',
    completedCampaigns: [],
    errors: []
  };

  const getStatusIcon = (index: number) => {
    if (index < progress.current) {
      return <CheckIcon color="success" />;
    } else if (index === progress.current) {
      return <CircularProgress size={20} />;
    } else {
      return <PendingIcon color="disabled" />;
    }
  };

  const getStatusText = (index: number) => {
    if (index < progress.current) {
      return 'Completed';
    } else if (index === progress.current) {
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
                value={progress.percentage}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Typography variant="body2" color="textSecondary">
              {progress.percentage}%
            </Typography>
          </Box>
          <Typography variant="body2" color="textSecondary">
            {progress.current} of {progress.total} campaigns completed
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
            const completedCampaign = progress.completedCampaigns[index];
            const hasError = progress.errors.find(e => e.campaign === campaignNumber);

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
                        {completedCampaign.name}
                        {completedCampaign.id && (
                          <Typography variant="caption" display="block">
                            ID: {completedCampaign.id}
                          </Typography>
                        )}
                      </>
                    ) : hasError ? (
                      <Typography variant="caption" color="error">
                        Error: {hasError.message}
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