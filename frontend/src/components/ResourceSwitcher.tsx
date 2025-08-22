import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Chip,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  ListItemIcon,
  ListItemText,
  Alert,
  Paper,
  Avatar,
  Stack
} from '@mui/material';
import {
  SwapHoriz,
  Business,
  Campaign,
  Pages,
  Code,
  History,
  Star,
  Settings,
  Check,
  KeyboardArrowDown,
  AccountBox
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import resourceApi, { ResourceConfig, ResourcePreset } from '../services/resourceApi';
import { facebookAuthApi } from '../services/api';
import { cacheFetch } from '../utils/debounce';

interface ResourceSwitcherProps {
  onResourceSwitch?: (config: ResourceConfig) => void;
}

const ResourceSwitcher: React.FC<ResourceSwitcherProps> = ({ onResourceSwitch }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<ResourceConfig | null>(null);
  const [recentConfigs, setRecentConfigs] = useState<ResourcePreset[]>([]);
  const [resourceNames, setResourceNames] = useState<{
    adAccount?: string;
    page?: string;
    pixel?: string;
    business?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      setLoading(true);
      
      // Get current configuration with caching
      const currentResponse = await cacheFetch(
        'resource-current',
        () => resourceApi.getCurrentResources(),
        3000
      );
      if (currentResponse.success) {
        setCurrentConfig(currentResponse.data);
        
        // If it's from original selection, load resource names
        if (currentResponse.source === 'original' || currentResponse.source === 'switched') {
          await loadResourceNames(currentResponse.data);
        }
      }
      
      // Load recent configurations with caching
      const recentResponse = await cacheFetch(
        'resource-recent-3',
        () => resourceApi.getRecentConfigs(3),
        3000
      );
      if (recentResponse.success) {
        setRecentConfigs(recentResponse.data);
      }
    } catch (error: any) {
      console.error('Failed to load current config:', error);
      // Don't show error if user is not authenticated yet
      if (error.response?.status !== 401) {
        setError('Failed to load resource configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadResourceNames = async (config: ResourceConfig) => {
    try {
      // Fetch all resources to get names
      const resourcesResponse = await facebookAuthApi.getResources();
      if (resourcesResponse.success) {
        const { adAccounts, pages, pixels } = resourcesResponse.data;
        
        const names: any = {};
        if (config.adAccountId) {
          const adAccount = adAccounts?.find((acc: any) => acc.id === config.adAccountId);
          names.adAccount = adAccount?.name || config.adAccountId;
        }
        if (config.pageId) {
          const page = pages?.find((p: any) => p.id === config.pageId);
          names.page = page?.name || config.pageId;
        }
        if (config.pixelId) {
          const pixel = pixels?.find((p: any) => p.id === config.pixelId);
          names.pixel = pixel?.name || config.pixelId;
        }
        
        setResourceNames(names);
      }
    } catch (error) {
      console.error('Failed to load resource names:', error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSwitch = async (config: ResourceConfig) => {
    try {
      setLoading(true);
      handleClose();
      
      const response = await resourceApi.switchResources(config);
      if (response.success) {
        setCurrentConfig(response.data);
        toast.success('Resources switched successfully');
        
        // Notify parent component
        if (onResourceSwitch) {
          onResourceSwitch(response.data);
        }
        
        // Reload recent configs
        const recentResponse = await resourceApi.getRecentConfigs(3);
        if (recentResponse.success) {
          setRecentConfigs(recentResponse.data);
        }
        
        // Reload page to refresh all components with new resources
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Failed to switch resources:', error);
      toast.error(error.response?.data?.message || 'Failed to switch resources');
    } finally {
      setLoading(false);
    }
  };

  const handleManageResources = () => {
    handleClose();
    // Navigate to resource management page
    window.location.href = '/resources';
  };

  // Don't show if no configuration is loaded
  if (!currentConfig && !loading) {
    return null;
  }

  // Show loading state
  if (loading && !currentConfig) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  // Show error state
  if (error && !currentConfig) {
    return (
      <Tooltip title={error}>
        <Chip
          icon={<SwapHoriz />}
          label="Resource Error"
          color="error"
          size="small"
          sx={{ mr: 2 }}
        />
      </Tooltip>
    );
  }

  const open = Boolean(anchorEl);

  // Professional Facebook-inspired styling
  const buttonStyle = {
    backgroundColor: '#fff',
    color: '#1c1e21',
    border: '1px solid #dadde1',
    borderRadius: '6px',
    padding: '6px 12px',
    textTransform: 'none' as const,
    minWidth: '200px',
    '&:hover': {
      backgroundColor: '#f2f3f5',
      borderColor: '#ccd0d5',
    },
    '&.Mui-disabled': {
      backgroundColor: '#f2f3f5',
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'adAccount': return <Campaign sx={{ fontSize: 18 }} />;
      case 'page': return <Pages sx={{ fontSize: 18 }} />;
      case 'pixel': return <Code sx={{ fontSize: 18 }} />;
      case 'business': return <Business sx={{ fontSize: 18 }} />;
      default: return <AccountBox sx={{ fontSize: 18 }} />;
    }
  };

  return (
    <>
      <Tooltip title={loading ? "" : "Switch Resources"}>
        <span>
          <Button
            onClick={handleClick}
            endIcon={<KeyboardArrowDown />}
            sx={{
              ...buttonStyle,
              mr: 2,
            }}
            disabled={loading}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              {loading ? (
                <CircularProgress size={16} />
              ) : (
                <SwapHoriz sx={{ fontSize: 18, color: '#65676b' }} />
              )}
              <Box sx={{ textAlign: 'left', flex: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '11px', color: '#65676b', display: 'block' }}>
                  Active Resources
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500, color: '#1c1e21' }} noWrap>
                  {currentConfig?.configName || resourceNames.adAccount || resourceNames.page || 'Select Resources'}
                </Typography>
              </Box>
            </Box>
          </Button>
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { 
            width: 360, 
            mt: 1,
            borderRadius: '8px',
            boxShadow: '0 12px 28px 0 rgba(0,0,0,0.2), 0 2px 4px 0 rgba(0,0,0,0.1)',
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Current Configuration - Facebook Style */}
        <Box sx={{ px: 2, py: 1.5, backgroundColor: '#f0f2f5' }}>
          <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, color: '#65676b', mb: 1 }}>
            CURRENTLY ACTIVE
          </Typography>
          <Paper sx={{ p: 1.5, backgroundColor: '#fff', borderRadius: '8px' }}>
            <Stack spacing={1}>
              {currentConfig?.adAccountId ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24, backgroundColor: '#e3f2fd' }}>
                    <Campaign sx={{ fontSize: 14, color: '#1976d2' }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '11px', color: '#65676b' }}>
                      Ad Account
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500 }}>
                      {resourceNames.adAccount || currentConfig.adAccountId}
                    </Typography>
                  </Box>
                </Box>
              ) : null}
              
              {currentConfig?.pageId ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24, backgroundColor: '#e8f5e9' }}>
                    <Pages sx={{ fontSize: 14, color: '#4caf50' }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '11px', color: '#65676b' }}>
                      Page
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500 }}>
                      {resourceNames.page || currentConfig.pageId}
                    </Typography>
                  </Box>
                </Box>
              ) : null}
              
              {currentConfig?.pixelId ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24, backgroundColor: '#fce4ec' }}>
                    <Code sx={{ fontSize: 14, color: '#e91e63' }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontSize: '11px', color: '#65676b' }}>
                      Pixel
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500 }}>
                      {resourceNames.pixel || currentConfig.pixelId}
                    </Typography>
                  </Box>
                </Box>
              ) : null}
            </Stack>
          </Paper>
        </Box>

        <Divider />

        {/* Recent Configurations */}
        {recentConfigs.length > 0 && (
          <>
            <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: 600, color: '#65676b' }}>
                RECENT CONFIGURATIONS
              </Typography>
            </Box>
            {recentConfigs.map((config) => (
              <MenuItem
                key={config.id}
                onClick={() => handleSwitch({
                  adAccountId: config.adAccountId,
                  pageId: config.pageId,
                  pixelId: config.pixelId,
                  businessId: config.businessId
                })}
                disabled={config.isActive}
                sx={{
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: '#f0f2f5',
                  }
                }}
              >
                <ListItemIcon>
                  {config.isActive ? (
                    <Check sx={{ fontSize: 20, color: '#42b883' }} />
                  ) : (
                    <History sx={{ fontSize: 20, color: '#65676b' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500 }}>
                      {config.name}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ fontSize: '12px', color: '#65676b' }}>
                      {config.lastUsedAt ? `Last used: ${new Date(config.lastUsedAt).toLocaleDateString()}` : 'Never used'}
                    </Typography>
                  }
                />
              </MenuItem>
            ))}
            <Divider />
          </>
        )}

        {/* Manage Resources - Facebook Style Button */}
        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Settings />}
            onClick={handleManageResources}
            sx={{
              backgroundColor: '#1877f2',
              color: '#fff',
              textTransform: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
              py: 1,
              '&:hover': {
                backgroundColor: '#166fe5',
              }
            }}
          >
            Manage Resources
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default ResourceSwitcher;