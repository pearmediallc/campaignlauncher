// Campaign Management Types for Strategy 1-50-1

export interface CampaignListItem {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT';
  createdDate: string;
  adSetsCount: number;

  // Performance metrics
  totalSpend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;

  // Budget info
  dailyBudget?: number;
  lifetimeBudget?: number;
  budgetType: 'daily' | 'lifetime';

  // Facebook-specific data
  facebookCampaignId: string;
  objective: string;

  // Strategy 1-50-1 specific
  originalAdSetId: string;
  duplicatedAdSets: Array<{
    id: string;
    name: string;
    status: string;
    learningStatus?: string;
    learningMessage?: string;
  }>;
}

export interface CampaignFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  status: string[];
  searchTerm: string;
  performanceFilter?: 'all' | 'high' | 'medium' | 'low';
}

export interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  averageCTR: number;
  averageCPC: number;
  totalConversions: number;
  averageROAS: number;
}

export interface BulkAction {
  type: 'pause' | 'resume' | 'archive' | 'budget_update';
  campaignIds: string[];
  params?: {
    budgetAmount?: number;
    budgetType?: 'daily' | 'lifetime';
  };
}

export interface CampaignUpdateRequest {
  campaignId: string;
  updates: {
    status?: 'ACTIVE' | 'PAUSED';
    dailyBudget?: number;
    lifetimeBudget?: number;
  };
}