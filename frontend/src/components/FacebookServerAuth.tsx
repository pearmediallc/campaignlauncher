import React, { useState } from 'react';
import { Button, CircularProgress, Alert } from '@mui/material';
import { Facebook } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

const FacebookServerAuth: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      // Get OAuth URL from backend
      const response = await api.get('/auth/facebook/login');
      
      if (response.data.success && response.data.data.authUrl) {
        // Store state for verification after callback
        sessionStorage.setItem('facebook_oauth_state', response.data.data.state);
        
        // Redirect to Facebook OAuth
        window.location.href = response.data.data.authUrl;
      } else {
        toast.error('Failed to get Facebook login URL');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Failed to initiate Facebook login');
      setLoading(false);
    }
  };

  return (
    <div>
      <Alert severity="info" sx={{ mb: 2 }}>
        Use server-side OAuth for more reliable authentication
      </Alert>
      
      <Button
        variant="contained"
        color="primary"
        size="large"
        startIcon={loading ? <CircularProgress size={20} /> : <Facebook />}
        onClick={handleFacebookLogin}
        disabled={loading}
        fullWidth
      >
        {loading ? 'Redirecting...' : 'Login with Facebook (Server OAuth)'}
      </Button>
    </div>
  );
};

export default FacebookServerAuth;