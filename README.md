# Facebook Campaign Launcher

A complete web application for automating Facebook lead generation campaign creation with minimal input requirements.

## Features

- **Automated Campaign Creation**: Creates complete campaign structure with predefined optimal settings
- **Minimal Input Requirements**: Media buyers only need to provide essential information
- **Bulk Ad Variations**: Create multiple ad variations under the same campaign
- **Safety First**: All campaigns created in PAUSED status with [REVIEW] prefix
- **Image Upload**: Direct image upload to Facebook Ad Library
- **Real-time Validation**: Token validation and budget checks

## Default Settings

### Campaign Level
- Buying Type: AUCTION
- Objective: OUTCOME_LEADS
- Status: PAUSED with [REVIEW] prefix
- Special Ad Categories: None

### Ad Set Level
- Conversion Location: Website
- Performance Goal: OFFSITE_CONVERSIONS (max conversions)
- Conversion Event: LEAD
- Billing Event: IMPRESSIONS
- Bid Strategy: LOWEST_COST
- Placements: Automatic across all platforms

### Ad Level
- Call-to-Action: LEARN_MORE
- Tracking: Enabled with Facebook Pixel

## Setup Instructions

### Prerequisites
- Node.js v14+ and npm
- Facebook Business Manager account
- Facebook App with Marketing API access
- Ad Account ID, Page ID, and Pixel ID

### Backend Setup

1. Navigate to backend directory:
```bash
cd fb-campaign-launcher/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
PORT=5000
FB_AD_ACCOUNT_ID=549476659118722
FB_PAGE_ID=387826757757253
FB_PIXEL_ID=689559807097947
FB_ACCESS_TOKEN=YOUR_ACCESS_TOKEN_HERE
FB_API_VERSION=v18.0
```

4. Create uploads directory:
```bash
mkdir uploads
```

5. Start the backend server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd fb-campaign-launcher/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at http://localhost:3000

## Usage Guide

### Single Campaign Creation

1. Fill in the required fields:
   - Campaign Name
   - Daily Budget (minimum $20)
   - URL Type (Lead Gen or Call)
   - Website URL
   - Ad Copy
   - Headline
   - Description

2. Optionally upload an image

3. Click "Create Campaign"

### Bulk Ad Variations

1. Toggle "Bulk Variations Mode"
2. Fill in the base campaign information
3. Click "Add Variation" for each ad variant
4. Fill in different headlines, descriptions, and ad copy for each variation
5. Click "Create Campaign" to create all variations at once

## API Endpoints

### Campaign Management
- `POST /api/campaigns/create` - Create single campaign
- `POST /api/campaigns/create-bulk` - Create campaign with variations
- `GET /api/campaigns/validate-token` - Validate Facebook access token

### Media Management
- `POST /api/media/upload` - Upload single image
- `POST /api/media/upload-multiple` - Upload multiple images

### Ad Management
- `POST /api/ads/create-variation` - Create ad variations
- `GET /api/ads/adsets/:campaignId` - Get campaign ad sets
- `GET /api/ads/ads/:adsetId` - Get ad set ads

## Getting Facebook Access Token

1. Go to [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Request these permissions:
   - `ads_management`
   - `ads_read`
   - `business_management`
   - `pages_read_engagement`
4. Generate and copy the access token
5. For production, use a System User token that doesn't expire

## Error Handling

The application handles common errors:
- Token expiration
- Budget validation ($20 minimum)
- Image size limits (10MB max)
- API rate limiting
- Network errors

## Testing

Test with these values:
- Daily Budget: $50
- URL: https://example.com
- Create in PAUSED status
- Verify in Facebook Ads Manager

## Security Notes

- Never commit the `.env` file with real tokens
- Use environment variables for all sensitive data
- Implement proper authentication for production
- Use HTTPS in production
- Rotate access tokens regularly

## Workflow

1. Media buyer fills minimal form
2. System creates campaign with [REVIEW] prefix
3. All components created in PAUSED status
4. Review in Facebook Ads Manager
5. Remove [REVIEW] prefix and activate when ready

## Troubleshooting

### Invalid Access Token
- Regenerate token in Graph API Explorer
- Ensure all required permissions are granted
- Check token hasn't expired

### Campaign Creation Fails
- Verify minimum budget ($20)
- Check Ad Account ID is correct
- Ensure Page ID has proper permissions
- Verify Pixel ID exists and is active

### Image Upload Issues
- Check file size (max 10MB)
- Verify format (JPG, PNG, GIF)
- Ensure uploads directory exists and is writable

## License

MIT