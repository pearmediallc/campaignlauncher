import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Divider,
  Alert,
  AlertTitle,
  Chip
} from '@mui/material';
import { WarningAmber, CheckCircle } from '@mui/icons-material';
import { Strategy150FormData } from '../../types/strategy150';

interface ConfirmationDialogProps {
  open: boolean;
  formData: Strategy150FormData | null;
  selectedAdAccount?: { id: string; name: string } | null;
  selectedPage?: { id: string; name: string } | null;
  selectedPixel?: { id: string; name: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  formData,
  selectedAdAccount,
  selectedPage,
  selectedPixel,
  onConfirm,
  onCancel
}) => {
  if (!formData) return null;

  // Calculate budget details
  const initialBudget = formData.budgetLevel === 'campaign'
    ? (formData.campaignBudget?.dailyBudget || 0)
    : (formData.adSetBudget?.dailyBudget || 0);

  const duplicationBudget = 49 * 1; // 49 ad sets @ $1 each
  const totalDailySpend = initialBudget + duplicationBudget;

  // Format objective for display
  const formatObjective = (obj: string) => {
    const map: Record<string, string> = {
      'OUTCOME_LEADS': 'Lead Generation',
      'OUTCOME_SALES': 'Sales/Conversions',
      'PHONE_CALL': 'Phone Calls'
    };
    return map[obj] || obj;
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningAmber color="warning" fontSize="large" />
          <Typography variant="h6">Confirm Campaign Creation</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Campaign Details */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
            📋 CAMPAIGN DETAILS
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Campaign Name</Typography>
              <Typography variant="body2" fontWeight={600}>
                {formData.campaignName || '(Unnamed Campaign)'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Objective</Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatObjective(formData.objective)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Conversion Event</Typography>
              <Typography variant="body2" fontWeight={600}>
                {formData.conversionEvent}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Attribution</Typography>
              <Typography variant="body2" fontWeight={600}>
                {formData.attributionSetting}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Budget Breakdown - CRITICAL SECTION */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'warning.light' }}>
          <Typography variant="subtitle2" color="error" gutterBottom fontWeight={600}>
            💰 BUDGET BREAKDOWN
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Chip
              label={formData.budgetLevel === 'campaign' ? 'Campaign Budget Optimization (CBO)' : 'Ad Set Level Budget'}
              color={formData.budgetLevel === 'campaign' ? 'primary' : 'secondary'}
              sx={{ mb: 1 }}
            />

            {formData.budgetLevel === 'campaign' ? (
              <>
                <Typography variant="body2">
                  Daily Budget: <strong>${formData.campaignBudget?.dailyBudget || 0}</strong>
                </Typography>
                {formData.campaignBudget?.lifetimeBudget && (
                  <Typography variant="body2">
                    Lifetime Budget: <strong>${formData.campaignBudget.lifetimeBudget}</strong>
                  </Typography>
                )}
              </>
            ) : (
              <>
                <Typography variant="body2">
                  Daily Budget per Ad Set: <strong>${formData.adSetBudget?.dailyBudget || 0}</strong>
                </Typography>
                {formData.adSetBudget?.lifetimeBudget && (
                  <Typography variant="body2">
                    Lifetime Budget per Ad Set: <strong>${formData.adSetBudget.lifetimeBudget}</strong>
                  </Typography>
                )}
              </>
            )}
          </Box>

          <Divider sx={{ my: 1 }} />

          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            Strategy 1-50-1 Breakdown:
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            • Phase 1 (Initial): 1 Ad Set @ ${initialBudget}/day
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            • Phase 2 (After Post ID): 49 Ad Sets @ $1/day each
          </Typography>

          <Box sx={{ p: 2, bgcolor: 'error.main', color: 'white', borderRadius: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              TOTAL DAILY SPEND: ${totalDailySpend}/day
            </Typography>
            <Typography variant="caption">
              Estimated Monthly: ${totalDailySpend * 30}/month
            </Typography>
          </Box>
        </Paper>

        {/* Account & Resources */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
            🏢 ACCOUNT & RESOURCES
          </Typography>
          <Typography variant="body2">
            Ad Account: <strong>{selectedAdAccount?.name || 'Not selected'}</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedAdAccount?.id}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Facebook Page: <strong>{selectedPage?.name || 'Not selected'}</strong>
          </Typography>
          {formData.pixel && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Pixel: <strong>{selectedPixel?.name || formData.pixel}</strong>
            </Typography>
          )}
        </Paper>

        {/* Targeting Summary */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
            🎯 TARGETING
          </Typography>
          <Typography variant="body2">
            Countries: <strong>{formData.targeting?.locations?.countries?.join(', ') || 'Not set'}</strong>
          </Typography>
          <Typography variant="body2">
            Age Range: <strong>{formData.targeting?.ageMin} - {formData.targeting?.ageMax}</strong>
          </Typography>
          <Typography variant="body2">
            Gender: <strong>{formData.targeting?.genders?.join(', ') || 'All'}</strong>
          </Typography>
        </Paper>

        {/* Warning Alert */}
        <Alert severity="error">
          <AlertTitle>⚠️ IMPORTANT - READ CAREFULLY</AlertTitle>
          <Typography variant="body2" component="div">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>This will immediately charge your ad account</li>
              <li>Campaign will go live once approved by Facebook</li>
              <li>Make sure ALL details above are correct</li>
              <li>Budget shown is DAILY spend, not total</li>
            </ul>
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onCancel} variant="outlined" size="large">
          Cancel - Let Me Review
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          size="large"
          color="primary"
          startIcon={<CheckCircle />}
        >
          I Confirm - Create Campaign
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
