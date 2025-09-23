import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Check as CheckIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
  ContentPaste as PasteIcon
} from '@mui/icons-material';
import api from '../../../services/api';

interface CampaignIdInputProps {
  campaignId: string;
  postId: string;
  onCampaignIdChange: (id: string) => void;
  onPostIdChange: (id: string) => void;
  onValidationComplete?: (isValid: boolean) => void;
}

const CampaignIdInput: React.FC<CampaignIdInputProps> = ({
  campaignId,
  postId,
  onCampaignIdChange,
  onPostIdChange,
  onValidationComplete
}) => {
  const [validating, setValidating] = useState(false);
  const [campaignValid, setCampaignValid] = useState<boolean | null>(null);
  const [postIdValid, setPostIdValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [campaignDetails, setCampaignDetails] = useState<any>(null);

  // Validate campaign ID format
  const isValidCampaignIdFormat = (id: string): boolean => {
    // Facebook campaign IDs are typically numeric strings
    return /^\d+$/.test(id.trim());
  };

  // Validate post ID format
  const isValidPostIdFormat = (id: string): boolean => {
    // Facebook post IDs have format: pageId_postId (e.g., "123456789_987654321")
    return /^\d+_\d+$/.test(id.trim());
  };

  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // Try to extract campaign ID from the text
        const campaignMatch = text.match(/\b(\d{10,})\b/);
        if (campaignMatch) {
          onCampaignIdChange(campaignMatch[1]);
          validateCampaignId(campaignMatch[1]);
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  // Validate campaign ID with backend
  const validateCampaignId = async (id?: string) => {
    const idToValidate = id || campaignId;

    if (!idToValidate || !isValidCampaignIdFormat(idToValidate)) {
      setCampaignValid(false);
      setValidationMessage('Invalid campaign ID format');
      return;
    }

    setValidating(true);
    setValidationMessage('');

    try {
      // This endpoint would verify the campaign exists and is a Strategy 150 campaign
      // Add skipDetails=true to avoid fetching all ad sets (prevents rate limit)
      const response = await api.get(`/campaigns/strategy-150/verify/${idToValidate}?skipDetails=true`);

      if (response.data.success) {
        setCampaignValid(true);
        setCampaignDetails(response.data.campaign);
        setValidationMessage(`✓ Valid Strategy 150 campaign found: ${response.data.campaign?.name || 'Campaign'}`);

        // If post ID is returned, auto-populate it
        if (response.data.postId && !postId) {
          onPostIdChange(response.data.postId);
          setPostIdValid(true);
        }

        if (onValidationComplete) {
          onValidationComplete(true);
        }
      } else {
        setCampaignValid(false);
        setValidationMessage(response.data.error || 'Campaign not found or not a Strategy 150 campaign');
        if (onValidationComplete) {
          onValidationComplete(false);
        }
      }
    } catch (err: any) {
      console.error('Campaign validation error:', err);
      setCampaignValid(false);
      setValidationMessage(err.response?.data?.error || 'Failed to validate campaign');
      if (onValidationComplete) {
        onValidationComplete(false);
      }
    } finally {
      setValidating(false);
    }
  };

  // Validate post ID with backend
  const validatePostId = async () => {
    if (!postId) {
      setPostIdValid(null);
      return;
    }

    if (!isValidPostIdFormat(postId)) {
      setPostIdValid(false);
      return;
    }

    try {
      const response = await api.get(`/campaigns/strategy-150/verify-post/${postId}`);
      setPostIdValid(response.data.success);
    } catch (err) {
      console.error('Post ID validation error:', err);
      setPostIdValid(false);
    }
  };

  // Auto-validate when campaign ID changes
  useEffect(() => {
    if (campaignId && campaignId.length > 10) {
      const timer = setTimeout(() => {
        validateCampaignId();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setCampaignValid(null);
      setValidationMessage('');
    }
  }, [campaignId]);

  // Auto-validate post ID when it changes
  useEffect(() => {
    if (postId && postId.includes('_')) {
      const timer = setTimeout(() => {
        validatePostId();
      }, 500);
      return () => clearTimeout(timer);
    } else if (postId) {
      setPostIdValid(null);
    }
  }, [postId]);

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <TextField
            fullWidth
            label="Campaign ID"
            value={campaignId}
            onChange={(e) => onCampaignIdChange(e.target.value)}
            placeholder="Enter Facebook Campaign ID (e.g., 120201234567890)"
            required
            error={campaignValid === false}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {validating ? (
                    <CircularProgress size={20} />
                  ) : campaignValid === true ? (
                    <CheckIcon color="success" />
                  ) : campaignValid === false ? (
                    <ClearIcon color="error" />
                  ) : null}
                  <Tooltip title="Paste from clipboard">
                    <IconButton onClick={handlePaste} size="small">
                      <PasteIcon />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
            helperText={
              validationMessage ||
              "Enter the Campaign ID of the Strategy 150 campaign you want to multiply"
            }
          />
        </Box>

        <Box>
          <TextField
            fullWidth
            label="Post ID (Optional)"
            value={postId}
            onChange={(e) => onPostIdChange(e.target.value)}
            placeholder="e.g., 123456789_987654321"
            error={postIdValid === false}
            InputProps={{
              endAdornment: postIdValid === true ? (
                <InputAdornment position="end">
                  <CheckIcon color="success" />
                </InputAdornment>
              ) : postIdValid === false ? (
                <InputAdornment position="end">
                  <ClearIcon color="error" />
                </InputAdornment>
              ) : null
            }}
            helperText="Optional: Provide the Post ID if not auto-detected. Format: pageId_postId"
          />
        </Box>

        {campaignDetails && (
          <Box>
            <Alert severity="success">
              <Typography variant="body2">
                <strong>Campaign Found:</strong> {campaignDetails.name}
              </Typography>
              {campaignDetails.adSetCount && (
                <Typography variant="body2">
                  <strong>Ad Sets:</strong> {campaignDetails.adSetCount}
                </Typography>
              )}
              {campaignDetails.status && (
                <Typography variant="body2">
                  <strong>Status:</strong> {campaignDetails.status}
                </Typography>
              )}
            </Alert>
          </Box>
        )}

        <Box>
          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="body2">
              <strong>Tips:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Campaign ID can be found in Facebook Ads Manager URL or campaign details</li>
                <li>Post ID is automatically detected in most cases</li>
                <li>All multiplied campaigns will use the same post/creative</li>
              </ul>
            </Typography>
          </Alert>
        </Box>
      </Box>
    </Box>
  );
};

export default CampaignIdInput;