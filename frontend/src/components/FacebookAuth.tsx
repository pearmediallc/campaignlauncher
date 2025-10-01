import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Collapse,
  Paper,
  Divider
} from '@mui/material';
import FacebookAccountSelector from './FacebookAccountSelector';
import {
  Facebook,
  CheckCircle,
  Error,
  Warning,
  Info,
  Security,
  Business,
  AttachMoney,
  AccountBalance,
  Campaign,
  Refresh,
  Close,
  ExpandMore,
  ExpandLess,
  LinkOff
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { facebookAuthApi } from '../services/facebookAuthApi';
import { toast } from 'react-toastify';

interface EligibilityCriteria {
  hasActiveAdAccount: boolean;
  hasNoRestrictions: boolean;
  accountAge: number;
  hasSpendingHistory: boolean;
  hasPaymentMethod: boolean;
  businessVerificationStatus?: string;
  totalSpend: number;
  adAccountCount: number;
}

interface AuthStatus {
  authenticated: boolean;
  eligible: boolean;
  hasSelectedResources?: boolean;
  facebookUserId?: string;
  permissions?: string[];
  adAccounts?: any[];
  pages?: any[];
  selectedAdAccount?: any;
  selectedPage?: any;
  selectedPixel?: any;
  eligibility?: {
    status: string;
    criteria: EligibilityCriteria;
    failureReasons: string[];
    expiresAt: string;
    checkedAt: string;
  };
  tokenExpiresAt?: string;
  reason?: string;
}

const FacebookAuth: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);

  const steps = [
    {
      label: 'Connect Facebook Account',
      description: 'Authenticate with your Facebook account',
      icon: <Facebook />
    },
    {
      label: 'Grant Permissions',
      description: 'Allow access to manage ads and pages',
      icon: <Security />
    },
    {
      label: 'Select Resources',
      description: 'Choose your ad account and page',
      icon: <Business />
    },
    {
      label: 'Verify Eligibility',
      description: 'Check account meets requirements',
      icon: <CheckCircle />
    }
  ];

  const requiredPermissions = [
    { name: 'ads_management', label: 'Ads Management', desc: 'Create and manage ad campaigns' },
    { name: 'business_management', label: 'Business Management', desc: 'Access business accounts' },
    { name: 'pages_show_list', label: 'Pages List', desc: 'View your Facebook pages' },
    { name: 'ads_read', label: 'Ads Read', desc: 'Read advertising data' },
    { name: 'pages_read_engagement', label: 'Page Engagement', desc: 'Read page engagement metrics' },
    { name: 'pages_manage_ads', label: 'Page Ads', desc: 'Manage ads for your pages' }
  ];

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for auth callback messages
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'facebook_auth_success') {
        if (authWindow) {
          authWindow.close();
        }
        checkAuthStatus();
        toast.success('Facebook authentication successful!');
      } else if (event.data.type === 'facebook_auth_error') {
        if (authWindow) {
          authWindow.close();
        }
        toast.error(event.data.error || 'Authentication failed');
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [authWindow]);

  const checkAuthStatus = async () => {
    setChecking(true);
    try {
      const response = await facebookAuthApi.getStatus();
      if (response.success) {
        setAuthStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      // CRITICAL: SAFE LOGOUT from Facebook SDK first to clear cached session
      // This ensures users see the Facebook login screen (email/password)
      // instead of auto-logging into the previously connected account
      // BUT only logout if actually connected to prevent errors
      if (window.FB) {
        await new Promise<void>((resolve) => {
          window.FB.getLoginStatus((statusResponse: any) => {
            if (statusResponse.status === 'connected') {
              // Only logout if actually connected
              window.FB.logout(() => {
                console.log('Facebook SDK logout completed before new login');
                resolve();
              });
            } else {
              // Not connected, skip logout and continue
              console.log('Not connected to Facebook, skipping pre-login logout');
              resolve();
            }
          });
        });
      }

      // Clear any cached session data
      sessionStorage.clear();
      localStorage.removeItem('fb_auth_status');

      // Small delay to ensure Facebook SDK logout is fully processed
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await facebookAuthApi.login();
      if (response.success && response.data.authUrl) {
        // Open Facebook OAuth in popup window
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          response.data.authUrl,
          'facebook-auth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
        );

        setAuthWindow(popup);

        // Check if popup was blocked
        if (!popup || popup.closed) {
          toast.error('Please allow popups for Facebook authentication');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.error || 'Failed to initiate login');
    } finally {
      setLoading(false);
    }
  };

  const handleReverify = async () => {
    setLoading(true);
    try {
      const response = await facebookAuthApi.verifyEligibility();
      if (response.success) {
        await checkAuthStatus();
        toast.success('Eligibility reverified successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await facebookAuthApi.logout();
      if (response.success) {
        setAuthStatus(null);
        toast.success('Logged out from Facebook');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const getActiveStep = () => {
    if (!authStatus?.authenticated) return 0;
    if (!authStatus.permissions || authStatus.permissions.length < 6) return 1;
    if (!authStatus.hasSelectedResources) return 2;
    if (!authStatus.eligible) return 3;
    return 4;
  };

  const handleResourcesSelected = () => {
    checkAuthStatus();
    toast.success('Resources selected successfully!');
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Facebook account? You will need to reconnect to create campaigns.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await facebookAuthApi.disconnect();
      
      if (response.success) {
        toast.success('Facebook account disconnected successfully');
        setAuthStatus(null);
        // Refresh the page to reset everything
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error(error.response?.data?.error || 'Failed to disconnect Facebook account');
    } finally {
      setLoading(false);
    }
  };

  const renderEligibilityCriteria = () => {
    if (!authStatus?.eligibility) return null;
    
    const criteria = authStatus.eligibility.criteria;
    const items = [
      {
        label: 'Active Ad Account',
        value: criteria.hasActiveAdAccount,
        detail: `${criteria.adAccountCount} account(s) found`
      },
      {
        label: 'No Restrictions',
        value: criteria.hasNoRestrictions,
        detail: 'Account in good standing'
      },
      {
        label: 'Account Age',
        value: criteria.accountAge >= 30,
        detail: `${criteria.accountAge} days old`
      },
      {
        label: 'Payment Method',
        value: criteria.hasPaymentMethod,
        detail: criteria.hasPaymentMethod ? 'Configured' : 'Not configured'
      },
      {
        label: 'Spending History',
        value: criteria.hasSpendingHistory,
        detail: `$${(criteria.totalSpend || 0).toFixed(2)} total spend`
      }
    ];
    
    if (criteria.businessVerificationStatus) {
      items.push({
        label: 'Business Verification',
        value: criteria.businessVerificationStatus === 'verified',
        detail: criteria.businessVerificationStatus
      });
    }
    
    return (
      <List dense>
        {items.map((item, index) => (
          <ListItem key={index}>
            <ListItemIcon>
              {item.value ? (
                <CheckCircle color="success" fontSize="small" />
              ) : (
                <Error color="error" fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              secondary={item.detail}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  if (checking) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Show account selector if authenticated but resources not selected
  if (authStatus?.authenticated && !authStatus.hasSelectedResources) {
    return (
      <FacebookAccountSelector
        onComplete={handleResourcesSelected}
        onError={(error) => toast.error(error)}
      />
    );
  }

  return (
    <Card elevation={3}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h5" component="h2">
            <Facebook sx={{ mr: 1, verticalAlign: 'middle' }} />
            Facebook Authentication & Verification
          </Typography>
          {authStatus?.authenticated && (
            <Chip
              label={authStatus.eligible ? 'Eligible' : 'Not Eligible'}
              color={authStatus.eligible ? 'success' : 'warning'}
              icon={authStatus.eligible ? <CheckCircle /> : <Warning />}
            />
          )}
        </Box>

        {/* Status Alert */}
        {authStatus && !authStatus.authenticated && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              You need to authenticate with Facebook and verify your eligibility before creating campaigns.
              This ensures you have the necessary permissions and meet Facebook's advertising requirements.
            </Typography>
          </Alert>
        )}

        {authStatus?.authenticated && !authStatus.eligible && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Your account doesn't meet all eligibility requirements:
            </Typography>
            <List dense>
              {authStatus.eligibility?.failureReasons.map((reason, index) => (
                <ListItem key={index} sx={{ py: 0 }}>
                  <ListItemText primary={`• ${reason}`} />
                </ListItem>
              ))}
            </List>
          </Alert>
        )}

        {authStatus?.authenticated && authStatus.eligible && (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                ✓ Your Facebook account is verified and eligible to create ad campaigns.
                Verification expires on {new Date(authStatus.eligibility!.expiresAt).toLocaleDateString()}.
              </Typography>
            </Alert>
            {authStatus.facebookUserId && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Connected as Facebook ID: {authStatus.facebookUserId}
                  {' • '}
                  <strong>Want to use a different Facebook account?</strong> Click "Disconnect Facebook" below.
                </Typography>
              </Alert>
            )}
          </>
        )}

        {/* Authentication Steps */}
        <Stepper activeStep={getActiveStep()} orientation="vertical" sx={{ mb: 3 }}>
          {steps.map((step, index) => (
            <Step key={index} completed={index < getActiveStep()}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: index <= getActiveStep() ? 'primary.main' : 'grey.300',
                      color: 'white'
                    }}
                  >
                    {step.icon}
                  </Box>
                )}
              >
                <Typography variant="subtitle1">{step.label}</Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {/* Action Buttons */}
        <Box display="flex" gap={2} mb={3}>
          {!authStatus?.authenticated ? (
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<Facebook />}
              onClick={handleFacebookLogin}
              disabled={loading}
              fullWidth
            >
              {loading ? 'Connecting...' : 'Connect with Facebook'}
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleReverify}
                disabled={loading}
              >
                Reverify
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LinkOff />}
                onClick={handleDisconnect}
                disabled={loading}
              >
                Disconnect Facebook
              </Button>
            </>
          )}
        </Box>

        {/* Detailed Information */}
        {authStatus?.authenticated && (
          <>
            <Button
              onClick={() => setShowDetails(!showDetails)}
              endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
              sx={{ mb: 2 }}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            
            <Collapse in={showDetails}>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Account Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Facebook User ID: {authStatus.facebookUserId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Token Expires: {new Date(authStatus.tokenExpiresAt!).toLocaleDateString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ad Accounts: {authStatus.adAccounts?.length || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pages: {authStatus.pages?.length || 0}
                </Typography>
              </Paper>

              {authStatus.eligibility && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Eligibility Criteria
                  </Typography>
                  {renderEligibilityCriteria()}
                </Paper>
              )}

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Granted Permissions ({authStatus.permissions?.length || 0}/6)
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                  {requiredPermissions.map((perm) => (
                    <Chip
                      key={perm.name}
                      label={perm.label}
                      size="small"
                      color={authStatus.permissions?.includes(perm.name) ? 'success' : 'default'}
                      variant={authStatus.permissions?.includes(perm.name) ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Paper>
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FacebookAuth;