import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Facebook, Check, Error } from '@mui/icons-material';
import api from '../services/api';

const FacebookSDKTest: React.FC = () => {
  const [accessToken, setAccessToken] = useState('');
  const [userID, setUserID] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post('/auth/facebook/sdk-callback', {
        accessToken,
        userID,
        expiresIn: 5183999, // Default 60 days
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to validate token');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    // This uses Facebook SDK to get access token
    if (window.FB) {
      window.FB.login((response: any) => {
        if (response.authResponse) {
          setAccessToken(response.authResponse.accessToken);
          setUserID(response.authResponse.userID);
        }
      }, { scope: 'ads_management,business_management,pages_show_list,ads_read,pages_read_engagement,pages_manage_ads' });
    } else {
      setError('Facebook SDK not loaded');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Facebook Access Token Validator
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Test and validate Facebook access tokens for campaign management
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<Facebook />}
            onClick={handleFacebookLogin}
            fullWidth
            size="large"
          >
            Get Access Token via Facebook Login
          </Button>
        </Box>

        <Typography variant="body2" align="center" sx={{ mb: 3 }}>
          OR
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Access Token"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            multiline
            rows={3}
            margin="normal"
            required
            helperText="Enter your Facebook access token"
          />

          <TextField
            fullWidth
            label="User ID"
            value={userID}
            onChange={(e) => setUserID(e.target.value)}
            margin="normal"
            required
            helperText="Enter your Facebook user ID"
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={loading || !accessToken || !userID}
            sx={{ mt: 3 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Validate Token'}
          </Button>
        </form>

        {error && (
          <Alert severity="error" sx={{ mt: 3 }} icon={<Error />}>
            {error}
          </Alert>
        )}

        {result && result.success && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="success" icon={<Check />}>
              Token validated successfully!
            </Alert>
            
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Eligibility Status: {result.data?.eligibility?.status}
              </Typography>
              {result.data?.resources && (
                <>
                  <Typography variant="body2">
                    Ad Accounts: {result.data.resources.adAccounts?.length || 0}
                  </Typography>
                  <Typography variant="body2">
                    Pages: {result.data.resources.pages?.length || 0}
                  </Typography>
                </>
              )}
            </Paper>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default FacebookSDKTest;