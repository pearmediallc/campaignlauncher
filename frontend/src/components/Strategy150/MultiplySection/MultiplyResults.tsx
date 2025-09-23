import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Collapse,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  OpenInNew as OpenIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Campaign as CampaignIcon,
  ViewList as ViewListIcon,
  AdsClick as AdsIcon
} from '@mui/icons-material';

interface MultiplyResultsProps {
  results: {
    source: {
      campaignId: string;
      adSetCount: number;
      postId: string;
    };
    results: Array<{
      copyNumber: number;
      campaign: {
        id: string;
        name: string;
      };
      adSetsCreated: number;
      adsCreated: number;
      status: 'success' | 'failed';
    }>;
    errors: Array<{
      copyNumber: number;
      error: string;
      status: 'failed';
    }>;
    summary: {
      requested: number;
      successful: number;
      failed: number;
    };
  };
  onNewMultiplication?: () => void;
}

const MultiplyResults: React.FC<MultiplyResultsProps> = ({
  results,
  onNewMultiplication
}) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const toggleRowExpansion = (copyNumber: number) => {
    setExpandedRows(prev =>
      prev.includes(copyNumber)
        ? prev.filter(num => num !== copyNumber)
        : [...prev, copyNumber]
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a snackbar notification here
      console.log(`${label} copied to clipboard`);
    });
  };

  const openInFacebook = (campaignId: string) => {
    window.open(
      `https://business.facebook.com/adsmanager/manage/campaigns?campaign_id=${campaignId}`,
      '_blank'
    );
  };

  const allResults = [...results.results, ...results.errors];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Multiplication Complete
      </Typography>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Requested
                  </Typography>
                  <Typography variant="h4">
                    {results.summary.requested}
                  </Typography>
                </Box>
                <CampaignIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Successful
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {results.summary.successful}
                  </Typography>
                </Box>
                <SuccessIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Failed
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {results.summary.failed}
                  </Typography>
                </Box>
                <ErrorIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Source Campaign Info */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Source Campaign
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="body2" color="textSecondary">
              Campaign ID
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body1">{results.source.campaignId}</Typography>
              <IconButton
                size="small"
                onClick={() => copyToClipboard(results.source.campaignId, 'Campaign ID')}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="body2" color="textSecondary">
              Ad Sets
            </Typography>
            <Typography variant="body1">{results.source.adSetCount}</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="body2" color="textSecondary">
              Post ID
            </Typography>
            <Typography variant="body1">{results.source.postId || 'N/A'}</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Results Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>Copy #</TableCell>
              <TableCell>Campaign Name</TableCell>
              <TableCell>Campaign ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ad Sets</TableCell>
              <TableCell>Ads</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allResults.map((result) => {
              const isExpanded = expandedRows.includes(result.copyNumber);
              const isSuccess = result.status === 'success';

              return (
                <React.Fragment key={result.copyNumber}>
                  <TableRow>
                    <TableCell>
                      {isSuccess && (
                        <IconButton
                          size="small"
                          onClick={() => toggleRowExpansion(result.copyNumber)}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell>{result.copyNumber}</TableCell>
                    <TableCell>
                      {isSuccess ? result.campaign.name : '-'}
                    </TableCell>
                    <TableCell>
                      {isSuccess ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">{result.campaign.id}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(result.campaign.id, 'Campaign ID')}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={result.status}
                        color={isSuccess ? 'success' : 'error'}
                        size="small"
                        icon={isSuccess ? <SuccessIcon /> : <ErrorIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      {isSuccess ? result.adSetsCreated : '-'}
                    </TableCell>
                    <TableCell>
                      {isSuccess ? result.adsCreated : '-'}
                    </TableCell>
                    <TableCell>
                      {isSuccess && (
                        <Tooltip title="Open in Facebook Ads Manager">
                          <IconButton
                            size="small"
                            onClick={() => openInFacebook(result.campaign.id)}
                          >
                            <OpenIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                  {isSuccess && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 0 }}>
                        <Collapse in={isExpanded}>
                          <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Campaign Details
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <ViewListIcon fontSize="small" color="action" />
                                  <Typography variant="body2">
                                    {result.adSetsCreated} Ad Sets Created
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <AdsIcon fontSize="small" color="action" />
                                  <Typography variant="body2">
                                    {result.adsCreated} Ads Created
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" color="textSecondary">
                                  Using Post ID: {results.source.postId}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isSuccess && 'error' in result && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Alert severity="error" sx={{ my: 1 }}>
                          <Typography variant="body2">
                            Error: {result.error}
                          </Typography>
                        </Alert>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Success Message */}
      {results.summary.successful > 0 && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2">
            Successfully created {results.summary.successful} campaign{results.summary.successful !== 1 ? 's' : ''}.
            Each campaign contains {results.source.adSetCount} ad sets with corresponding ads.
            All campaigns are created in PAUSED state for your review.
          </Typography>
        </Alert>
      )}

      {/* Error Summary */}
      {results.summary.failed > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {results.summary.failed} campaign{results.summary.failed !== 1 ? 's' : ''} failed to create.
            You can retry these individually or check Facebook Ads Manager for more details.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default MultiplyResults;