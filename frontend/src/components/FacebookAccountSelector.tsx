import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  CircularProgress,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import {
  Business as BusinessIcon,
  Campaign as CampaignIcon,
  Pages as PagesIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import api, { facebookAuthApi } from '../services/api';

interface AdAccount {
  id: string;
  name: string;
  currency: string;
  status: number;
}

interface Page {
  id: string;
  name: string;
  category: string;
}

interface Pixel {
  id: string;
  name: string;
}

interface FacebookAccountSelectorProps {
  onComplete: () => void;
  onError?: (error: string) => void;
}

const FacebookAccountSelector: React.FC<FacebookAccountSelectorProps> = ({ onComplete, onError }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resources, setResources] = useState<{
    adAccounts: AdAccount[];
    pages: Page[];
    pixels: Pixel[];
    selectedAdAccount?: AdAccount;
    selectedPage?: Page;
    selectedPixel?: Pixel;
    storagePreference?: string;
  }>({
    adAccounts: [],
    pages: [],
    pixels: []
  });
  
  const [selectedAdAccountId, setSelectedAdAccountId] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedPixelId, setSelectedPixelId] = useState('');
  const [storagePreference, setStoragePreference] = useState<'local' | 'session'>('session');
  const [saveLocally, setSaveLocally] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await facebookAuthApi.getResources();

      if (response.success) {
        // Add hardcoded ad account
        const hardcodedAccount = {
          id: '3694357910868441',
          name: 'P2PSM-Sep-2025-EST-031',
          currency: 'USD',
          status: 1,
          account_status: 1
        };

        // Check if hardcoded account is not already in the list
        const accountExists = response.data.adAccounts.find((acc: AdAccount) => acc.id === hardcodedAccount.id);
        if (!accountExists) {
          // Add at the beginning of the list
          response.data.adAccounts.unshift(hardcodedAccount);
        }

        setResources(response.data);

        // Pre-select if already selected
        if (response.data.selectedAdAccount) {
          setSelectedAdAccountId(response.data.selectedAdAccount.id);
        }
        if (response.data.selectedPage) {
          setSelectedPageId(response.data.selectedPage.id);
        }
        if (response.data.selectedPixel) {
          setSelectedPixelId(response.data.selectedPixel.id);
        }
        if (response.data.storagePreference) {
          setStoragePreference(response.data.storagePreference);
          setSaveLocally(response.data.storagePreference === 'local');
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to fetch Facebook resources';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSelection = async () => {
    if (!selectedAdAccountId || !selectedPageId) {
      setError('Please select both an Ad Account and a Facebook Page');
      return;
    }

    try {
      setSaving(true);
      
      const response = await facebookAuthApi.selectResources({
        adAccountId: selectedAdAccountId,
        pageId: selectedPageId,
        pixelId: selectedPixelId || undefined,
        storagePreference: saveLocally ? 'local' : 'session'
      });

      if (response.success) {
        // If user wants to save locally, store tokens in localStorage
        if (saveLocally) {
          const authStatus = await facebookAuthApi.getStatus();
          if (authStatus.success && authStatus.data.isAuthenticated) {
            localStorage.setItem('fb_auth_data', JSON.stringify({
              selectedAdAccount: response.data.selectedAdAccount,
              selectedPage: response.data.selectedPage,
              selectedPixel: response.data.selectedPixel,
              tokenExpiresAt: authStatus.data.tokenExpiresAt
            }));
          }
        } else {
          // Clear local storage if user doesn't want to save
          localStorage.removeItem('fb_auth_data');
        }

        onComplete();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to save selection';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasExistingSelection = !!(resources.selectedAdAccount && resources.selectedPage);

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Select Your Facebook Resources
        </Typography>
        
        {hasExistingSelection && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You have previously selected resources. You can update your selection below.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Stack spacing={3}>
          {/* Ad Account Selection */}
          <FormControl fullWidth required>
            <InputLabel>Ad Account</InputLabel>
            <Select
              value={selectedAdAccountId}
              onChange={(e) => setSelectedAdAccountId(e.target.value)}
              label="Ad Account"
              startAdornment={<CampaignIcon sx={{ mr: 1, color: 'action.active' }} />}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: 400, // Increased height for better visibility
                    '& .MuiList-root': {
                      paddingTop: 0,
                      paddingBottom: 0,
                    }
                  }
                },
                // Virtual scrolling for performance with many items
                disableScrollLock: true,
                // Keep menu open on scroll
                autoFocus: false
              }}
            >
              {/* Show total count if more than 25 accounts */}
              {resources.adAccounts.length > 25 && (
                <MenuItem disabled sx={{ opacity: 1, backgroundColor: 'action.hover' }}>
                  <Typography variant="caption" color="text.secondary">
                    {resources.adAccounts.length} accounts available - scroll to see all
                  </Typography>
                </MenuItem>
              )}

              {resources.adAccounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography sx={{ flexGrow: 1 }}>{account.name}</Typography>
                    <Chip
                      label={account.currency}
                      size="small"
                      color={account.status === 1 ? 'success' : 'default'}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>

            {/* Show helper text if many accounts */}
            {resources.adAccounts.length > 25 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Tip: Type to search or scroll to find your account
              </Typography>
            )}
          </FormControl>

          {/* Page Selection */}
          <FormControl fullWidth required>
            <InputLabel>Facebook Page</InputLabel>
            <Select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              label="Facebook Page"
              startAdornment={<PagesIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              {resources.pages.map((page) => (
                <MenuItem key={page.id} value={page.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Typography sx={{ flexGrow: 1 }}>{page.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {page.category}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Pixel Selection (Optional) */}
          <FormControl fullWidth>
            <InputLabel>Facebook Pixel (Optional)</InputLabel>
            <Select
              value={selectedPixelId}
              onChange={(e) => setSelectedPixelId(e.target.value)}
              label="Facebook Pixel (Optional)"
              startAdornment={<CodeIcon sx={{ mr: 1, color: 'action.active' }} />}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {resources.pixels.map((pixel) => (
                <MenuItem key={pixel.id} value={pixel.id}>
                  {pixel.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider />

          {/* Storage Preference */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              <StorageIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Token Storage Preference
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={saveLocally}
                  onChange={(e) => {
                    setSaveLocally(e.target.checked);
                    setStoragePreference(e.target.checked ? 'local' : 'session');
                  }}
                />
              }
              label={
                <Box>
                  <Typography>Save authentication locally</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {saveLocally 
                      ? 'Your Facebook authentication will be saved locally and persist across sessions'
                      : 'You will need to authenticate again when you return'
                    }
                  </Typography>
                </Box>
              }
            />
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveSelection}
              disabled={!selectedAdAccountId || !selectedPageId || saving}
              startIcon={saving ? <CircularProgress size={20} /> : <CheckIcon />}
            >
              {saving ? 'Saving...' : 'Save Selection'}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FacebookAccountSelector;