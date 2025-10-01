import React, { useEffect, useState } from 'react';
import { Button, CircularProgress, Alert } from '@mui/material';
import { Facebook } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

const FacebookSDKAuth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [currentFacebookUser, setCurrentFacebookUser] = useState<{
    name: string;
    id: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    // Load Facebook SDK
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: '735375959485927',
        cookie: true,
        xfbml: true,
        version: 'v18.0',
        // Use ngrok domain if available, otherwise localhost
        status: true
      });

      window.FB.AppEvents.logPageView();
      setSdkLoaded(true);
    };

    // Load the SDK asynchronously
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode!.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  // Check current Facebook login status when SDK loads
  useEffect(() => {
    if (sdkLoaded && window.FB) {
      window.FB.getLoginStatus((response: any) => {
        if (response.status === 'connected') {
          // Fetch user info
          window.FB.api('/me', { fields: 'id,name,email' }, (userInfo: any) => {
            setCurrentFacebookUser({
              id: userInfo.id,
              name: userInfo.name,
              email: userInfo.email
            });
          });
        }
      });
    }
  }, [sdkLoaded]);

  const processAuthResponse = async (authResponse: any) => {
    if (!authResponse) {
      toast.error('No authentication response received');
      setLoading(false);
      return;
    }

    console.log('Processing auth response:', authResponse);
    console.log('Token expires in:', authResponse.expiresIn, 'seconds =', (authResponse.expiresIn / 3600).toFixed(1), 'hours');
    
    try {
      // Send the access token to our backend
      const backendResponse = await api.post('/auth/facebook-sdk/sdk-callback', {
        accessToken: authResponse.accessToken,
        userID: authResponse.userID,
        expiresIn: authResponse.expiresIn
      });

      console.log('Backend response:', backendResponse.data);

      if (backendResponse.data.success) {
        // Fetch and set user info after successful auth
        window.FB.api('/me', { fields: 'id,name,email' }, (userInfo: any) => {
          setCurrentFacebookUser({
            id: userInfo.id,
            name: userInfo.name,
            email: userInfo.email
          });
        });

        toast.success('Facebook authentication successful!');

        // Check if we need to select resources
        if (backendResponse.data.data?.resources) {
          const resources = backendResponse.data.data.resources;
          if (resources.adAccounts?.length > 0) {
            // Redirect to resource selection
            window.location.href = '/facebook-account-selector';
          } else {
            window.location.href = '/dashboard';
          }
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        toast.error('Failed to process authentication');
      }
    } catch (error: any) {
      console.error('Backend error:', error);
      toast.error(error.response?.data?.message || 'Authentication failed');
    }
    
    setLoading(false);
  };

  const handleFacebookLogin = () => {
    if (!sdkLoaded) {
      toast.error('Facebook SDK is still loading. Please try again.');
      return;
    }

    setLoading(true);

    // First check if user is already logged in
    window.FB.getLoginStatus((statusResponse: any) => {
      console.log('Current login status:', statusResponse);
      
      if (statusResponse.status === 'connected') {
        // User is already logged in, use existing token
        console.log('User already connected, using existing token');
        processAuthResponse(statusResponse.authResponse);
      } else {
        // Not logged in, proceed with login
        window.FB.login((response: any) => {
          if (response.authResponse) {
            console.log('Facebook login successful!');
            processAuthResponse(response.authResponse);
          } else {
            console.log('User cancelled login or did not fully authorize.');
            toast.warning('Facebook login was cancelled');
            setLoading(false);
          }
        }, {
          scope: 'public_profile,ads_management,ads_read,business_management,pages_show_list,pages_read_engagement,pages_manage_ads',
          return_scopes: true,
          auth_type: 'rerequest' // Force re-authorization
        });
      }
    });
  };

  const handleSwitchAccount = () => {
    if (!sdkLoaded) {
      toast.error('Facebook SDK is still loading. Please try again.');
      return;
    }

    setLoading(true);

    // SAFE LOGOUT: Check status before logout to prevent errors
    window.FB.getLoginStatus((statusResponse: any) => {
      const doLogin = () => {
        // Trigger new login
        window.FB.login((loginResponse: any) => {
          if (loginResponse.authResponse) {
            console.log('New Facebook login successful!');
            processAuthResponse(loginResponse.authResponse);
          } else {
            console.log('User cancelled login or did not fully authorize.');
            toast.warning('Facebook login was cancelled');
            setLoading(false);
          }
        }, {
          scope: 'public_profile,ads_management,ads_read,business_management,pages_show_list,pages_read_engagement,pages_manage_ads',
          return_scopes: true,
          auth_type: 'reauthorize' // Force re-authorization
        });
      };

      if (statusResponse.status === 'connected') {
        // Only logout if actually connected
        window.FB.logout((response: any) => {
          console.log('Logged out from current Facebook account');
          setCurrentFacebookUser(null);
          doLogin();
        });
      } else {
        // Not connected, just proceed with login
        console.log('Not connected to Facebook, proceeding directly to login');
        setCurrentFacebookUser(null);
        doLogin();
      }
    });
  };

  const handleLogout = () => {
    if (!sdkLoaded) return;

    // SAFE LOGOUT: Check status before logout to prevent errors
    window.FB.getLoginStatus((statusResponse: any) => {
      if (statusResponse.status === 'connected') {
        // Only logout if actually connected
        window.FB.logout((response: any) => {
          console.log('Logged out from Facebook');
          setCurrentFacebookUser(null);
          toast.info('Logged out from Facebook');
        });
      } else {
        // Not connected, just clear state
        console.log('Not connected to Facebook, clearing local state');
        setCurrentFacebookUser(null);
        toast.info('Cleared Facebook session');
      }
    });
  };

  return (
    <div>
      <Alert severity="info" sx={{ mb: 2 }}>
        Using Facebook SDK for direct authentication (bypasses redirect URI issues)
      </Alert>

      {/* Show current connected account if exists */}
      {currentFacebookUser && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <strong>Connected as:</strong> {currentFacebookUser.name}
          <br />
          <small>Facebook ID: {currentFacebookUser.id}</small>
        </Alert>
      )}

      {/* Show appropriate buttons based on connection status */}
      {currentFacebookUser ? (
        <>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <Facebook />}
            onClick={handleSwitchAccount}
            disabled={loading || !sdkLoaded}
            fullWidth
          >
            {loading ? 'Switching Account...' : 'Switch Facebook Account'}
          </Button>

          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={() => window.location.href = '/dashboard'}
            disabled={loading}
            fullWidth
            sx={{ mt: 1 }}
          >
            Continue with Current Account
          </Button>
        </>
      ) : (
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={loading ? <CircularProgress size={20} /> : <Facebook />}
          onClick={handleFacebookLogin}
          disabled={loading || !sdkLoaded}
          fullWidth
        >
          {loading ? 'Authenticating...' : 'Login with Facebook (SDK)'}
        </Button>
      )}

      <Button
        variant="outlined"
        color="secondary"
        size="small"
        onClick={handleLogout}
        disabled={!sdkLoaded}
        fullWidth
        sx={{ mt: 1 }}
      >
        Logout from Facebook (Clear Session)
      </Button>

      {!sdkLoaded && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Loading Facebook SDK...
        </Alert>
      )}
    </div>
  );
};

export default FacebookSDKAuth;