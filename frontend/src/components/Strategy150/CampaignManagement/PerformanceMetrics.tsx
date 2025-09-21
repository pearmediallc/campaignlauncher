import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Remove,
  Campaign,
  PlayArrow,
  AttachMoney,
  Visibility,
  TouchApp,
  SwapHoriz,
  ShowChart
} from '@mui/icons-material';
import { CampaignMetrics } from '../../../types/campaignManagement';

interface PerformanceMetricsProps {
  metrics: CampaignMetrics;
  loading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  color = 'primary'
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" fontSize="small" />;
      case 'down': return <TrendingDown color="error" fontSize="small" />;
      default: return <Remove color="disabled" fontSize="small" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'success.main';
      case 'down': return 'error.main';
      default: return 'text.secondary';
    }
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ color: `${color}.main`, mr: 1 }}>
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getTrendIcon()}
            {trendValue && (
              <Typography variant="caption" sx={{ color: getTrendColor() }}>
                {trendValue}
              </Typography>
            )}
          </Box>
        )}
      </Box>
      <Typography variant="h5" fontWeight="bold" color={`${color}.main`}>
        {value}
      </Typography>
    </Paper>
  );
};

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  metrics,
  loading = false
}) => {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (number: number) => {
    if (number >= 1000000) {
      return `${(number / 1000000).toFixed(1)}M`;
    }
    if (number >= 1000) {
      return `${(number / 1000).toFixed(1)}K`;
    }
    return number.toLocaleString('en-US');
  };

  const formatPercentage = (number: number) => {
    return `${number.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Performance Overview
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Box key={index} sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
              <Paper sx={{ p: 2, height: 100 }}>
                <Box sx={{ bgcolor: 'action.hover', height: '100%', borderRadius: 1 }} />
              </Paper>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Performance Overview
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`${metrics.activeCampaigns} Active`}
            color="success"
            size="small"
            icon={<PlayArrow />}
          />
          <Chip
            label={`${metrics.totalCampaigns - metrics.activeCampaigns} Paused`}
            color="warning"
            size="small"
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <MetricCard
            title="Total Campaigns"
            value={metrics.totalCampaigns}
            icon={<Campaign />}
            color="primary"
            trend="neutral"
          />
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <MetricCard
            title="Total Spend"
            value={formatCurrency(metrics.totalSpend)}
            icon={<AttachMoney />}
            color="warning"
            trend="up"
            trendValue="+12.5%"
          />
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <MetricCard
            title="Impressions"
            value={formatNumber(metrics.totalImpressions)}
            icon={<Visibility />}
            color="info"
            trend="up"
            trendValue="+8.2%"
          />
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <MetricCard
            title="Clicks"
            value={formatNumber(metrics.totalClicks)}
            icon={<TouchApp />}
            color="success"
            trend="up"
            trendValue="+15.3%"
          />
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <MetricCard
            title="Avg CTR"
            value={formatPercentage(metrics.averageCTR)}
            icon={<SwapHoriz />}
            color="info"
            trend="up"
            trendValue="+0.2%"
          />
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <MetricCard
            title="Avg CPC"
            value={formatCurrency(metrics.averageCPC)}
            icon={<AttachMoney />}
            color="warning"
            trend="down"
            trendValue="-5.1%"
          />
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <MetricCard
            title="Conversions"
            value={formatNumber(metrics.totalConversions)}
            icon={<ShowChart />}
            color="success"
            trend="up"
            trendValue="+22.7%"
          />
        </Box>

        <Box sx={{ flex: '1 1 calc(25% - 12px)', minWidth: 200 }}>
          <MetricCard
            title="Avg ROAS"
            value={`${metrics.averageROAS.toFixed(1)}x`}
            icon={<TrendingUp />}
            color="success"
            trend="up"
            trendValue="+0.3x"
          />
        </Box>
      </Box>
    </Box>
  );
};

export default PerformanceMetrics;