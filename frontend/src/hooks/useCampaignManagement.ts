import { useState, useEffect, useCallback } from 'react';
import { CampaignListItem, CampaignFilters, CampaignMetrics } from '../types/campaignManagement';

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

  // Mock data for initial implementation
  const generateMockCampaigns = (): CampaignListItem[] => {
    return [
      {
        id: '1',
        name: 'Summer Sale Campaign',
        status: 'ACTIVE',
        createdDate: '2024-01-15',
        adSetsCount: 50,
        totalSpend: 1247.50,
        impressions: 156200,
        clicks: 3890,
        ctr: 2.49,
        cpc: 0.32,
        conversions: 127,
        roas: 3.2,
        dailyBudget: 50,
        budgetType: 'daily',
        facebookCampaignId: 'fb_12345',
        objective: 'CONVERSIONS',
        originalAdSetId: 'adset_001',
        duplicatedAdSets: Array.from({ length: 49 }, (_, i) => ({
          id: `adset_${String(i + 2).padStart(3, '0')}`,
          name: `Summer Sale - Ad Set ${i + 2}`,
          status: 'ACTIVE'
        }))
      },
      {
        id: '2',
        name: 'Winter Promotion',
        status: 'PAUSED',
        createdDate: '2024-01-10',
        adSetsCount: 50,
        totalSpend: 892.30,
        impressions: 98500,
        clicks: 2140,
        ctr: 2.17,
        cpc: 0.42,
        conversions: 76,
        roas: 2.8,
        dailyBudget: 30,
        budgetType: 'daily',
        facebookCampaignId: 'fb_12346',
        objective: 'CONVERSIONS',
        originalAdSetId: 'adset_101',
        duplicatedAdSets: Array.from({ length: 49 }, (_, i) => ({
          id: `adset_${String(i + 102).padStart(3, '0')}`,
          name: `Winter Promotion - Ad Set ${i + 2}`,
          status: 'PAUSED'
        }))
      },
      {
        id: '3',
        name: 'Flash Sale Weekend',
        status: 'ACTIVE',
        createdDate: '2024-01-20',
        adSetsCount: 50,
        totalSpend: 2156.80,
        impressions: 245600,
        clicks: 7890,
        ctr: 3.21,
        cpc: 0.27,
        conversions: 234,
        roas: 4.1,
        dailyBudget: 100,
        budgetType: 'daily',
        facebookCampaignId: 'fb_12347',
        objective: 'CONVERSIONS',
        originalAdSetId: 'adset_201',
        duplicatedAdSets: Array.from({ length: 49 }, (_, i) => ({
          id: `adset_${String(i + 202).padStart(3, '0')}`,
          name: `Flash Sale Weekend - Ad Set ${i + 2}`,
          status: 'ACTIVE'
        }))
      }
    ];
  };

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

      // For now, use mock data. In production, this would call:
      // const response = await fetch('/api/campaigns/strategy-150/list', {
      //   headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      // });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockCampaigns = generateMockCampaigns();
      setCampaigns(mockCampaigns);
      setMetrics(calculateMetrics(mockCampaigns));

    } catch (err: any) {
      setError(err.message || 'Failed to fetch campaigns');
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

      // In production, this would call:
      // await fetch(`/api/campaigns/strategy-150/status/${campaignId}`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`
      //   },
      //   body: JSON.stringify({ status })
      // });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err: any) {
      setError(err.message || 'Failed to update campaign status');
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

      // In production, bulk API call would be made here
      await new Promise(resolve => setTimeout(resolve, 800));

    } catch (err: any) {
      setError(err.message || 'Failed to update campaigns');
      fetchCampaigns();
    }
  }, [fetchCampaigns]);

  const refreshMetrics = useCallback(() => {
    const updatedCampaigns = campaigns.map(campaign => ({
      ...campaign,
      // Simulate real-time metric updates
      totalSpend: campaign.totalSpend + Math.random() * 10,
      impressions: campaign.impressions + Math.floor(Math.random() * 1000),
      clicks: campaign.clicks + Math.floor(Math.random() * 50),
      conversions: campaign.conversions + Math.floor(Math.random() * 5)
    }));

    setCampaigns(updatedCampaigns);
    setMetrics(calculateMetrics(updatedCampaigns));
  }, [campaigns]);

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