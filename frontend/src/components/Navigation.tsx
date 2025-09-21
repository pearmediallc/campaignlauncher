import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  Button
} from '@mui/material';
import { AccountCircle, Dashboard, People, History, Person, Campaign, BarChart, AutoAwesome } from '@mui/icons-material';
import ResourceSwitcher from './ResourceSwitcher';

const Navigation: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

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

            {/* Temporary Analytics Button - Remove when no longer needed */}
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
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;