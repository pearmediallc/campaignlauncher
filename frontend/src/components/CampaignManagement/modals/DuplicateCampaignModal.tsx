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
  InputAdornment
} from '@mui/material';
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

      const response = await axios.post(`/api/campaigns/${campaign.id}/duplicate`, {
        new_name: newName,
        number_of_copies: numberOfCopies,
        budget_multiplier: budgetMultiplier,
        status
      });

      if (response.data.success) {
        const message = numberOfCopies > 1
          ? `Successfully created ${response.data.copiesCreated} campaign copies`
          : 'Campaign duplicated successfully';
        toast.success(message);
        onSuccess();
        onClose();
        // Reset form
        setNewName('');
        setNumberOfCopies(1);
        setBudgetMultiplier(1);
        setStatus('PAUSED');
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Duplicate Campaign</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 2 }}>
          This will create a copy of the campaign with all its settings, ad sets, and ads.
        </Alert>

        <TextField
          fullWidth
          label="New Campaign Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          margin="normal"
          required
          helperText="Choose a unique name for the duplicate campaign"
        />

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
          Cancel
        </Button>
        <Button
          onClick={handleDuplicate}
          variant="contained"
          color="success"
          disabled={loading || !newName.trim()}
        >
          {numberOfCopies > 1 ? `Create ${numberOfCopies} Duplicates` : 'Create Duplicate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DuplicateCampaignModal;