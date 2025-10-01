import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useFacebookStatus } from '../hooks/useFacebookStatus';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Chip,
  Button,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { AccountCircle, Dashboard, People, History, Person, Campaign, BarChart, AutoAwesome, Facebook, LinkOff } from '@mui/icons-material';
import ResourceSwitcher from './ResourceSwitcher';
import { facebookAuthApi } from '../services/api';
import { toast } from 'react-toastify';

const Navigation: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { connected: fbConnected, facebookUser, loading: fbLoading, refreshStatus } = useFacebookStatus();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const handleNavigate = (path: string) => {
    handleClose();
    navigate(path);
  };

  const handleOpenDisconnectDialog = () => {
    handleClose();
    setDisconnectDialogOpen(true);
  };

  const handleCloseDisconnectDialog = () => {
    setDisconnectDialogOpen(false);
  };

  const handleDisconnectFacebook = async () => {
    try {
      setDisconnecting(true);

      // Call backend to disconnect
      const response = await facebookAuthApi.disconnect();

      if (response.success) {
        // SAFE LOGOUT: Check status before logout to prevent errors
        // This ensures we can always login again even if session expired
        if (window.FB) {
          try {
            window.FB.getLoginStatus((statusResponse: any) => {
              if (statusResponse.status === 'connected') {
                // Only logout if actually connected
                window.FB.logout(() => {
                  console.log('Facebook SDK logout completed');
                });
              } else {
                console.log('Not connected to Facebook, skipping FB.logout()');
              }
            });
          } catch (fbError) {
            // If FB SDK fails, just log and continue - don't block disconnect
            console.warn('Facebook SDK error during logout:', fbError);
          }
        }

        // Clear all storage
        localStorage.removeItem('fb_auth_status');
        sessionStorage.clear();

        toast.success('Facebook account disconnected successfully. Page will reload...');

        // Close dialog and reload page after short delay
        setDisconnectDialogOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error('Failed to disconnect Facebook account');
        setDisconnecting(false);
      }
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error(error.response?.data?.error || 'Failed to disconnect Facebook account');
      setDisconnecting(false);
    }
  };

  return (
    <AppBar position="static" sx={{ 
      backgroundColor: '#fff', 
      color: '#1c1e21',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      borderBottom: '1px solid #dadde1'
    }}>
      <Toolbar sx={{ minHeight: '56px !important', px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Box sx={{ 
            backgroundColor: '#1877f2', 
            color: '#fff', 
            p: 0.5, 
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            mr: 2
          }}>
            <Campaign />
          </Box>
          <Typography variant="h6" component="div" sx={{ 
            fontWeight: 600,
            fontSize: '18px',
            color: '#1c1e21'
          }}>
            Facebook Campaign Launcher
          </Typography>
        </Box>
        
        {user && (
          <Box display="flex" alignItems="center" gap={2}>
            {/* Resource Switcher - Only show if user is authenticated */}
            <ResourceSwitcher />

            {/* Strategy 1-50-1 Button */}
            <Button
              variant="outlined"
              startIcon={<AutoAwesome />}
              onClick={() => navigate('/strategy-1-50-1')}
              sx={{
                borderColor: '#1877f2',
                color: '#1877f2',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '14px',
                px: 2,
                '&:hover': {
                  borderColor: '#166fe5',
                  color: '#166fe5',
                  backgroundColor: 'rgba(24, 119, 242, 0.04)'
                }
              }}
            >
              Strategy 1-50-1
            </Button>

            {/* Campaign Management Button */}
            <Button
              variant="outlined"
              startIcon={<Dashboard />}
              onClick={() => navigate('/campaign-management')}
              sx={{
                borderColor: '#1877f2',
                color: '#1877f2',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '14px',
                px: 2,
                '&:hover': {
                  borderColor: '#166fe5',
                  color: '#166fe5',
                  backgroundColor: 'rgba(24, 119, 242, 0.04)'
                }
              }}
            >
              Manage Campaigns
            </Button>

            {/* Temporary Analytics Button - Commented out per user request
            <Button
              variant="contained"
              startIcon={<BarChart />}
              onClick={() => window.location.href = '/analytics.html'}
              sx={{
                backgroundColor: '#1877f2',
                color: '#fff',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '14px',
                px: 2,
                '&:hover': {
                  backgroundColor: '#166fe5'
                }
              }}
            >
              Analytics
            </Button>
            */}

            {/* Facebook Status Indicator */}
            <Tooltip title={fbConnected ? `Connected: ${facebookUser?.name}` : 'Facebook not connected'}>
              <Chip
                icon={<Facebook />}
                label={fbConnected ? 'Connected' : 'Not Connected'}
                color={fbConnected ? 'success' : 'error'}
                size="small"
                variant={fbConnected ? 'filled' : 'outlined'}
                onClick={() => navigate('/')}
                sx={{
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  '& .MuiChip-icon': {
                    fontSize: '18px'
                  }
                }}
              />
            </Tooltip>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="body2" sx={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#1c1e21'
              }}>
                {user.firstName} {user.lastName}
              </Typography>
              
              {user.roles && user.roles.length > 0 && (
                <Chip 
                  label={typeof user.roles[0] === 'string' ? user.roles[0] : user.roles[0].name}
                  size="small"
                  sx={{ 
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    fontSize: '12px',
                    fontWeight: 600,
                    height: '24px'
                  }}
                />
              )}
            </Box>
            
            <IconButton
              size="medium"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              sx={{
                backgroundColor: '#f0f2f5',
                color: '#1c1e21',
                '&:hover': {
                  backgroundColor: '#e4e6eb'
                }
              }}
            >
              <AccountCircle />
            </IconButton>
            
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{user.email}</Typography>
              </MenuItem>
              <Divider />

              {/* Facebook Status Section */}
              <MenuItem onClick={() => handleNavigate('/')}>
                <Facebook sx={{
                  mr: 1,
                  fontSize: 20,
                  color: fbConnected ? '#4CAF50' : '#f44336'
                }} />
                {fbConnected ? `FB: ${facebookUser?.name}` : 'Connect Facebook'}
              </MenuItem>
              <Divider />
              
              <MenuItem onClick={() => handleNavigate('/dashboard')}>
                <Dashboard sx={{ mr: 1, fontSize: 20 }} />
                Dashboard
              </MenuItem>
              
              {hasPermission('user', 'read') && (
                <MenuItem onClick={() => handleNavigate('/users')}>
                  <People sx={{ mr: 1, fontSize: 20 }} />
                  User Management
                </MenuItem>
              )}
              
              {hasPermission('audit', 'read') && (
                <MenuItem onClick={() => handleNavigate('/audit-logs')}>
                  <History sx={{ mr: 1, fontSize: 20 }} />
                  Audit Logs
                </MenuItem>
              )}
              
              <MenuItem onClick={() => handleNavigate('/profile')}>
                <Person sx={{ mr: 1, fontSize: 20 }} />
                My Profile
              </MenuItem>

              <Divider />

              {/* Disconnect Facebook Button - Only show if connected */}
              {fbConnected && (
                <>
                  <MenuItem
                    onClick={handleOpenDisconnectDialog}
                    sx={{
                      color: 'error.main',
                      '&:hover': {
                        backgroundColor: 'error.lighter'
                      }
                    }}
                  >
                    <LinkOff sx={{ mr: 1, fontSize: 20 }} />
                    Disconnect Facebook
                  </MenuItem>
                  <Divider />
                </>
              )}

              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>

            {/* Disconnect Confirmation Dialog */}
            <Dialog
              open={disconnectDialogOpen}
              onClose={handleCloseDisconnectDialog}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Disconnect Facebook Account?</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Are you sure you want to disconnect your Facebook account?
                  <br /><br />
                  <strong>This will:</strong>
                  <ul style={{ marginTop: 8 }}>
                    <li>Log you out of Facebook in this browser</li>
                    <li>Remove all saved Facebook data</li>
                    <li>Clear your selected ad account, page, and pixel</li>
                    <li>Require you to log in again with email and password</li>
                  </ul>
                  <br />
                  You'll be able to connect a different Facebook account after disconnecting.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleCloseDisconnectDialog}
                  disabled={disconnecting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDisconnectFacebook}
                  color="error"
                  variant="contained"
                  disabled={disconnecting}
                  startIcon={<LinkOff />}
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect Facebook'}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;