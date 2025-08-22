import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Error, Refresh } from '@mui/icons-material';
import { campaignApi } from '../services/api';

const StatusChecker: React.FC = () => {
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');

  const checkTokenStatus = async () => {
    setChecking(true);
    try {
      const response = await campaignApi.validateToken();
      setTokenValid(response.success);
      setMessage(response.message);
    } catch (error) {
      setTokenValid(false);
      setMessage('Invalid or expired access token');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkTokenStatus();
  }, []);

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">API Status</Typography>
          {checking ? (
            <CircularProgress size={20} />
          ) : tokenValid === true ? (
            <Chip
              icon={<CheckCircle />}
              label="Connected"
              color="success"
              size="small"
            />
          ) : tokenValid === false ? (
            <Chip
              icon={<Error />}
              label="Disconnected"
              color="error"
              size="small"
            />
          ) : null}
        </Box>
        <Button
          onClick={checkTokenStatus}
          startIcon={<Refresh />}
          size="small"
          disabled={checking}
        >
          Refresh
        </Button>
      </Box>
      
      {tokenValid === false && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {message}. Please update your access token in the backend .env file.
        </Alert>
      )}
      
      {tokenValid === true && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Default Settings:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Chip label="Objective: OUTCOME_LEADS" size="small" variant="outlined" />
            <Chip label="Bid Strategy: LOWEST_COST" size="small" variant="outlined" />
            <Chip label="CTA: LEARN_MORE" size="small" variant="outlined" />
            <Chip label="Status: PAUSED" size="small" variant="outlined" />
            <Chip label="Placements: Automatic" size="small" variant="outlined" />
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default StatusChecker;