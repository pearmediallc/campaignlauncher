import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Alert,
  Paper,
  Divider,
  Switch,
  FormHelperText
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { Campaign } from '@mui/icons-material';
import {
  BUYING_TYPE_OPTIONS,
  OBJECTIVE_OPTIONS,
  BUDGET_LEVEL_OPTIONS,
  BID_STRATEGY_OPTIONS,
  SPECIAL_AD_CATEGORIES,
  Strategy150FormData
} from '../../../types/strategy150';

const CampaignSection: React.FC = () => {
  const { control, watch, setValue } = useFormContext<Strategy150FormData>();

  const buyingType = watch('buyingType');
  const objective = watch('objective');
  const budgetLevel = watch('budgetLevel');
  const campaignBudgetOptimization = watch('campaignBudgetOptimization');
  const budgetType = watch('budgetType');

  // Group objectives by category for better UX
  const groupedObjectives = OBJECTIVE_OPTIONS.reduce((acc, obj) => {
    const category = obj.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(obj);
    return acc;
  }, {} as Record<string, typeof OBJECTIVE_OPTIONS>);

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Campaign sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6">Campaign Settings</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Campaign Name */}
        <Box>
          <Controller
            name="campaignName"
            control={control}
            rules={{ required: 'Campaign name is required' }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="Campaign Name"
                placeholder="Enter your campaign name"
                error={!!error}
                helperText={error?.message || 'Give your campaign a descriptive name'}
              />
            )}
          />
        </Box>

        {/* Buying Type and Campaign Objective */}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            <Controller
              name="buyingType"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Buying Type</InputLabel>
                  <Select {...field} label="Buying Type">
                    {BUYING_TYPE_OPTIONS.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Auction is recommended for most campaigns
                  </FormHelperText>
                </FormControl>
              )}
            />
          </Box>

          <Box sx={{ flex: 1 }}>
            <Controller
              name="objective"
              control={control}
              rules={{ required: 'Campaign objective is required' }}
              render={({ field, fieldState: { error } }) => (
                <FormControl fullWidth error={!!error}>
                  <InputLabel>Campaign Objective</InputLabel>
                  <Select {...field} label="Campaign Objective">
                    {Object.entries(groupedObjectives).map(([category, objectives]) => [
                      <MenuItem key={`header-${category}`} disabled sx={{ fontWeight: 'bold' }}>
                        {category}
                      </MenuItem>,
                      ...objectives.map(option => (
                        <MenuItem key={option.value} value={option.value} sx={{ pl: 4 }}>
                          {option.label}
                        </MenuItem>
                      ))
                    ])}
                  </Select>
                  {error && <FormHelperText>{error.message}</FormHelperText>}
                </FormControl>
              )}
            />
          </Box>
        </Box>

        {/* Special Ad Categories */}
        <Box>
          <Controller
            name="specialAdCategories"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Special Ad Categories</InputLabel>
                <Select
                  {...field}
                  multiple
                  label="Special Ad Categories"
                  renderValue={(selected) => {
                    if (!selected || (selected as string[]).length === 0) {
                      return 'None';
                    }
                    return (selected as string[])
                      .map(val => SPECIAL_AD_CATEGORIES.find(cat => cat.value === val)?.label)
                      .filter(Boolean)
                      .join(', ');
                  }}
                >
                  {SPECIAL_AD_CATEGORIES.map(category => (
                    <MenuItem key={category.value} value={category.value}>
                      <Checkbox checked={(field.value as string[])?.includes(category.value)} />
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Select if your ad is about credit, employment, housing, social issues, or online gambling
                </FormHelperText>
              </FormControl>
            )}
          />
        </Box>

        <Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Budget & Schedule
          </Typography>
        </Box>

        {/* Budget Level - Default to Campaign (CBO) */}
        <Box>
          <Controller
            name="budgetLevel"
            control={control}
            defaultValue="campaign"
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Budget Level</InputLabel>
                <Select {...field} label="Budget Level">
                  {BUDGET_LEVEL_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Campaign Budget Optimization (CBO) automatically manages your budget across ad sets
                </FormHelperText>
              </FormControl>
            )}
          />
        </Box>

        {/* Campaign Budget Optimization Toggle */}
        {budgetLevel === 'campaign' && (
          <Box>
            <Controller
              name="campaignBudgetOptimization"
              control={control}
              defaultValue={true}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      color="primary"
                    />
                  }
                  label="Enable Campaign Budget Optimization"
                />
              )}
            />
          </Box>
        )}

        {/* Budget Type and Amount */}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1 }}>
            <Controller
              name="budgetType"
              control={control}
              defaultValue="daily"
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Budget Type</InputLabel>
                  <Select {...field} label="Budget Type">
                    <MenuItem value="daily">Daily Budget</MenuItem>
                    <MenuItem value="lifetime">Lifetime Budget</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Box>

          {/* Budget Amount - Campaign Level */}
          {budgetLevel === 'campaign' && (
            <>
              <Box sx={{ flex: 1 }}>
                <Controller
                  name={budgetType === 'daily' ? 'campaignBudget.dailyBudget' : 'campaignBudget.lifetimeBudget'}
                  control={control}
                  defaultValue={50}
                  rules={{
                    required: 'Budget amount is required',
                    min: { value: 1, message: 'Budget must be at least $1' }
                  }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label={budgetType === 'daily' ? 'Daily Budget' : 'Lifetime Budget'}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                      error={!!error}
                      helperText={error?.message || `${budgetType === 'daily' ? 'Daily' : 'Total'} budget for this campaign`}
                    />
                  )}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Controller
                  name="campaignSpendingLimit"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Campaign Spending Limit (Optional)"
                      placeholder="Leave empty for no limit"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                      helperText="Maximum total spend for this campaign (optional)"
                    />
                  )}
                />
              </Box>
            </>
          )}
        </Box>

        {/* Bid Strategy */}
        {buyingType === 'AUCTION' && (
          <Box>
            <Controller
              name="bidStrategy"
              control={control}
              defaultValue="LOWEST_COST_WITHOUT_CAP"
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Bid Strategy</InputLabel>
                  <Select {...field} label="Bid Strategy">
                    {BID_STRATEGY_OPTIONS.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Choose how Facebook should bid in the auction for your ads
                  </FormHelperText>
                </FormControl>
              )}
            />
          </Box>
        )}

        {/* Bid Amount Control (for bid cap strategy) */}
        {watch('bidStrategy') === 'LOWEST_COST_WITH_BID_CAP' && (
          <Box sx={{ maxWidth: '50%' }}>
            <Controller
              name="bidAmount"
              control={control}
              rules={{
                required: 'Bid amount is required when using bid cap strategy',
                min: { value: 0.01, message: 'Bid amount must be greater than 0' }
              }}
              render={({ field, fieldState: { error } }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="number"
                  label="Bid Cap Amount"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    inputProps: { step: 0.01, min: 0.01 }
                  }}
                  error={!!error}
                  helperText={error?.message || "Maximum amount you're willing to bid per optimization event"}
                />
              )}
            />
          </Box>
        )}

        {/* Cost Control (for cost cap strategy) */}
        {watch('bidStrategy') === 'COST_CAP' && (
          <Box sx={{ maxWidth: '50%' }}>
            <Controller
              name="costCap"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="number"
                  label="Cost Cap"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                  helperText="Maximum cost per optimization event"
                />
              )}
            />
          </Box>
        )}

        {/* ROAS Control (for ROAS bid strategy) */}
        {watch('bidStrategy') === 'LOWEST_COST_WITH_MIN_ROAS' && (
          <Box sx={{ maxWidth: '50%' }}>
            <Controller
              name="minRoas"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="number"
                  label="Minimum ROAS"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">x</InputAdornment>
                  }}
                  helperText="Minimum return on ad spend (e.g., 2.5 for 250% return)"
                />
              )}
            />
          </Box>
        )}


        {/* Info Alert for Ad Set Budget */}
        {budgetLevel === 'adset' && (
          <Box>
            <Alert severity="info">
              Budget will be configured at the Ad Set level. Each ad set can have its own daily or lifetime budget.
            </Alert>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default CampaignSection;