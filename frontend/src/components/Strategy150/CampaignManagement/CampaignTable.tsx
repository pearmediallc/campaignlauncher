import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Checkbox,
  Button,
  Menu,
  MenuItem,
  LinearProgress
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  MoreVert,
  TrendingUp,
  TrendingDown,
  Remove
} from '@mui/icons-material';
import { CampaignListItem } from '../../../types/campaignManagement';

interface CampaignTableProps {
  campaigns: CampaignListItem[];
  loading: boolean;
  selectedCampaigns: string[];
  onSelectCampaign: (campaignId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onUpdateStatus: (campaignId: string, status: 'ACTIVE' | 'PAUSED') => void;
  onBulkAction: (action: 'pause' | 'resume', campaignIds: string[]) => void;
}

type SortField = 'name' | 'status' | 'totalSpend' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'conversions' | 'roas' | 'createdDate';
type SortDirection = 'asc' | 'desc';

const CampaignTable: React.FC<CampaignTableProps> = ({
  campaigns,
  loading,
  selectedCampaigns,
  onSelectCampaign,
  onSelectAll,
  onUpdateStatus,
  onBulkAction
}) => {
  const [sortField, setSortField] = useState<SortField>('createdDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; campaignId: string } | null>(null);

  const handleSort = (field: SortField) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'PAUSED': return 'warning';
      case 'ARCHIVED': return 'default';
      case 'DRAFT': return 'info';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (number: number) => {
    return number.toLocaleString('en-US');
  };

  const formatPercentage = (number: number) => {
    return `${number.toFixed(2)}%`;
  };

  const isAllSelected = campaigns.length > 0 && selectedCampaigns.length === campaigns.length;
  const isPartiallySelected = selectedCampaigns.length > 0 && selectedCampaigns.length < campaigns.length;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, campaignId: string) => {
    setMenuAnchor({ element: event.currentTarget, campaignId });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const getTrendIcon = (value: number, benchmark: number) => {
    if (value > benchmark) return <TrendingUp color="success" fontSize="small" />;
    if (value < benchmark) return <TrendingDown color="error" fontSize="small" />;
    return <Remove color="disabled" fontSize="small" />;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
          Loading campaigns...
        </Typography>
      </Box>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No campaigns found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first Strategy 1-50-1 campaign to see it here.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {selectedCampaigns.length > 0 && (
        <Box sx={{ p: 2, bgcolor: 'action.selected', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">
            {selectedCampaigns.length} campaign(s) selected
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PlayArrow />}
            onClick={() => onBulkAction('resume', selectedCampaigns)}
          >
            Resume
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Pause />}
            onClick={() => onBulkAction('pause', selectedCampaigns)}
          >
            Pause
          </Button>
        </Box>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={isPartiallySelected}
                  checked={isAllSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortDirection : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  Campaign
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'status'}
                  direction={sortField === 'status' ? sortDirection : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Ad Sets</TableCell>
              <TableCell align="center">Learning Phase</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'totalSpend'}
                  direction={sortField === 'totalSpend' ? sortDirection : 'asc'}
                  onClick={() => handleSort('totalSpend')}
                >
                  Spend
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'impressions'}
                  direction={sortField === 'impressions' ? sortDirection : 'asc'}
                  onClick={() => handleSort('impressions')}
                >
                  Impressions
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'clicks'}
                  direction={sortField === 'clicks' ? sortDirection : 'asc'}
                  onClick={() => handleSort('clicks')}
                >
                  Clicks
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'ctr'}
                  direction={sortField === 'ctr' ? sortDirection : 'asc'}
                  onClick={() => handleSort('ctr')}
                >
                  CTR
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'cpc'}
                  direction={sortField === 'cpc' ? sortDirection : 'asc'}
                  onClick={() => handleSort('cpc')}
                >
                  CPC
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'conversions'}
                  direction={sortField === 'conversions' ? sortDirection : 'asc'}
                  onClick={() => handleSort('conversions')}
                >
                  Conversions
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'roas'}
                  direction={sortField === 'roas' ? sortDirection : 'asc'}
                  onClick={() => handleSort('roas')}
                >
                  ROAS
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedCampaigns.map((campaign) => (
              <TableRow key={campaign.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedCampaigns.includes(campaign.id)}
                    onChange={() => onSelectCampaign(campaign.id)}
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {campaign.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Created: {new Date(campaign.createdDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={campaign.status}
                    color={getStatusColor(campaign.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2">
                    {formatNumber(campaign.adSetsCount)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {campaign.duplicatedAdSets && (() => {
                    const learningCount = campaign.duplicatedAdSets.filter(a => a.learningStatus === 'LEARNING').length;
                    const activeCount = campaign.duplicatedAdSets.filter(a => a.learningStatus === 'SUCCESS').length;
                    const limitedCount = campaign.duplicatedAdSets.filter(a => a.learningStatus === 'FAIL').length;

                    return (
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {learningCount > 0 && (
                          <Chip
                            label={`${learningCount} Learning`}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                        {activeCount > 0 && (
                          <Chip
                            label={`${activeCount} Active`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                        {limitedCount > 0 && (
                          <Chip
                            label={`${limitedCount} Limited`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        )}
                        {learningCount === 0 && activeCount === 0 && limitedCount === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            No data
                          </Typography>
                        )}
                      </Box>
                    );
                  })()}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(campaign.totalSpend)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Typography variant="body2">
                      {formatNumber(campaign.impressions)}
                    </Typography>
                    {getTrendIcon(campaign.impressions, 100000)}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Typography variant="body2">
                      {formatNumber(campaign.clicks)}
                    </Typography>
                    {getTrendIcon(campaign.clicks, 2000)}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Typography variant="body2">
                      {formatPercentage(campaign.ctr)}
                    </Typography>
                    {getTrendIcon(campaign.ctr, 2.5)}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Typography variant="body2">
                      {formatCurrency(campaign.cpc)}
                    </Typography>
                    {getTrendIcon(1 / campaign.cpc, 3)}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Typography variant="body2">
                      {formatNumber(campaign.conversions)}
                    </Typography>
                    {getTrendIcon(campaign.conversions, 100)}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {campaign.roas.toFixed(1)}x
                    </Typography>
                    {getTrendIcon(campaign.roas, 3.0)}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {campaign.status === 'ACTIVE' ? (
                      <Tooltip title="Pause Campaign">
                        <IconButton
                          size="small"
                          onClick={() => onUpdateStatus(campaign.id, 'PAUSED')}
                          color="warning"
                        >
                          <Pause fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Resume Campaign">
                        <IconButton
                          size="small"
                          onClick={() => onUpdateStatus(campaign.id, 'ACTIVE')}
                          color="success"
                        >
                          <PlayArrow fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="More Actions">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, campaign.id)}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>View Details</MenuItem>
        <MenuItem onClick={handleMenuClose}>Edit Budget</MenuItem>
        <MenuItem onClick={handleMenuClose}>Duplicate Campaign</MenuItem>
        <MenuItem onClick={handleMenuClose}>Archive</MenuItem>
      </Menu>
    </Box>
  );
};

export default CampaignTable;