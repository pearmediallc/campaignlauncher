import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { Save, Lock } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const refreshUser = () => window.location.reload(); // Simple refresh for now
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      await api.put('/users/profile', {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
      });
      toast.success('Profile updated successfully');
      if (refreshUser) refreshUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      await api.post('/users/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">User not found</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My Profile
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Profile Information */}
        <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Profile Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email"
                value={profileData.email}
                disabled
                fullWidth
              />
              <TextField
                label="First Name"
                value={profileData.firstName}
                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                fullWidth
              />
              <TextField
                label="Last Name"
                value={profileData.lastName}
                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                fullWidth
              />
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleUpdateProfile}
                disabled={loading}
              >
                Save Changes
              </Button>
            </Box>
          </Paper>
        </Box>

        {/* Change Password */}
        <Box sx={{ flex: '1 1 45%', minWidth: '300px' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Change Password
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Current Password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                fullWidth
              />
              <TextField
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                fullWidth
              />
              <TextField
                label="Confirm New Password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                fullWidth
              />
              <Button
                variant="contained"
                startIcon={<Lock />}
                onClick={handleChangePassword}
                disabled={loading}
              >
                Change Password
              </Button>
            </Box>
          </Paper>
        </Box>

        {/* Roles and Permissions */}
        <Box sx={{ flex: '1 1 100%' }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Roles & Permissions
            </Typography>
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Your Roles:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {user.roles?.map((role: any) => (
                  <Chip
                    key={role.id || role}
                    label={typeof role === 'string' ? role : role.name}
                    color="primary"
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Your Permissions:
              </Typography>
              <List dense>
                {['campaign', 'user', 'audit', 'role'].map((resource) => {
                  const actions = ['create', 'read', 'update', 'delete'];
                  const permissions = actions.filter(action => 
                    (user as any).permissions?.some((p: any) => 
                      p.resource === resource && p.action === action
                    )
                  );
                  
                  if (permissions.length === 0) return null;
                  
                  return (
                    <ListItem key={resource}>
                      <ListItemText
                        primary={resource.charAt(0).toUpperCase() + resource.slice(1)}
                        secondary={
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {permissions.map(action => (
                              <Chip
                                key={action}
                                label={action}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Profile;