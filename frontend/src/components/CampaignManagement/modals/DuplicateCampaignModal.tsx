import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Slider,
  InputAdornment,
  AlertTitle,
  Divider,
  Collapse,
  IconButton
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';

interface DuplicateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    name: string;
    daily_budget?: number;
    lifetime_budget?: number;
  } | null;
  onSuccess: () => void;
}

const DuplicateCampaignModal: React.FC<DuplicateCampaignModalProps> = ({
  open,
  onClose,
  campaign,
  onSuccess
}) => {
  const [newName, setNewName] = useState('');
  const [numberOfCopies, setNumberOfCopies] = useState(1);
  const [budgetMultiplier, setBudgetMultiplier] = useState(1);
  const [status, setStatus] = useState('PAUSED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicationResult, setDuplicationResult] = useState<any>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  React.useEffect(() => {
    if (campaign) {
      setNewName(`${campaign.name} - Copy`);
    }
  }, [campaign]);

  const handleDuplicate = async () => {
    if (!campaign) return;

    try {
      setLoading(true);
      setError('');
      setDuplicationResult(null);

      const response = await axios.post(`/api/campaigns/${campaign.id}/duplicate`, {
        new_name: newName,
        number_of_copies: numberOfCopies,
        budget_multiplier: budgetMultiplier,
        status
      });

      // Store the complete result for error display
      setDuplicationResult(response.data);

      if (response.data.success) {
        const message = numberOfCopies > 1
          ? `Successfully created ${response.data.copiesCreated} campaign copies`
          : 'Campaign duplicated successfully';
        toast.success(message);
        onSuccess();

        // Only close if there are no errors to show
        if (!response.data.errorDetails || response.data.errorDetails.length === 0) {
          onClose();
          // Reset form
          setNewName('');
          setNumberOfCopies(1);
          setBudgetMultiplier(1);
          setStatus('PAUSED');
        }
      } else if (response.data.requiresAttention) {
        // Partial success - show warning
        toast.warning(`Duplication completed with ${response.data.errorDetails?.length || 0} issues. Please review.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to duplicate campaign');
      toast.error('Failed to duplicate campaign');
    } finally {
      setLoading(false);
    }
  };

  const calculateNewBudget = () => {
    if (!campaign) return 0;
    const originalBudget = (campaign.daily_budget || campaign.lifetime_budget || 0) / 100;
    return (originalBudget * budgetMultiplier).toFixed(2);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Duplicate Campaign</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Display detailed error information if duplication had issues */}
        {duplicationResult && duplicationResult.errorDetails && duplicationResult.errorDetails.length > 0 && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="toggle error details"
                size="small"
                onClick={() => setShowErrorDetails(!showErrorDetails)}
              >
                {showErrorDetails ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            }
          >
            <AlertTitle>
              ⚠️ Duplication Completed with Issues
            </AlertTitle>

            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>{duplicationResult.copiesCreated || 0}</strong> of <strong>{duplicationResult.copiesRequested || 0}</strong> campaigns created
            </Typography>

            <Collapse in={showErrorDetails}>
              <Divider sx={{ my: 1 }} />

              {duplicationResult.errorDetails.map((errorDetail: any, index: number) => (
                <Box key={index} sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Campaign: {errorDetail.newCampaignName || errorDetail.campaignName || 'Unknown'}
                  </Typography>

                  {errorDetail.newCampaignId && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Campaign ID: {errorDetail.newCampaignId}
                    </Typography>
                  )}

                  {errorDetail.stats && (
                    <Box sx={{ mt: 1, mb: 1 }}>
                      <Typography variant="body2">
                        Created: <strong>{errorDetail.stats.adSetsCreated}/{errorDetail.stats.adSetsExpected}</strong> ad sets,
                        <strong> {errorDetail.stats.adsCreated}/{errorDetail.stats.adsExpected}</strong> ads
                      </Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="subtitle2" color="error" sx={{ mb: 1 }}>
                    Failed Items ({errorDetail.errors?.length || 0}):
                  </Typography>

                  {errorDetail.errors && errorDetail.errors.map((err: any, errIdx: number) => (
                    <Box key={errIdx} sx={{ ml: 2, mb: 1 }}>
                      <Typography variant="body2" color="error">
                        • {err.stage === 'ad_set_creation' ? 'Ad Set' : 'Ad'}: {err.name || `Item ${err.index}`}
                        {err.adSetId && ` (Ad Set ID: ${err.adSetId})`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 2, display: 'block' }}>
                        Reason: {err.message || err.details || 'Unknown error'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ))}

              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  The campaigns were created but some ad sets or ads failed.
                  You can try recreating the failed items manually or contact support if the issue persists.
                </Typography>
              </Alert>
            </Collapse>

            {!showErrorDetails && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Click to view details
              </Typography>
            )}
          </Alert>
        )}

        {!duplicationResult && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This will create a copy of the campaign with all its settings, ad sets, and ads.
          </Alert>
        )}

        <TextField
          fullWidth
          label="New Campaign Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          margin="normal"
          required
          helperText="Choose a unique name for the duplicate campaign"
        />

        {/* Number of copies selector */}
        <TextField
          fullWidth
          label="Number of Copies"
          type="number"
          value={numberOfCopies}
          onChange={(e) => setNumberOfCopies(Math.min(Math.max(parseInt(e.target.value) || 1, 1), 10))}
          margin="normal"
          InputProps={{
            inputProps: { min: 1, max: 10 },
            endAdornment: <InputAdornment position="end">copies</InputAdornment>
          }}
          helperText="Create 1-10 copies of this campaign (each will have a numbered suffix)"
        />

        <Box sx={{ mt: 3 }}>
          <Typography gutterBottom>
            Budget Multiplier: {budgetMultiplier}x
          </Typography>
          <Slider
            value={budgetMultiplier}
            onChange={(_, value) => setBudgetMultiplier(value as number)}
            min={0.5}
            max={3}
            step={0.1}
            marks={[
              { value: 0.5, label: '0.5x' },
              { value: 1, label: '1x' },
              { value: 2, label: '2x' },
              { value: 3, label: '3x' }
            ]}
            valueLabelDisplay="auto"
          />
          <Typography variant="caption" color="text.secondary">
            New budget will be: ${calculateNewBudget()}
          </Typography>
        </Box>

        <FormControl fullWidth margin="normal" sx={{ mt: 3 }}>
          <InputLabel>Initial Status</InputLabel>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            label="Initial Status"
          >
            <MenuItem value="PAUSED">Paused (Recommended)</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
          </Select>
        </FormControl>

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="caption">
            {numberOfCopies > 1
              ? `All ${numberOfCopies} duplicates will be created in ${status} status. Each copy will have a numbered suffix added to the name.`
              : `The duplicate will be created in ${status} status to allow you to review before activating.`}
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {duplicationResult?.errorDetails?.length > 0 ? 'Close' : 'Cancel'}
        </Button>
        {!duplicationResult && (
          <Button
            onClick={handleDuplicate}
            variant="contained"
            color="success"
            disabled={loading || !newName.trim()}
          >
            {numberOfCopies > 1 ? `Create ${numberOfCopies} Duplicates` : 'Create Duplicate'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DuplicateCampaignModal;