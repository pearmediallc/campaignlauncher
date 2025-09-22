# Strategy 1-50-1 Facebook API Documentation

## Overview
This document lists all fields, parameters, options, and endpoints used in the Strategy 1-50-1 (Strategy150) campaign creation process for sending data to Facebook.

## Facebook API Endpoints

### 1. Campaign Endpoints
- **Create Campaign**: `https://graph.facebook.com/{API_VERSION}/act_{AD_ACCOUNT_ID}/campaigns`
- **Method**: POST

### 2. AdSet Endpoints
- **Create AdSet**: `https://graph.facebook.com/{API_VERSION}/act_{AD_ACCOUNT_ID}/adsets`
- **Get AdSet**: `https://graph.facebook.com/{API_VERSION}/{ADSET_ID}`
- **Method**: POST, GET

### 3. Ad Endpoints
- **Create Ad**: `https://graph.facebook.com/{API_VERSION}/act_{AD_ACCOUNT_ID}/ads`
- **Get Ad**: `https://graph.facebook.com/{API_VERSION}/{AD_ID}`
- **Method**: POST, GET

### 4. Media Upload Endpoints
- **Upload Image**: `https://graph.facebook.com/{API_VERSION}/act_{AD_ACCOUNT_ID}/adimages`
- **Upload Video**: `https://graph.facebook.com/{API_VERSION}/act_{AD_ACCOUNT_ID}/advideos`
- **Method**: POST

### 5. Resource Endpoints
- **Get Pixels**: `https://graph.facebook.com/{API_VERSION}/act_{AD_ACCOUNT_ID}/adspixels`
- **Get Page Posts**: `https://graph.facebook.com/{API_VERSION}/{PAGE_ID}/posts`
- **Get Creative**: `https://graph.facebook.com/{API_VERSION}/{CREATIVE_ID}`
- **Method**: GET

### 6. OAuth Resource Endpoints (from strategy150.js)
- **Get Ad Account Pixels**: `https://graph.facebook.com/v18.0/{AD_ACCOUNT_ID}/adspixels`
- **Verify Post**: `https://graph.facebook.com/v18.0/{POST_ID}`

## Campaign Level Fields

### Required Fields
- `name` - Campaign name (prefixed with "[REVIEW]")
- `objective` - Campaign objective
- `status` - Campaign status (default: 'PAUSED')
- `access_token` - Facebook access token

### Optional Fields
- `special_ad_categories` - Array of special ad categories (default: [])
- `buying_type` - AUCTION or RESERVED (default: 'AUCTION')
- `bid_strategy` - Bidding strategy
  - Options: LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP, COST_CAP, LOWEST_COST_WITH_MIN_ROAS
- `spend_cap` - Campaign spend cap (in cents)
- `daily_budget` - Campaign daily budget (in cents)
- `lifetime_budget` - Campaign lifetime budget (in cents)

### Campaign Objectives
Valid objectives include:
- OUTCOME_LEADS
- OUTCOME_SALES
- OUTCOME_TRAFFIC
- OUTCOME_AWARENESS
- OUTCOME_ENGAGEMENT
- OUTCOME_APP_PROMOTION
- CONVERSIONS
- LINK_CLICKS
- LEAD_GENERATION
- BRAND_AWARENESS
- REACH
- POST_ENGAGEMENT
- VIDEO_VIEWS
- APP_INSTALLS

## AdSet Level Fields

### Required Fields
- `name` - AdSet name (prefixed with "[REVIEW]")
- `campaign_id` - Parent campaign ID
- `billing_event` - Billing event (default: 'IMPRESSIONS')
- `optimization_goal` - Optimization goal
- `targeting` - JSON string of targeting parameters
- `status` - AdSet status (default: 'PAUSED')
- `access_token` - Facebook access token

### Budget Fields
- `daily_budget` - Daily budget in cents (required if not using lifetime)
- `lifetime_budget` - Lifetime budget in cents (required if not using daily)
- `bid_strategy` - Bid strategy (default: 'LOWEST_COST_WITHOUT_CAP')
- `bid_cap` - Bid cap in cents
- `bid_amount` - Manual bid amount in cents
- `min_roas` - Minimum ROAS value

### Schedule Fields
- `start_time` - Unix timestamp for start
- `end_time` - Unix timestamp for end (required for lifetime budget)

### Promoted Object Fields
- `promoted_object` - JSON string containing:
  - For website conversions:
    - `pixel_id` - Facebook pixel ID
    - `custom_event_type` - LEAD or PURCHASE
  - For calls:
    - `page_id` - Facebook page ID
  - For app conversions:
    - `application_id` - App ID
    - `object_store_url` - App store URL
    - `custom_event_type` - LEAD or PURCHASE

### Performance Fields
- `performance_goal` - Performance optimization goal
  - Options: maximize_conversions, maximize_leads
- `attribution_spec` - JSON array of attribution windows:
  - `event_type` - CLICK_THROUGH or VIEW_THROUGH
  - `window_days` - Number of days (1-7)

### Optimization Goals
- OFFSITE_CONVERSIONS
- LEAD_GENERATION
- LANDING_PAGE_VIEWS
- QUALITY_CALL

## Targeting Fields

### Demographics
- `age_min` - Minimum age (13-65)
- `age_max` - Maximum age (13-65)
- `genders` - Array of gender IDs (1=male, 2=female)

### Geographic Targeting
- `geo_locations` - Object containing:
  - `countries` - Array of country codes (e.g., ['US'])
  - `regions` - Array of region objects with `key` (state IDs)
  - `cities` - Array of city objects with `key`
  - `zips` - Array of ZIP code objects with `key`

### Platform & Placement Targeting
- `publisher_platforms` - Array of platforms:
  - facebook, instagram, audience_network, messenger
- `facebook_positions` - Array of Facebook placements
- `instagram_positions` - Array of Instagram placements
- `messenger_positions` - Array of Messenger placements
- `audience_network_positions` - Array of Audience Network placements

### US State Region IDs
The system maps US state codes to Facebook region IDs:
- AL: 3843, AK: 3844, AZ: 3845, AR: 3846, CA: 3847
- CO: 3848, CT: 3849, DE: 3850, FL: 3851, GA: 3852
- HI: 3853, ID: 3854, IL: 3855, IN: 3856, IA: 3857
- KS: 3858, KY: 3859, LA: 3860, ME: 3861, MD: 3862
- MA: 3863, MI: 3864, MN: 3865, MS: 3866, MO: 3867
- MT: 3868, NE: 3869, NV: 3870, NH: 3871, NJ: 3872
- NM: 3873, NY: 3874, NC: 3875, ND: 3876, OH: 3877
- OK: 3878, OR: 3879, PA: 3880, RI: 3881, SC: 3882
- SD: 3883, TN: 3884, TX: 3885, UT: 3886, VT: 3887
- VA: 3888, WA: 3889, WV: 3890, WI: 3891, WY: 3892
- DC: 3893

## Ad Level Fields

### Required Fields
- `name` - Ad name (prefixed with "[REVIEW]")
- `adset_id` - Parent AdSet ID
- `creative` - JSON string of creative specification
- `status` - Ad status (default: 'PAUSED')
- `access_token` - Facebook access token

### Creative Object Fields
- `object_story_spec` - Object containing:
  - `page_id` - Facebook page ID
  - `link_data` - For single image/carousel ads:
    - `link` - Destination URL
    - `message` - Primary text
    - `name` - Headline
    - `description` - Description
    - `image_hash` - Uploaded image hash
    - `call_to_action` - Object with:
      - `type` - CTA type
      - `value` - Object with `link`
    - `child_attachments` - Array for carousel cards
  - `video_data` - For video ads:
    - `video_id` - Uploaded video ID
    - `message` - Primary text
    - `title` - Headline
    - `link_description` - Description
    - `call_to_action` - CTA object

### Tracking Fields
- `tracking_specs` - JSON array containing:
  - `action.type` - ['offsite_conversion']
  - `fb_pixel` - Array of pixel IDs

### Call to Action Types
- LEARN_MORE
- SHOP_NOW
- SIGN_UP
- DOWNLOAD
- CONTACT_US
- GET_QUOTE
- SUBSCRIBE
- APPLY_NOW
- BOOK_NOW
- GET_OFFER

## Media Upload Parameters

### Image Upload
- Field: Image file buffer with filename
- `access_token` - Facebook access token
- Supported formats: JPEG, PNG
- Max size: 8MB
- Response: `images` object with hash

### Video Upload
- Field: `source` - Video file buffer
- `access_token` - Facebook access token
- Supported formats: MP4
- Max size: 4GB
- Response: Object with `id`

## Strategy 1-50-1 Specific Fields

### Phase 1: Initial Campaign Creation
All standard campaign, adset, and ad fields as listed above

### Phase 2: Post Capture
- Get creative from ad to extract `effective_object_story_id`
- Fallback to recent page posts if creative extraction fails

### Phase 3: Duplication (49 AdSets)
For each duplicate:
- Uses existing `object_story_id` from captured post
- Creates new AdSet with same targeting
- Creates new Ad referencing existing post
- Custom budget distribution options:
  - `defaultBudgetPerAdSet` - Default budget per duplicated AdSet
  - `budgetDistributionType` - equal, custom, or weighted
  - `customBudgets` - Array of specific budgets for each duplicate

## Additional Configuration Fields

### From Strategy150 Route
- `campaignBudgetOptimization` - Boolean for CBO
- `campaignSpendingLimit` - Campaign spending limit
- `performanceGoal` - maximize_conversions or maximize_leads
- `pixel` - Selected pixel ID
- `manualPixelId` - Manually entered pixel ID
- `conversionEvent` - Lead, Purchase, etc.
- `attributionSetting` - standard or custom
- `attributionWindow` - 7_day, 1_day, etc.
- `adSetBudget` - Object containing:
  - `dailyBudget` - Daily budget amount
  - `lifetimeBudget` - Lifetime budget amount
  - `startDate` - ISO 8601 date string
  - `endDate` - ISO 8601 date string
  - `scheduleType` - run_continuously or scheduled
  - `spendingLimits` - Object with daily/lifetime limits
  - `dayparting` - Array of schedule rules
- `urlType` - website, app_deeplink, facebook_event, messenger, whatsapp, lead_gen, call, none
- `displayLink` - Display URL
- `mediaType` - single_image, single_video, carousel
- `mediaSpecs` - Object with media specifications
- `duplicationSettings` - Object for 49 AdSet duplication config
- `publishDirectly` - Boolean to publish immediately

## Error Handling

### Common Error Codes
- **100** - Invalid parameter (check field formats and values)
- **190** - Invalid OAuth access token (requires reauth)
- **200** - Permissions error (missing ads_management permission)
- **270** - Requires business verification
- **400** - Bad request (invalid request structure)

### Validation Requirements
- Primary text: Max 125 characters
- Headline: Max 40 characters
- Description: Max 30 characters
- Budget values: Must be in cents (multiply dollars by 100)
- Lifetime budget campaigns: Require at least 24 hours duration
- Supported conversion events: Only LEAD and PURCHASE for website conversions

## Safe Mode Fallback
When field validation errors occur (Code 100/400), the system automatically retries without:
- `promoted_object`
- `attribution_spec`
- `conversion_specs`
- `optimization_sub_event`
- `rf_prediction_id`

These fields then require manual configuration in Facebook Ads Manager.