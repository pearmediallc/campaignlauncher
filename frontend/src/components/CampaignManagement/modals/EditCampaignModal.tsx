import React, { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';

interface EditCampaignModalProps {
  open: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    name: string;
    status: string;
    daily_budget?: number;
    lifetime_budget?: number;
  } | null;
  onSuccess: () => void;
}

const EditCampaignModal: React.FC<EditCampaignModalProps> = ({
  open,
  onClose,
  campaign,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [dailyBudget, setDailyBudget] = useState('');
  const [lifetimeBudget, setLifetimeBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setStatus(campaign.status);
      setDailyBudget(campaign.daily_budget ? (campaign.daily_budget / 100).toString() : '');
      setLifetimeBudget(campaign.lifetime_budget ? (campaign.lifetime_budget / 100).toString() : '');
    }
  }, [campaign]);

  const handleSave = async () => {
    if (!campaign) return;

    try {
      setLoading(true);
      setError('');

      const updateData: any = {};
      if (name !== campaign.name) updateData.name = name;
      if (status !== campaign.status) updateData.status = status;
      if (dailyBudget && parseFloat(dailyBudget) !== (campaign.daily_budget || 0) / 100) {
        updateData.daily_budget = parseFloat(dailyBudget);
      }
      if (lifetimeBudget && parseFloat(lifetimeBudget) !== (campaign.lifetime_budget || 0) / 100) {
        updateData.lifetime_budget = parseFloat(lifetimeBudget);
      }

      const response = await axios.put(`/api/campaigns/${campaign.id}/edit`, updateData);

      if (response.data.success) {
        toast.success('Campaign updated successfully');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update campaign');
      toast.error('Failed to update campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Campaign</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Campaign Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="normal"
          required
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>Status</InputLabel>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            label="Status"
          >
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="PAUSED">Paused</MenuItem>
            <MenuItem value="DELETED">Deleted</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <TextField
            fullWidth
            label="Daily Budget ($)"
            type="number"
            value={dailyBudget}
            onChange={(e) => setDailyBudget(e.target.value)}
            inputProps={{ min: 1, step: 0.01 }}
            helperText="Leave empty to keep current"
          />

          <TextField
            fullWidth
            label="Lifetime Budget ($)"
            type="number"
            value={lifetimeBudget}
            onChange={(e) => setLifetimeBudget(e.target.value)}
            inputProps={{ min: 1, step: 0.01 }}
            helperText="Leave empty to keep current"
          />
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Note: Only non-empty fields will be updated
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !name.trim()}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditCampaignModal;