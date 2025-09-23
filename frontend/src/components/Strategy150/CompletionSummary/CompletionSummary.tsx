import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CheckCircle,
  Campaign,
  AdsClick,
  Share,
  Add,
  OpenInNew,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { Strategy150Response } from '../../../types/strategy150';
import MultiplyContainer from '../MultiplySection/MultiplyContainer';

interface CompletionSummaryProps {
  campaignResult: Strategy150Response | null;
  postId: string;
  onCreateNew: () => void;
}

const CompletionSummary: React.FC<CompletionSummaryProps> = ({
  campaignResult,
  postId,
  onCreateNew
}) => {
  const [showMultiplyDialog, setShowMultiplyDialog] = useState(false);

  // Store campaign data in session storage for multiplication
  useEffect(() => {
    if (campaignResult?.data?.campaign?.id && postId) {
      sessionStorage.setItem('lastCreatedCampaign', JSON.stringify({
        campaignId: campaignResult.data.campaign.id,
        postId: postId,
        timestamp: Date.now()
      }));
    }
  }, [campaignResult, postId]);

  const handleOpenFacebookAdsManager = () => {
    const url = `https://www.facebook.com/adsmanager/manage/campaigns?act=${campaignResult?.data?.campaign.id}`;
    window.open(url, '_blank');
  };

  const handleOpenMultiply = () => {
    setShowMultiplyDialog(true);
  };

  const handleCloseMultiply = () => {
    setShowMultiplyDialog(false);
  };

  const handleMultiplyComplete = () => {
    setShowMultiplyDialog(false);
    // Optionally refresh or show a success message
  };

  const totalAdSets = campaignResult?.data?.duplicatedAdSets ?
    1 + campaignResult.data.duplicatedAdSets.length : 50;

  return (
    <Box sx={{ py: 4 }}>
      {/* Success Header */}
      <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)', color: 'white' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircle sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            🎉 Strategy 1-50-1 Complete!
          </Typography>
          <Typography variant="h6">
            Your campaign has been successfully created and duplicated
          </Typography>
        </CardContent>
      </Card>

      {/* Campaign Summary */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Campaign sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Campaign Created
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {campaignResult?.data?.campaign.name}
              </Typography>
              <Chip
                label={`ID: ${campaignResult?.data?.campaign.id}`}
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AdsClick sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Ad Sets Created
              </Typography>
              <Typography variant="h3" color="primary.main" gutterBottom>
                {totalAdSets}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                1 original + 49 duplicates
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Share sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Post ID Used
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                All ad sets share the same creative
              </Typography>
              <Chip
                label={postId}
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Campaign Details */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Campaign Details
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Initial Campaign (1-1-1)"
              secondary={`Campaign: ${campaignResult?.data?.campaign.name}`}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Original Ad Set"
              secondary={`Ad Set: ${campaignResult?.data?.adSet.name}`}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Creative Post Created"
              secondary={`Post ID: ${postId} (used across all ad sets)`}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Ad Sets Duplicated"
              secondary={`49 additional ad sets created with "Use Existing Post" setting`}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <CheckCircle color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Strategy 1-50-1 Complete"
              secondary="All ad sets now use the same approved creative for consistent messaging"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Next Steps */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Next Steps
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <List>
          <ListItem>
            <ListItemText
              primary="1. Review in Facebook Ads Manager"
              secondary="Check all ad sets and make any necessary adjustments"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="2. Set Campaign Status"
              secondary="Change from 'Paused' to 'Active' when ready to launch"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="3. Monitor Performance"
              secondary="Track which ad sets perform best and optimize accordingly"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="4. Scale Successful Ad Sets"
              secondary="Increase budgets on top-performing ad sets"
            />
          </ListItem>
        </List>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<OpenInNew />}
          onClick={handleOpenFacebookAdsManager}
          sx={{ minWidth: 200 }}
        >
          Open Ads Manager
        </Button>

        <Button
          variant="contained"
          size="large"
          color="secondary"
          startIcon={<CopyIcon />}
          onClick={handleOpenMultiply}
          sx={{ minWidth: 200 }}
        >
          Multiply Campaign
        </Button>

        <Button
          variant="outlined"
          size="large"
          startIcon={<Add />}
          onClick={onCreateNew}
          sx={{ minWidth: 200 }}
        >
          Create New Strategy
        </Button>
      </Box>

      {/* Tips */}
      <Paper sx={{ p: 3, mt: 4, backgroundColor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          💡 Pro Tips for Strategy 1-50-1
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="• Use different audience targeting for each ad set to test various demographics" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Gradually increase budgets on ad sets showing strong performance" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Monitor frequency to avoid ad fatigue across your audience" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Consider A/B testing different placements on top-performing ad sets" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Use this strategy for lead generation campaigns with proven creative" />
          </ListItem>
        </List>
      </Paper>

      {/* Multiplication Dialog */}
      <Dialog
        open={showMultiplyDialog}
        onClose={handleCloseMultiply}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CopyIcon sx={{ mr: 2 }} />
            Multiply Campaign
          </Box>
        </DialogTitle>
        <DialogContent>
          <MultiplyContainer
            initialCampaignId={campaignResult?.data?.campaign?.id}
            initialPostId={postId}
            onComplete={handleMultiplyComplete}
            standalone={false}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMultiply}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompletionSummary;