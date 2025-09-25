import { useState, useEffect, useCallback } from 'react';
import { CampaignListItem, CampaignFilters, CampaignMetrics } from '../types/campaignManagement';
import axios from 'axios';

interface TrackedCampaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  created_at: string;
  strategy_type: string;
  ad_account_id: string;
  learning_phase_summary?: {
    total_adsets: number;
    learning: number;
    active: number;
    limited: number;
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
    data: Array<{
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
        conversions?: number;
      };
    }>;
  };
}

export const useCampaignManagement = () => {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [metrics, setMetrics] = useState<CampaignMetrics>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSpend: 0,
    totalImpressions: 0,
    totalClicks: 0,
    averageCTR: 0,
    averageCPC: 0,
    totalConversions: 0,
    averageROAS: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const calculateMetrics = (campaignList: CampaignListItem[]): CampaignMetrics => {
    const activeCampaigns = campaignList.filter(c => c.status === 'ACTIVE');

    return {
      totalCampaigns: campaignList.length,
      activeCampaigns: activeCampaigns.length,
      totalSpend: campaignList.reduce((sum, c) => sum + c.totalSpend, 0),
      totalImpressions: campaignList.reduce((sum, c) => sum + c.impressions, 0),
      totalClicks: campaignList.reduce((sum, c) => sum + c.clicks, 0),
      averageCTR: campaignList.length > 0 ? campaignList.reduce((sum, c) => sum + c.ctr, 0) / campaignList.length : 0,
      averageCPC: campaignList.length > 0 ? campaignList.reduce((sum, c) => sum + c.cpc, 0) / campaignList.length : 0,
      totalConversions: campaignList.reduce((sum, c) => sum + c.conversions, 0),
      averageROAS: campaignList.length > 0 ? campaignList.reduce((sum, c) => sum + c.roas, 0) / campaignList.length : 0
    };
  };

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch tracked campaigns from real API
      const trackedResponse = await axios.get('/api/campaigns/manage/tracked');
      const trackedCampaigns: TrackedCampaign[] = trackedResponse.data.campaigns || [];

      // Fetch detailed information for each campaign
      const campaignDetailsPromises = trackedCampaigns.map(async (tracked) => {
        try {
          const detailsResponse = await axios.get(`/api/campaigns/manage/details/${tracked.campaign_id}`);
          return detailsResponse.data.campaign as CampaignDetails;
        } catch (error) {
          console.error(`Failed to fetch details for campaign ${tracked.campaign_id}:`, error);
          return null;
        }
      });

      const campaignDetails = (await Promise.all(campaignDetailsPromises)).filter(c => c !== null) as CampaignDetails[];

      // Transform API data to CampaignListItem format
      const transformedCampaigns: CampaignListItem[] = campaignDetails.map(campaign => {
        const adsets = campaign.adsets?.data || [];

        // Calculate aggregated metrics from ad sets
        const totalMetrics = adsets.reduce((acc, adset) => {
          const m = adset.metrics || { impressions: 0, clicks: 0, spend: 0, conversions: 0 };
          return {
            impressions: acc.impressions + (m.impressions || 0),
            clicks: acc.clicks + (m.clicks || 0),
            spend: acc.spend + (m.spend || 0),
            conversions: acc.conversions + (m.conversions || 0)
          };
        }, { impressions: 0, clicks: 0, spend: 0, conversions: 0 });

        const ctr = totalMetrics.impressions > 0 ? (totalMetrics.clicks / totalMetrics.impressions) * 100 : 0;
        const cpc = totalMetrics.clicks > 0 ? totalMetrics.spend / totalMetrics.clicks : 0;
        const roas = totalMetrics.spend > 0 ? (totalMetrics.conversions * 50) / totalMetrics.spend : 0; // Assuming $50 value per conversion

        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status as 'ACTIVE' | 'PAUSED',
          createdDate: new Date(campaign.created_time).toISOString().split('T')[0],
          adSetsCount: adsets.length,
          totalSpend: totalMetrics.spend / 100, // Convert from cents
          impressions: totalMetrics.impressions,
          clicks: totalMetrics.clicks,
          ctr: parseFloat(ctr.toFixed(2)),
          cpc: parseFloat((cpc / 100).toFixed(2)), // Convert from cents
          conversions: totalMetrics.conversions,
          roas: parseFloat(roas.toFixed(2)),
          dailyBudget: campaign.daily_budget ? campaign.daily_budget / 100 : 0,
          budgetType: campaign.daily_budget ? 'daily' : 'lifetime',
          facebookCampaignId: campaign.id,
          objective: campaign.objective,
          originalAdSetId: adsets[0]?.id || '',
          duplicatedAdSets: adsets.map(adset => ({
            id: adset.id,
            name: adset.name,
            status: adset.status as 'ACTIVE' | 'PAUSED',
            learningStatus: adset.learning_status,
            learningMessage: adset.learning_message
          }))
        };
      });

      setCampaigns(transformedCampaigns);
      setMetrics(calculateMetrics(transformedCampaigns));

    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCampaignStatus = useCallback(async (campaignId: string, status: 'ACTIVE' | 'PAUSED') => {
    try {
      setError('');

      // Update local state immediately for better UX
      setCampaigns(prev => prev.map(campaign =>
        campaign.id === campaignId
          ? { ...campaign, status }
          : campaign
      ));

      // Call real API to update campaign status
      await axios.post('/api/campaigns/manage/status', {
        campaignId,
        status
      });

      // Fetch updated campaign details to ensure synchronization
      setTimeout(() => fetchCampaigns(), 1000);

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update campaign status');
      // Revert local state on error
      fetchCampaigns();
    }
  }, [fetchCampaigns]);

  const bulkUpdateStatus = useCallback(async (campaignIds: string[], status: 'ACTIVE' | 'PAUSED') => {
    try {
      setError('');

      // Update local state immediately
      setCampaigns(prev => prev.map(campaign =>
        campaignIds.includes(campaign.id)
          ? { ...campaign, status }
          : campaign
      ));

      // Update each campaign status via API
      const updatePromises = campaignIds.map(campaignId =>
        axios.post('/api/campaigns/manage/status', { campaignId, status })
      );

      await Promise.all(updatePromises);

      // Refresh campaign data after updates
      setTimeout(() => fetchCampaigns(), 1000);

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update campaigns');
      fetchCampaigns();
    }
  }, [fetchCampaigns]);

  const refreshMetrics = useCallback(() => {
    // Simply refetch from API for real-time data
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Auto-refresh metrics every 30 seconds for active campaigns
  useEffect(() => {
    const interval = setInterval(() => {
      if (campaigns.some(c => c.status === 'ACTIVE')) {
        refreshMetrics();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [campaigns, refreshMetrics]);

  return {
    campaigns,
    metrics,
    loading,
    error,
    updateCampaignStatus,
    bulkUpdateStatus,
    refreshMetrics,
    refetch: fetchCampaigns
  };
};