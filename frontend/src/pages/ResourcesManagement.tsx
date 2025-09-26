import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Autocomplete,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  SwapHoriz as SwapIcon,
  CheckCircle as CheckIcon,
  History as HistoryIcon,
  Business as BusinessIcon,
  Campaign as CampaignIcon,
  Pages as PagesIcon,
  Code as CodeIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import resourceApi, { ResourceConfig, ResourcePreset, SwitchHistory } from '../services/resourceApi';
import { facebookAuthApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { cacheFetch } from '../utils/debounce';

const ResourcesManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentConfig, setCurrentConfig] = useState<ResourceConfig | null>(null);
  const [presets, setPresets] = useState<ResourcePreset[]>([]);
  const [recentConfigs, setRecentConfigs] = useState<ResourcePreset[]>([]);
  const [switchHistory, setSwitchHistory] = useState<SwitchHistory[]>([]);
  const [availableResources, setAvailableResources] = useState<any>(null);
  const [createPresetDialog, setCreatePresetDialog] = useState(false);
  const [switchDialog, setSwitchDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [selectedResources, setSelectedResources] = useState<ResourceConfig>({});

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel with caching
      const [currentResponse, presetsResponse, recentResponse, historyResponse, resourcesResponse] = await Promise.all([
        cacheFetch('resource-current', () => resourceApi.getCurrentResources(), 3000),
        cacheFetch('resource-presets', () => resourceApi.getPresets(), 5000),
        cacheFetch('resource-recent-5', () => resourceApi.getRecentConfigs(5), 3000),
        cacheFetch('resource-history-10', () => resourceApi.getSwitchHistory(10), 5000),
        cacheFetch('facebook-resources', () => facebookAuthApi.getResources(), 10000)
      ]);
      
      if (currentResponse.success) {
        setCurrentConfig(currentResponse.data);
      }
      
      if (presetsResponse.success) {
        setPresets(presetsResponse.data);
      }
      
      if (recentResponse.success) {
        setRecentConfigs(recentResponse.data);
      }
      
      if (historyResponse.success) {
        setSwitchHistory(historyResponse.data);
      }
      
      if (resourcesResponse.success) {
        setAvailableResources(resourcesResponse.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load resource data');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (config: ResourceConfig) => {
    try {
      setLoading(true);
      const response = await resourceApi.switchResources(config);
      if (response.success) {
        toast.success('Resources switched successfully');
        await loadAllData();
        // Reload page to refresh all components
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to switch resources');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }
    
    try {
      const response = await resourceApi.savePreset(presetName, selectedResources);
      if (response.success) {
        toast.success('Preset created successfully');
        setCreatePresetDialog(false);
        setPresetName('');
        setSelectedResources({});
        await loadAllData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create preset');
    }
  };

  const handleDeletePreset = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this preset?')) {
      return;
    }
    
    try {
      const response = await resourceApi.deletePreset(id);
      if (response.success) {
        toast.success('Preset deleted successfully');
        await loadAllData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete preset');
    }
  };

  const openSwitchDialog = (config: ResourceConfig) => {
    setSelectedResources(config);
    setSwitchDialog(true);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  if (loading && !currentConfig) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">Resource Management</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreatePresetDialog(true)}
        >
          Create Preset
        </Button>
      </Box>

      {/* Current Configuration & Quick Switch */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Active Resources & Quick Switch
        </Typography>
        
        {/* Show current configuration */}
        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Currently Active:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {currentConfig?.adAccountId ? (
              <Chip
                icon={<CampaignIcon />}
                label={`Ad Account: ${availableResources?.selectedAdAccount?.name || currentConfig.adAccountId}`}
                color="primary"
              />
            ) : (
              <Chip label="No Ad Account Selected" />
            )}
            {currentConfig?.pageId ? (
              <Chip
                icon={<PagesIcon />}
                label={`Page: ${availableResources?.selectedPage?.name || currentConfig.pageId}`}
                color="primary"
              />
            ) : (
              <Chip label="No Page Selected" />
            )}
            {currentConfig?.pixelId ? (
              <Chip
                icon={<CodeIcon />}
                label={`Pixel: ${availableResources?.selectedPixel?.name || currentConfig.pixelId}`}
                color="primary"
              />
            ) : (
              <Chip label="No Pixel Selected" />
            )}
          </Box>
        </Box>

        {/* Quick Switch Dropdowns */}
        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Switch Resources:
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mt: 2 }}>
          {/* Ad Account Selector */}
          <Autocomplete
            size="small"
            options={availableResources?.adAccounts || []}
            getOptionLabel={(option: any) => `${option.name} (${option.id})`}
            value={availableResources?.adAccounts?.find((acc: any) => acc.id === (selectedResources.adAccountId || currentConfig?.adAccountId)) || null}
            onChange={(event, newValue) => {
              setSelectedResources({ ...selectedResources, adAccountId: newValue?.id || '' });
            }}
            isOptionEqualToValue={(option: any, value: any) => option.id === value?.id}
            renderInput={(params) => (
              <TextField {...params} label="Ad Account" placeholder="Search ad accounts..." />
            )}
            renderOption={(props, option: any) => (
              <Box component="li" {...props}>
                <CampaignIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {option.id}
                  </Typography>
                </Box>
              </Box>
            )}
          />

          {/* Page Selector */}
          <Autocomplete
            size="small"
            options={availableResources?.pages || []}
            getOptionLabel={(option: any) => option.name || ''}
            value={availableResources?.pages?.find((page: any) => page.id === (selectedResources.pageId || currentConfig?.pageId)) || null}
            onChange={(event, newValue) => {
              setSelectedResources({ ...selectedResources, pageId: newValue?.id || '' });
            }}
            isOptionEqualToValue={(option: any, value: any) => option.id === value?.id}
            renderInput={(params) => (
              <TextField {...params} label="Page" placeholder="Search pages..." />
            )}
            renderOption={(props, option: any) => {
              const pictureUrl = typeof option.picture === 'string'
                ? option.picture
                : option.picture?.data?.url;

              return (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {pictureUrl ? (
                    <Avatar src={pictureUrl} sx={{ width: 32, height: 32 }} />
                  ) : (
                    <Avatar sx={{ width: 32, height: 32 }}>
                      <PagesIcon fontSize="small" />
                    </Avatar>
                  )}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">{option.name}</Typography>
                    {option.category && (
                      <Typography variant="caption" color="text.secondary">
                        {option.category}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            }}
          />

          {/* Pixel Selector */}
          <Autocomplete
            size="small"
            options={availableResources?.pixels || []}
            getOptionLabel={(option: any) => option.name || ''}
            value={availableResources?.pixels?.find((pixel: any) => pixel.id === (selectedResources.pixelId || currentConfig?.pixelId)) || null}
            onChange={(event, newValue) => {
              setSelectedResources({ ...selectedResources, pixelId: newValue?.id || '' });
            }}
            isOptionEqualToValue={(option: any, value: any) => option.id === value?.id}
            renderInput={(params) => (
              <TextField {...params} label="Pixel" placeholder="Search pixels..." />
            )}
            renderOption={(props, option: any) => (
              <Box component="li" {...props}>
                <CodeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">{option.name}</Typography>
                  {option.id && (
                    <Typography variant="caption" color="text.secondary">
                      ID: {option.id}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          />

          {/* Business Manager Selector (if available) */}
          {availableResources?.businessAccounts && availableResources.businessAccounts.length > 0 && (
            <Autocomplete
              fullWidth
              size="small"
              options={availableResources.businessAccounts || []}
              getOptionLabel={(option: any) => option.name || ''}
              value={availableResources?.businessAccounts?.find((bm: any) => bm.id === (selectedResources.businessId || currentConfig?.businessId)) || null}
              onChange={(event, newValue) => {
                setSelectedResources({ ...selectedResources, businessId: newValue?.id || '' });
              }}
              isOptionEqualToValue={(option: any, value: any) => option.id === value?.id}
              renderInput={(params) => (
                <TextField {...params} label="Business Manager" placeholder="Search business managers..." />
              )}
              renderOption={(props, option: any) => (
                <Box component="li" {...props}>
                  <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">{option.name}</Typography>
                    {option.id && (
                      <Typography variant="caption" color="text.secondary">
                        ID: {option.id}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            />
          )}
        </Box>

        {/* Switch Button */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<SwapIcon />}
            onClick={() => {
              const configToSwitch = {
                adAccountId: selectedResources.adAccountId || currentConfig?.adAccountId,
                pageId: selectedResources.pageId || currentConfig?.pageId,
                pixelId: selectedResources.pixelId || currentConfig?.pixelId,
                businessId: selectedResources.businessId || currentConfig?.businessId,
              };
              handleSwitch(configToSwitch);
            }}
            disabled={
              !selectedResources.adAccountId && 
              !selectedResources.pageId && 
              !selectedResources.pixelId && 
              !selectedResources.businessId
            }
          >
            Apply Changes
          </Button>
          <Button
            variant="outlined"
            onClick={() => setSelectedResources({})}
          >
            Reset
          </Button>
        </Box>
      </Paper>

      {/* Saved Presets */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Saved Presets
        </Typography>
        {presets.length === 0 ? (
          <Alert severity="info">No presets saved yet. Create your first preset!</Alert>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2, mt: 1 }}>
            {presets.map((preset) => (
              <Card key={preset.id}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6">{preset.name}</Typography>
                      {preset.isActive && <CheckIcon color="success" />}
                    </Box>
                    <Stack spacing={1}>
                      {preset.adAccountId && (
                        <Typography variant="caption" color="textSecondary">
                          Ad Account: {preset.adAccountId}
                        </Typography>
                      )}
                      {preset.pageId && (
                        <Typography variant="caption" color="textSecondary">
                          Page: {preset.pageId}
                        </Typography>
                      )}
                      {preset.pixelId && (
                        <Typography variant="caption" color="textSecondary">
                          Pixel: {preset.pixelId}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<SwapIcon />}
                      onClick={() => handleSwitch({
                        adAccountId: preset.adAccountId,
                        pageId: preset.pageId,
                        pixelId: preset.pixelId,
                        businessId: preset.businessId
                      })}
                      disabled={preset.isActive}
                    >
                      {preset.isActive ? 'Active' : 'Switch'}
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleDeletePreset(preset.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
            ))}
          </Box>
        )}
      </Paper>

      {/* Recent Configurations */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Configurations
        </Typography>
        <List>
          {recentConfigs.map((config) => (
            <ListItem key={config.id}>
              <ListItemText
                primary={config.name}
                secondary={`Last used: ${config.lastUsedAt ? formatDate(config.lastUsedAt) : 'Never'}`}
              />
              <ListItemSecondaryAction>
                <Button
                  size="small"
                  startIcon={<SwapIcon />}
                  onClick={() => handleSwitch({
                    adAccountId: config.adAccountId,
                    pageId: config.pageId,
                    pixelId: config.pixelId,
                    businessId: config.businessId
                  })}
                  disabled={config.isActive}
                >
                  {config.isActive ? 'Active' : 'Switch'}
                </Button>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Switch History */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Switch History
        </Typography>
        <List>
          {switchHistory.map((entry) => (
            <ListItem key={entry.id}>
              <ListItemText
                primary={`Switched at ${formatDate(entry.switchedAt)}`}
                secondary={
                  <Box>
                    <Typography variant="caption" component="span">
                      From: {JSON.stringify(entry.from)} → To: {JSON.stringify(entry.to)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Create Preset Dialog */}
      <Dialog open={createPresetDialog} onClose={() => setCreatePresetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Resource Preset</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Preset Name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            margin="normal"
          />
          
          {availableResources && (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel>Ad Account</InputLabel>
                <Select
                  value={selectedResources.adAccountId || ''}
                  onChange={(e) => setSelectedResources({ ...selectedResources, adAccountId: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {availableResources.adAccounts?.map((acc: any) => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Page</InputLabel>
                <Select
                  value={selectedResources.pageId || ''}
                  onChange={(e) => setSelectedResources({ ...selectedResources, pageId: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {availableResources.pages?.map((page: any) => (
                    <MenuItem key={page.id} value={page.id}>
                      {page.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Pixel</InputLabel>
                <Select
                  value={selectedResources.pixelId || ''}
                  onChange={(e) => setSelectedResources({ ...selectedResources, pixelId: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  {availableResources.pixels?.map((pixel: any) => (
                    <MenuItem key={pixel.id} value={pixel.id}>
                      {pixel.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePresetDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePreset} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResourcesManagement;