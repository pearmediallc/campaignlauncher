import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Divider
} from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';

interface BudgetManagementModalProps {
  open: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    name: string;
    daily_budget?: number;
    lifetime_budget?: number;
    bid_amount?: number;
  } | null;
  onSuccess: () => void;
}

const BudgetManagementModal: React.FC<BudgetManagementModalProps> = ({
  open,
  onClose,
  campaign,
  onSuccess
}) => {
  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [dailyBudget, setDailyBudget] = useState('');
  const [lifetimeBudget, setLifetimeBudget] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (campaign) {
      if (campaign.daily_budget) {
        setBudgetType('daily');
        setDailyBudget((campaign.daily_budget / 100).toString());
      } else if (campaign.lifetime_budget) {
        setBudgetType('lifetime');
        setLifetimeBudget((campaign.lifetime_budget / 100).toString());
      }
      if (campaign.bid_amount) {
        setBidAmount((campaign.bid_amount / 100).toString());
      }
    }
  }, [campaign]);

  const handleSave = async () => {
    if (!campaign) return;

    try {
      setLoading(true);
      setError('');

      const updateData: any = {};

      if (budgetType === 'daily' && dailyBudget) {
        updateData.daily_budget = parseFloat(dailyBudget);
        updateData.lifetime_budget = null; // Clear lifetime budget
      } else if (budgetType === 'lifetime' && lifetimeBudget) {
        updateData.lifetime_budget = parseFloat(lifetimeBudget);
        updateData.daily_budget = null; // Clear daily budget
      }

      if (bidAmount) {
        updateData.bid_amount = parseFloat(bidAmount);
      }

      const response = await axios.put(`/api/campaigns/${campaign.id}/budget`, updateData);

      if (response.data.success) {
        toast.success('Budget updated successfully');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update budget');
      toast.error('Failed to update budget');
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyFromLifetime = () => {
    if (lifetimeBudget) {
      const daily = parseFloat(lifetimeBudget) / 30; // Assume 30-day campaign
      return daily.toFixed(2);
    }
    return '0';
  };

  const calculateLifetimeFromDaily = () => {
    if (dailyBudget) {
      const lifetime = parseFloat(dailyBudget) * 30; // Assume 30-day campaign
      return lifetime.toFixed(2);
    }
    return '0';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manage Campaign Budget</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Budget Type
        </Typography>
        <ToggleButtonGroup
          value={budgetType}
          exclusive
          onChange={(_, value) => value && setBudgetType(value)}
          fullWidth
          sx={{ mb: 3 }}
        >
          <ToggleButton value="daily">Daily Budget</ToggleButton>
          <ToggleButton value="lifetime">Lifetime Budget</ToggleButton>
        </ToggleButtonGroup>

        {budgetType === 'daily' ? (
          <Box>
            <TextField
              fullWidth
              label="Daily Budget"
              type="number"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ min: 1, step: 0.01 }}
              helperText={`Estimated monthly spend: $${(parseFloat(dailyBudget || '0') * 30).toFixed(2)}`}
            />
          </Box>
        ) : (
          <Box>
            <TextField
              fullWidth
              label="Lifetime Budget"
              type="number"
              value={lifetimeBudget}
              onChange={(e) => setLifetimeBudget(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ min: 1, step: 0.01 }}
              helperText={`Estimated daily spend: $${calculateDailyFromLifetime()}`}
            />
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" gutterBottom>
          Bid Strategy (Optional)
        </Typography>
        <TextField
          fullWidth
          label="Max Bid Amount"
          type="number"
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          inputProps={{ min: 0.01, step: 0.01 }}
          helperText="Leave empty to use automatic bidding"
        />

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="caption">
            <strong>Tips:</strong>
            <br />• Daily budgets reset every day at midnight
            <br />• Lifetime budgets spread evenly over campaign duration
            <br />• Facebook may spend up to 25% more on high-performing days
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={loading || (!dailyBudget && !lifetimeBudget)}
        >
          Update Budget
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BudgetManagementModal;