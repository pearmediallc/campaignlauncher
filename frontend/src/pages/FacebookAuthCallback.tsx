import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

const FacebookAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    const handleCallback = () => {
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const reasons = searchParams.get('reasons');
      const permissions = searchParams.get('permissions');
      
      if (window.opener) {
        // Send message to parent window
        if (error) {
          let errorMessage = 'Authentication failed';
          
          if (error === 'missing_permissions') {
            errorMessage = `Missing required permissions: ${permissions}`;
          } else if (error === 'invalid_state') {
            errorMessage = 'Invalid authentication state. Please try again.';
          } else if (errorDescription) {
            errorMessage = errorDescription;
          }
          
          window.opener.postMessage({
            type: 'facebook_auth_error',
            error: errorMessage
          }, window.location.origin);
        } else {
          window.opener.postMessage({
            type: 'facebook_auth_success'
          }, window.location.origin);
        }
        
        // Close popup after a short delay
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        // If no opener, redirect to dashboard
        if (error) {
          navigate('/dashboard?auth_error=' + error);
        } else {
          navigate('/dashboard?auth_success=true');
        }
      }
    };
    
    handleCallback();
  }, [searchParams, navigate]);
  
  const error = searchParams.get('error');
  
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Authentication Failed</Typography>
          <Typography variant="body2">
            {error === 'missing_permissions' 
              ? `Please grant all required permissions: ${searchParams.get('permissions')}`
              : searchParams.get('error_description') || 'An error occurred during authentication'}
          </Typography>
        </Alert>
      ) : (
        <>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Processing Authentication...</Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we complete your Facebook authentication.
          </Typography>
        </>
      )}
    </Box>
  );
};

export default FacebookAuthCallback;