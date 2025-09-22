# Meta Marketing API Reference

## Campaign Endpoints

### Required Fields for All Campaigns
- **special_ad_categories**: Required array field (can be empty `[]` or contain values like `['HOUSING']`, `['EMPLOYMENT']`, `['CREDIT']`, `['ISSUES_ELECTIONS_POLITICS']`)

### Create Campaign
**POST** `/act_{ad_account_id}/campaigns`

#### Required Parameters:
- `name`: Campaign name (string)
- `objective`: Campaign objective (enum)
- `special_ad_categories`: Array (required, can be empty `[]`)

#### Optional Parameters:
- `status`: ACTIVE, PAUSED (default: PAUSED)
- `buying_type`: AUCTION (default), RESERVED
- `bid_strategy`: LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP, COST_CAP, LOWEST_COST_WITH_MIN_ROAS
- `daily_budget`: Daily budget in cents (int64)
- `lifetime_budget`: Lifetime budget in cents (int64)
- `promoted_object`: Object for iOS 14+ campaigns

### Valid Objectives (Legacy)
- APP_INSTALLS
- BRAND_AWARENESS
- CONVERSIONS
- EVENT_RESPONSES
- LEAD_GENERATION
- LINK_CLICKS
- LOCAL_AWARENESS
- MESSAGES
- OFFER_CLAIMS
- PAGE_LIKES
- POST_ENGAGEMENT
- PRODUCT_CATALOG_SALES
- REACH
- STORE_VISITS
- VIDEO_VIEWS

### Valid Objectives (ODAX - Outcome-Driven)
- OUTCOME_APP_PROMOTION
- OUTCOME_AWARENESS
- OUTCOME_ENGAGEMENT
- OUTCOME_LEADS
- OUTCOME_SALES
- OUTCOME_TRAFFIC

### Objective Mapping (Legacy to ODAX)
| Legacy Objective | ODAX Objective | Optimization Goal |
|-----------------|----------------|-------------------|
| LEAD_GENERATION | OUTCOME_LEADS | LEAD_GENERATION |
| CONVERSIONS | OUTCOME_SALES | OFFSITE_CONVERSIONS |
| CONVERSIONS | OUTCOME_LEADS | OFFSITE_CONVERSIONS |
| LINK_CLICKS | OUTCOME_TRAFFIC | LINK_CLICKS |
| BRAND_AWARENESS | OUTCOME_AWARENESS | AD_RECALL_LIFT |
| REACH | OUTCOME_AWARENESS | REACH |
| VIDEO_VIEWS | OUTCOME_AWARENESS | THRUPLAY |
| POST_ENGAGEMENT | OUTCOME_ENGAGEMENT | POST_ENGAGEMENT |

## Ad Set Endpoints

### Create Ad Set
**POST** `/act_{ad_account_id}/adsets`

#### Required Parameters:
- `name`: Ad set name
- `campaign_id`: Parent campaign ID
- `billing_event`: IMPRESSIONS, LINK_CLICKS, etc.
- `optimization_goal`: Based on campaign objective
- `targeting`: Targeting object
- `daily_budget` or `lifetime_budget`: Budget in cents

#### Targeting Object Structure:
```json
{
  "geo_locations": {
    "countries": ["US"],
    "regions": [{"key": "3847"}],
    "cities": [{"key": "777934"}]
  },
  "age_min": 18,
  "age_max": 65,
  "genders": [1, 2],
  "custom_audiences": [{"id": "..."}],
  "excluded_custom_audiences": [{"id": "..."}]
}
```

## Ad Endpoints

### Create Ad
**POST** `/act_{ad_account_id}/ads`

#### Required Parameters:
- `name`: Ad name
- `adset_id`: Parent ad set ID
- `creative`: Creative object or creative_id
- `status`: ACTIVE, PAUSED

## Creative Endpoints

### Create Ad Creative
**POST** `/act_{ad_account_id}/adcreatives`

#### Required Parameters:
- `name`: Creative name
- `object_story_spec` or `object_story_id`
- `link_data` or `video_data` or `image_hash`

#### Object Story Spec Structure:
```json
{
  "page_id": "...",
  "link_data": {
    "link": "https://example.com",
    "message": "Primary text",
    "name": "Headline",
    "description": "Description",
    "call_to_action": {
      "type": "LEARN_MORE"
    }
  }
}
```

## Error Codes

| Code | Description |
|------|------------|
| 100 | Invalid parameter |
| 190 | Invalid OAuth 2.0 Access Token |
| 200 | Permissions error |
| 368 | Action deemed abusive or disallowed |
| 613 | Rate limit exceeded |
| 2635 | Deprecated API version |
| 80004 | Too many calls to ad account |

## Budget Requirements

- Minimum daily budget: $1.00 (100 cents)
- Minimum lifetime budget: $1.00 (100 cents)
- Budget values must be in cents (multiply dollar amount by 100)
- Campaign level budget (CBO) OR ad set level budget (not both)

## Special Ad Categories

When `special_ad_categories` includes HOUSING, EMPLOYMENT, or CREDIT:
- Targeting restrictions apply
- Age targeting: 18-65+ only
- No gender targeting
- Limited location targeting (broad regions only)
- No detailed targeting based on demographics

## Rate Limits

- Standard: 200 calls per hour per user
- Ads Management: Special limits apply
- Batch requests: Max 50 requests per batch

## Common Issues and Solutions

### Invalid Parameter (Code 100)
- Check all required fields are present
- Verify enum values are valid
- Ensure budgets are in cents
- Check objective/optimization_goal compatibility

### Permission Errors (Code 200)
- Verify access token has ads_management permission
- Check user has access to ad account
- Ensure Facebook Page admin access

### Rate Limiting (Code 80004)
- Implement exponential backoff
- Use batch requests when possible
- Cache frequently accessed data