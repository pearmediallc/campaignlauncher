# Strategy 1-50-1 Complete Issue Analysis

## CRITICAL ISSUES FOUND

### 1. Campaign Creation Issues (createCampaign method)

**PROBLEM**: The `createCampaign` method is IGNORING all passed parameters!

**Current Code (WRONG):**
```javascript
async createCampaign(campaignData) {
  const params = {
    name: `[REVIEW] ${campaignData.name}`,
    objective: 'OUTCOME_LEADS',  // HARDCODED! Should use campaignData.objective
    status: 'PAUSED',
    special_ad_categories: JSON.stringify([]), // HARDCODED! Should use campaignData.specialAdCategories
    buying_type: 'AUCTION', // HARDCODED! Should use campaignData.buyingType
    access_token: this.accessToken
  };
}
```

**Should Be:**
```javascript
async createCampaign(campaignData) {
  const params = {
    name: `[REVIEW] ${campaignData.name}`,
    objective: campaignData.objective || 'OUTCOME_LEADS',
    status: campaignData.status || 'PAUSED',
    special_ad_categories: JSON.stringify(campaignData.specialAdCategories || []),
    buying_type: campaignData.buyingType || 'AUCTION',
    access_token: this.accessToken
  };
}
```

### 2. Objective Mapping Issues

**Frontend Sends**: `OUTCOME_LEADS`
**mapObjective Returns**: `OUTCOME_LEADS` (correct now after fix)
**But createCampaign**: Ignores it and uses hardcoded 'OUTCOME_LEADS'

### 3. Special Ad Categories Issue

**Frontend Sends**: `['HOUSING']` (array)
**Meta API Expects**: Stringified array in POST params
**Current Code**: Hardcoded to empty array `[]`

### 4. Budget Issues

**Correctly Handled**: Budget is converted to cents (×100) ✓
**Issue**: Should validate budget is a number before multiplication

### 5. Targeting Structure Issues

**Current Structure**:
```javascript
{
  locations: {
    countries: ['US']
  },
  ageMin: 18,
  ageMax: 65,
  genders: ['all']
}
```

**Meta API Expects**:
```javascript
{
  geo_locations: {  // Note: geo_locations, not locations
    countries: ['US']
  },
  age_min: 18,  // Note: age_min with underscore
  age_max: 65,  // Note: age_max with underscore
  genders: [0]  // 0=all, 1=male, 2=female
}
```

### 6. Promoted Object Issues

**For OUTCOME_LEADS with website conversions**:
- Current: Uses `custom_event_type: 'LEAD'`
- Meta API: Expects `custom_event_type: 'Lead'` (case sensitive!)

### 7. Performance Goal Not Being Used

**Frontend Sends**: `performanceGoal: 'maximize_conversions'`
**Backend**: Doesn't use it at all!
**Meta API**: Some objectives require specific performance goals

### 8. Missing Campaign Budget Optimization (CBO) Settings

**Frontend Sends**: `campaignBudgetOptimization`
**Backend**: Completely ignores it

### 9. Attribution Settings Not Used

**Frontend Sends**: `attributionSetting`, `attributionWindow`
**Backend**: Doesn't pass them to Meta API

### 10. Placement Settings Ignored

**Frontend Sends**: `placementType: 'automatic'`, `placements`
**Backend**: Doesn't use them in ad set creation

## Data Flow Analysis

### What Frontend Sends (Correct):
```javascript
{
  campaignName: '1-50-1 strategy testing final',
  objective: 'OUTCOME_LEADS',
  primaryText: 'it worked guys',
  headline: 'campaign with auth part',
  budgetType: 'daily',
  dailyBudget: 50,  // number
  specialAdCategories: ['HOUSING'],
  performanceGoal: 'maximize_conversions',
  conversionEvent: 'Lead',
  bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
  targeting: { locations: {...}, ageMin: 18, ageMax: 65 },
  placementType: 'automatic',
  facebookPage: '387826757757253',
  pixel: '791897666987834'
}
```

### What Actually Gets Sent to Meta (WRONG):
```javascript
// Campaign
{
  objective: 'OUTCOME_LEADS',  // Hardcoded, ignores input
  special_ad_categories: '[]',  // Hardcoded empty!
  buying_type: 'AUCTION'  // Hardcoded
}

// Ad Set
{
  optimization_goal: 'OFFSITE_CONVERSIONS',  // Doesn't check objective compatibility
  promoted_object: {
    pixel_id: '791897666987834',
    custom_event_type: 'LEAD'  // Should be 'Lead'
  },
  targeting: {...}  // Structure issues
  // Missing: performance_goal, attribution_spec, placements
}
```

## Why The Error Occurs

The Facebook API returns "Invalid parameter (Code: 100)" because:

1. **Special Ad Categories**: When you select HOUSING, but it sends empty array `[]`
2. **Case Sensitivity**: 'LEAD' should be 'Lead' in custom_event_type
3. **Missing Required Fields**: Some objectives require specific fields
4. **Field Name Mismatches**: Using 'locations' instead of 'geo_locations'

## Complete Fix Required

Need to fix ALL these issues:
1. ✅ Fix objective mapping (done)
2. ❌ Fix createCampaign to use passed parameters
3. ❌ Fix special_ad_categories handling
4. ❌ Fix targeting structure (geo_locations, age_min, age_max)
5. ❌ Fix custom_event_type case ('Lead' not 'LEAD')
6. ❌ Add performance_goal to ad set
7. ❌ Add attribution_spec if provided
8. ❌ Handle placements configuration
9. ❌ Fix gender mapping ('all' → 0)
10. ❌ Validate all required fields before sending