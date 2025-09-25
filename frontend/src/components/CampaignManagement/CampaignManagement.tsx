import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

  const getLearningBadgeClass = (status: string) => {
    switch(status) {
      case 'LEARNING':
        return 'badge bg-warning';
      case 'SUCCESS':
        return 'badge bg-success';
      case 'FAIL':
        return 'badge bg-danger';
      case 'WAIVING':
        return 'badge bg-info';
      default:
        return 'badge bg-secondary';
    }
  };

  const getLearningBadgeText = (status: string) => {
    switch(status) {
      case 'LEARNING':
        return '🔄 Learning';
      case 'SUCCESS':
        return '✅ Active';
      case 'FAIL':
        return '⚠️ Limited';
      case 'WAIVING':
        return '⏭️ Waived';
      default:
        return 'Unknown';
    }
  };

  const formatCurrency = (amount?: number | string) => {
    if (!amount) return '$0.00';
    const numAmount = Number(amount);
    if (isNaN(numAmount)) return '$0.00';
    return `$${(numAmount / 100).toFixed(2)}`;
  };

  const formatNumber = (num?: number | string) => {
    if (!num) return '0';
    const numValue = Number(num);
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString();
  };

  return (
    <div className="container campaign-management mt-4">
      <h2 className="mb-4">Campaign Management</h2>

      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible" role="alert">
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
        </div>
      )}

      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Select Campaign</h5>
              <div className="mb-3">
                <label className="form-label">My Launched Campaigns</label>
                <select
                  className="form-select"
                  onChange={(e) => e.target.value && fetchCampaignDetails(e.target.value)}
                  value={selectedCampaign || ''}
                >
                  <option value="">-- Select a campaign --</option>
                  {trackedCampaigns.map(campaign => (
                    <option key={campaign.campaign_id} value={campaign.campaign_id}>
                      {campaign.campaign_name} ({campaign.campaign_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Manual Campaign Entry</h5>
              <div className="mb-3">
                <label className="form-label">Enter Campaign ID</label>
                <div className="d-flex">
                  <input
                    type="text"
                    className="form-control me-2"
                    value={manualCampaignId}
                    onChange={(e) => setManualCampaignId(e.target.value)}
                    placeholder="Enter campaign ID"
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => manualCampaignId && fetchCampaignDetails(manualCampaignId)}
                  >
                    Fetch
                  </button>
                  <button
                    className="btn btn-outline-secondary ms-2"
                    onClick={trackManualCampaign}
                  >
                    Track
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id="auto-refresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="auto-refresh">
            Auto-refresh every 30 seconds
          </label>
        </div>
      </div>

      {loading && (
        <div className="text-center my-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Fetching campaign details...</p>
        </div>
      )}

      {!loading && campaignDetails && (
        <div className="card campaign-details">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h3>{campaignDetails.name}</h3>
                <span className={`badge ${campaignDetails.status === 'ACTIVE' ? 'bg-success' : 'bg-warning'} me-2`}>
                  {campaignDetails.status}
                </span>
                <span className="badge bg-info">{campaignDetails.objective}</span>
              </div>
              <div>
                <button
                  className={`btn ${campaignDetails.status === 'ACTIVE' ? 'btn-warning' : 'btn-success'} me-2`}
                  onClick={() => updateCampaignStatus(
                    campaignDetails.id,
                    campaignDetails.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                  )}
                >
                  {campaignDetails.status === 'ACTIVE' ? '⏸ Pause' : '▶ Resume'}
                </button>
                <button
                  className="btn btn-outline-primary"
                  onClick={() => fetchCampaignDetails(campaignDetails.id)}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col">
                <strong>Campaign ID:</strong> {campaignDetails.id}
              </div>
              <div className="col">
                <strong>Created:</strong> {new Date(campaignDetails.created_time).toLocaleDateString()}
              </div>
              {campaignDetails.daily_budget && (
                <div className="col">
                  <strong>Daily Budget:</strong> {formatCurrency(campaignDetails.daily_budget)}
                </div>
              )}
            </div>

            <h4 className="mt-4 mb-3">
              Ad Sets ({campaignDetails.adsets?.data?.length || 0})
            </h4>

            {campaignDetails.adsets?.data && campaignDetails.adsets.data.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover">
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
                          <span className={`badge ${adset.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                            {adset.status}
                          </span>
                        </td>
                        <td>
                          <span className={getLearningBadgeClass(adset.learning_status)}>
                            {getLearningBadgeText(adset.learning_status)}
                          </span>
                          <small className="d-block text-muted">{adset.learning_message}</small>
                        </td>
                        <td>{formatCurrency(adset.daily_budget)}</td>
                        <td>{formatNumber(adset.metrics?.impressions)}</td>
                        <td>{formatNumber(adset.metrics?.clicks)}</td>
                        <td>{formatCurrency(adset.metrics?.spend)}</td>
                        <td>{adset.metrics?.ctr ? (isNaN(Number(adset.metrics.ctr)) ? '0.00' : Number(adset.metrics.ctr).toFixed(2)) : '0.00'}%</td>
                        <td>{formatCurrency(adset.metrics?.cpm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-info">
                No ad sets found in this campaign.
              </div>
            )}

            {/* Learning Phase Summary */}
            {campaignDetails.adsets?.data && campaignDetails.adsets.data.length > 0 && (
              <div className="card mt-3">
                <div className="card-body">
                  <h5>Learning Phase Summary</h5>
                  <div className="row">
                    <div className="col">
                      <span className="text-warning">📊</span>
                      <strong> Learning:</strong>{' '}
                      {campaignDetails.adsets.data.filter(a => a.learning_status === 'LEARNING').length}
                    </div>
                    <div className="col">
                      <span className="text-success">▶</span>
                      <strong> Active:</strong>{' '}
                      {campaignDetails.adsets.data.filter(a => a.learning_status === 'SUCCESS').length}
                    </div>
                    <div className="col">
                      <span className="text-danger">⚠️</span>
                      <strong> Limited:</strong>{' '}
                      {campaignDetails.adsets.data.filter(a => a.learning_status === 'FAIL').length}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManagement;