import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Edit as EditIcon,
  ContentCopy as DuplicateIcon,
  AttachMoney as BudgetIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import EditCampaignModal from './modals/EditCampaignModal';
import DuplicateCampaignModal from './modals/DuplicateCampaignModal';
import BudgetManagementModal from './modals/BudgetManagementModal';
import axios from 'axios';
import { toast } from 'react-toastify';

interface CampaignActionsProps {
  campaign: {
    id: string;
    name: string;
    status: string;
    daily_budget?: number;
    lifetime_budget?: number;
    bid_amount?: number;
  };
  onRefresh: () => void;
  variant?: 'icons' | 'buttons' | 'menu';
}

const CampaignActions: React.FC<CampaignActionsProps> = ({
  campaign,
  onRefresh,
  variant = 'icons'
}) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);

  const handlePauseResume = async () => {
    try {
      setLoading(true);
      const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

      const response = await axios.put(`/api/campaigns/${campaign.id}/edit`, {
        status: newStatus
      });

      if (response.data.success) {
        toast.success(`Campaign ${newStatus === 'ACTIVE' ? 'activated' : 'paused'} successfully`);
        onRefresh();
      }
    } catch (error: any) {
      toast.error(`Failed to ${campaign.status === 'ACTIVE' ? 'pause' : 'activate'} campaign`);
    } finally {
      setLoading(false);
      setAnchorEl(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.put(`/api/campaigns/${campaign.id}/edit`, {
        status: 'DELETED'
      });

      if (response.data.success) {
        toast.success('Campaign deleted successfully');
        onRefresh();
      }
    } catch (error: any) {
      toast.error('Failed to delete campaign');
    } finally {
      setLoading(false);
      setAnchorEl(null);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  if (variant === 'menu') {
    return (
      <>
        <IconButton onClick={handleMenuOpen} disabled={loading}>
          <MoreIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => { setEditModalOpen(true); handleMenuClose(); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Edit Campaign</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setDuplicateModalOpen(true); handleMenuClose(); }}>
            <ListItemIcon><DuplicateIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Duplicate</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setBudgetModalOpen(true); handleMenuClose(); }}>
            <ListItemIcon><BudgetIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Manage Budget</ListItemText>
          </MenuItem>
          <MenuItem onClick={handlePauseResume}>
            <ListItemIcon>
              {campaign.status === 'ACTIVE' ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{campaign.status === 'ACTIVE' ? 'Pause' : 'Activate'}</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDelete}>
            <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>

        {/* Modals */}
        <EditCampaignModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          campaign={campaign}
          onSuccess={onRefresh}
        />
        <DuplicateCampaignModal
          open={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          campaign={campaign}
          onSuccess={onRefresh}
        />
        <BudgetManagementModal
          open={budgetModalOpen}
          onClose={() => setBudgetModalOpen(false)}
          campaign={campaign}
          onSuccess={onRefresh}
        />
      </>
    );
  }

  if (variant === 'buttons') {
    return (
      <Box>
        <ButtonGroup size="small" variant="outlined">
          <Button startIcon={<EditIcon />} onClick={() => setEditModalOpen(true)}>
            Edit
          </Button>
          <Button startIcon={<DuplicateIcon />} onClick={() => setDuplicateModalOpen(true)}>
            Duplicate
          </Button>
          <Button startIcon={<BudgetIcon />} onClick={() => setBudgetModalOpen(true)}>
            Budget
          </Button>
          <Button
            startIcon={campaign.status === 'ACTIVE' ? <PauseIcon /> : <PlayIcon />}
            onClick={handlePauseResume}
          >
            {campaign.status === 'ACTIVE' ? 'Pause' : 'Activate'}
          </Button>
        </ButtonGroup>

        {/* Modals */}
        <EditCampaignModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          campaign={campaign}
          onSuccess={onRefresh}
        />
        <DuplicateCampaignModal
          open={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          campaign={campaign}
          onSuccess={onRefresh}
        />
        <BudgetManagementModal
          open={budgetModalOpen}
          onClose={() => setBudgetModalOpen(false)}
          campaign={campaign}
          onSuccess={onRefresh}
        />
      </Box>
    );
  }

  // Default: icons variant
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Tooltip title="Edit Campaign">
        <IconButton size="small" onClick={() => setEditModalOpen(true)} disabled={loading}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Duplicate Campaign">
        <IconButton size="small" onClick={() => setDuplicateModalOpen(true)} disabled={loading}>
          <DuplicateIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Manage Budget">
        <IconButton size="small" onClick={() => setBudgetModalOpen(true)} disabled={loading}>
          <BudgetIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={campaign.status === 'ACTIVE' ? 'Pause Campaign' : 'Activate Campaign'}>
        <IconButton size="small" onClick={handlePauseResume} disabled={loading}>
          {campaign.status === 'ACTIVE' ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      {/* Modals */}
      <EditCampaignModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        campaign={campaign}
        onSuccess={onRefresh}
      />
      <DuplicateCampaignModal
        open={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        campaign={campaign}
        onSuccess={onRefresh}
      />
      <BudgetManagementModal
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        campaign={campaign}
        onSuccess={onRefresh}
      />
    </Box>
  );
};

export default CampaignActions;