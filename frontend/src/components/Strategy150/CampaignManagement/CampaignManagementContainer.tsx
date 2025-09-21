import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert as MuiAlert
} from '@mui/material';
import {
  Search,
  Refresh,
  FilterList,
  DateRange
} from '@mui/icons-material';
import { useCampaignManagement } from '../../../hooks/useCampaignManagement';
import CampaignTable from './CampaignTable';
import PerformanceMetrics from './PerformanceMetrics';

const CampaignManagementContainer: React.FC = () => {
  const {
    campaigns,
    metrics,
    loading,
    error,
    updateCampaignStatus,
    bulkUpdateStatus,
    refetch
  } = useCampaignManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedCampaigns(selected ? filteredCampaigns.map(c => c.id) : []);
  };

  const handleUpdateStatus = async (campaignId: string, status: 'ACTIVE' | 'PAUSED') => {
    try {
      await updateCampaignStatus(campaignId, status);
      setSnackbar({
        open: true,
        message: `Campaign ${status.toLowerCase()} successfully`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update campaign status',
        severity: 'error'
      });
    }
  };

  const handleBulkAction = async (action: 'pause' | 'resume', campaignIds: string[]) => {
    try {
      const status = action === 'pause' ? 'PAUSED' : 'ACTIVE';
      await bulkUpdateStatus(campaignIds, status);
      setSelectedCampaigns([]);
      setSnackbar({
        open: true,
        message: `${campaignIds.length} campaign(s) ${action}d successfully`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to ${action} campaigns`,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const activeCount = filteredCampaigns.filter(c => c.status === 'ACTIVE').length;
  const pausedCount = filteredCampaigns.filter(c => c.status === 'PAUSED').length;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom align="center">
          Campaign Management
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3 }}>
          Monitor and manage your Strategy 1-50-1 campaigns
        </Typography>
      </Box>

      <PerformanceMetrics metrics={metrics} loading={loading} />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">
            Campaigns ({filteredCampaigns.length})
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              label={`${activeCount} Active`}
              color="success"
              size="small"
              variant={statusFilter === 'ACTIVE' ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'all' : 'ACTIVE')}
              clickable
            />
            <Chip
              label={`${pausedCount} Paused`}
              color="warning"
              size="small"
              variant={statusFilter === 'PAUSED' ? 'filled' : 'outlined'}
              onClick={() => setStatusFilter(statusFilter === 'PAUSED' ? 'all' : 'PAUSED')}
              clickable
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={refetch}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              )
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status Filter</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status Filter"
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="PAUSED">Paused</MenuItem>
              <MenuItem value="ARCHIVED">Archived</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<DateRange />}
            size="small"
          >
            Date Range
          </Button>

          <Button
            variant="outlined"
            startIcon={<FilterList />}
            size="small"
          >
            More Filters
          </Button>
        </Box>

        <CampaignTable
          campaigns={filteredCampaigns}
          loading={loading}
          selectedCampaigns={selectedCampaigns}
          onSelectCampaign={handleSelectCampaign}
          onSelectAll={handleSelectAll}
          onUpdateStatus={handleUpdateStatus}
          onBulkAction={handleBulkAction}
        />
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MuiAlert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>

      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <MuiAlert severity="error" variant="filled">
            {error}
          </MuiAlert>
        </Snackbar>
      )}
    </Box>
  );
};

export default CampaignManagementContainer;