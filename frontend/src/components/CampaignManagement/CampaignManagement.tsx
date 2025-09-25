import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Alert, Button, Card, Form, Table, Badge, Spinner, Container, Row, Col } from 'react-bootstrap';
import { FaPlay, FaPause, FaSync, FaChartLine, FaExclamationTriangle } from 'react-icons/fa';
import './CampaignManagement.css';

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  created_at: string;
  strategy_type: string;
}

interface AdSet {
  id: string;
  name: string;
  status: string;
  learning_status: string;
  learning_message: string;
  daily_budget?: number;
  metrics?: {
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpm: number;
  };
}

interface CampaignDetails {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time: string;
  daily_budget?: number;
  lifetime_budget?: number;
  adsets?: {
    data: AdSet[];
  };
}

const CampaignManagement: React.FC = () => {
  const [trackedCampaigns, setTrackedCampaigns] = useState<Campaign[]>([]);
  const [manualCampaignId, setManualCampaignId] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<CampaignDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTrackedCampaigns();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && selectedCampaign) {
      interval = setInterval(() => {
        fetchCampaignDetails(selectedCampaign);
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedCampaign]);

  const fetchTrackedCampaigns = async () => {
    try {
      const response = await axios.get('/api/campaigns/manage/tracked');
      setTrackedCampaigns(response.data.campaigns || []);
    } catch (error: any) {
      console.error('Error fetching tracked campaigns:', error);
      setError('Failed to fetch tracked campaigns');
    }
  };

  const fetchCampaignDetails = async (campaignId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/campaigns/manage/details/${campaignId}`);
      setCampaignDetails(response.data.campaign);
      setSelectedCampaign(campaignId);
    } catch (error: any) {
      console.error('Error fetching campaign details:', error);
      setError(error.response?.data?.message || 'Failed to fetch campaign details');
      setCampaignDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    setError(null);
    setSuccess(null);
    try {
      const response = await axios.post('/api/campaigns/manage/status', {
        campaignId,
        status: newStatus
      });
      setSuccess(response.data.message);
      // Refresh campaign details
      fetchCampaignDetails(campaignId);
    } catch (error: any) {
      console.error('Error updating campaign status:', error);
      setError(error.response?.data?.message || 'Failed to update campaign status');
    }
  };

  const trackManualCampaign = async () => {
    if (!manualCampaignId.trim()) {
      setError('Please enter a campaign ID');
      return;
    }

    setError(null);
    try {
      await axios.post('/api/campaigns/manage/track', {
        campaignId: manualCampaignId
      });
      setSuccess('Campaign added to tracking');
      setManualCampaignId('');
      // Refresh tracked campaigns list
      fetchTrackedCampaigns();
      // Fetch details of the newly tracked campaign
      fetchCampaignDetails(manualCampaignId);
    } catch (error: any) {
      console.error('Error tracking campaign:', error);
      setError(error.response?.data?.message || 'Failed to add campaign to tracking');
    }
  };

  const getLearningBadge = (status: string) => {
    switch(status) {
      case 'LEARNING':
        return <Badge bg="warning">🔄 Learning</Badge>;
      case 'SUCCESS':
        return <Badge bg="success">✅ Active</Badge>;
      case 'FAIL':
        return <Badge bg="danger">⚠️ Limited</Badge>;
      case 'WAIVING':
        return <Badge bg="info">⏭️ Waived</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00';
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    return num.toLocaleString();
  };

  return (
    <Container className="campaign-management mt-4">
      <h2 className="mb-4">Campaign Management</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Select Campaign</Card.Title>
              <Form.Group className="mb-3">
                <Form.Label>My Launched Campaigns</Form.Label>
                <Form.Select
                  onChange={(e) => e.target.value && fetchCampaignDetails(e.target.value)}
                  value={selectedCampaign || ''}
                >
                  <option value="">-- Select a campaign --</option>
                  {trackedCampaigns.map(campaign => (
                    <option key={campaign.campaign_id} value={campaign.campaign_id}>
                      {campaign.campaign_name} ({campaign.campaign_id})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Manual Campaign Entry</Card.Title>
              <Form.Group>
                <Form.Label>Enter Campaign ID</Form.Label>
                <div className="d-flex">
                  <Form.Control
                    type="text"
                    value={manualCampaignId}
                    onChange={(e) => setManualCampaignId(e.target.value)}
                    placeholder="Enter campaign ID"
                    className="me-2"
                  />
                  <Button
                    variant="primary"
                    onClick={() => manualCampaignId && fetchCampaignDetails(manualCampaignId)}
                  >
                    Fetch
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={trackManualCampaign}
                    className="ms-2"
                  >
                    Track
                  </Button>
                </div>
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="mb-3">
        <Form.Check
          type="switch"
          id="auto-refresh"
          label="Auto-refresh every 30 seconds"
          checked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
        />
      </div>

      {loading && (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Fetching campaign details...</p>
        </div>
      )}

      {!loading && campaignDetails && (
        <Card className="campaign-details">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h3>{campaignDetails.name}</h3>
                <Badge bg={campaignDetails.status === 'ACTIVE' ? 'success' : 'warning'} className="me-2">
                  {campaignDetails.status}
                </Badge>
                <Badge bg="info">{campaignDetails.objective}</Badge>
              </div>
              <div>
                <Button
                  variant={campaignDetails.status === 'ACTIVE' ? 'warning' : 'success'}
                  onClick={() => updateCampaignStatus(
                    campaignDetails.id,
                    campaignDetails.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                  )}
                  className="me-2"
                >
                  {campaignDetails.status === 'ACTIVE' ? (
                    <><FaPause /> Pause</>
                  ) : (
                    <><FaPlay /> Resume</>
                  )}
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={() => fetchCampaignDetails(campaignDetails.id)}
                >
                  <FaSync /> Refresh
                </Button>
              </div>
            </div>

            <Row className="mb-3">
              <Col>
                <strong>Campaign ID:</strong> {campaignDetails.id}
              </Col>
              <Col>
                <strong>Created:</strong> {new Date(campaignDetails.created_time).toLocaleDateString()}
              </Col>
              {campaignDetails.daily_budget && (
                <Col>
                  <strong>Daily Budget:</strong> {formatCurrency(campaignDetails.daily_budget)}
                </Col>
              )}
            </Row>

            <h4 className="mt-4 mb-3">
              Ad Sets ({campaignDetails.adsets?.data?.length || 0})
            </h4>

            {campaignDetails.adsets?.data && campaignDetails.adsets.data.length > 0 ? (
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Ad Set Name</th>
                      <th>Status</th>
                      <th>Learning Phase</th>
                      <th>Daily Budget</th>
                      <th>Impressions</th>
                      <th>Clicks</th>
                      <th>Spend</th>
                      <th>CTR</th>
                      <th>CPM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignDetails.adsets.data.map(adset => (
                      <tr key={adset.id}>
                        <td>{adset.name}</td>
                        <td>
                          <Badge bg={adset.status === 'ACTIVE' ? 'success' : 'secondary'}>
                            {adset.status}
                          </Badge>
                        </td>
                        <td>
                          {getLearningBadge(adset.learning_status)}
                          <small className="d-block text-muted">{adset.learning_message}</small>
                        </td>
                        <td>{formatCurrency(adset.daily_budget)}</td>
                        <td>{formatNumber(adset.metrics?.impressions)}</td>
                        <td>{formatNumber(adset.metrics?.clicks)}</td>
                        <td>{formatCurrency(adset.metrics?.spend)}</td>
                        <td>{adset.metrics?.ctr?.toFixed(2)}%</td>
                        <td>{formatCurrency(adset.metrics?.cpm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <Alert variant="info">
                No ad sets found in this campaign.
              </Alert>
            )}

            {/* Learning Phase Summary */}
            {campaignDetails.adsets?.data && campaignDetails.adsets.data.length > 0 && (
              <Card className="mt-3">
                <Card.Body>
                  <h5>Learning Phase Summary</h5>
                  <Row>
                    <Col>
                      <FaChartLine className="text-warning" />
                      <strong> Learning:</strong>{' '}
                      {campaignDetails.adsets.data.filter(a => a.learning_status === 'LEARNING').length}
                    </Col>
                    <Col>
                      <FaPlay className="text-success" />
                      <strong> Active:</strong>{' '}
                      {campaignDetails.adsets.data.filter(a => a.learning_status === 'SUCCESS').length}
                    </Col>
                    <Col>
                      <FaExclamationTriangle className="text-danger" />
                      <strong> Limited:</strong>{' '}
                      {campaignDetails.adsets.data.filter(a => a.learning_status === 'FAIL').length}
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default CampaignManagement;