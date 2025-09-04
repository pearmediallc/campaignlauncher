# Ad Forge Integration Guide

This document explains how Campaign Launcher integrates with Ad Forge for importing ad variations.

## Overview

Campaign Launcher can receive ad variations from Ad Forge (ad_scrapper_d) through a secure JWT-based token system. This allows users to create ads in Ad Forge and seamlessly import them into Campaign Launcher for Facebook campaign creation.

## Integration Architecture

```
Ad Forge (Port 8080) → JWT Token → Campaign Launcher (Port 5002)
```

### Data Flow:
1. User creates ad variations in Ad Forge
2. Ad Forge generates a JWT token with variation data
3. User is redirected to Campaign Launcher with the token
4. Campaign Launcher validates the token and extracts variation data
5. Form is pre-filled with the imported data

## Configuration

### Environment Variables

Both applications must share the same JWT_SECRET for secure communication.

#### Campaign Launcher (.env)
```bash
# Ad Forge Integration
AD_SCRAPER_URL=https://ad-forge-api.onrender.com
JWT_SECRET=campaign-launcher-ad-forge-shared-secret-2024

# CORS Configuration
CORS_ORIGIN=https://campaignlauncher.onrender.com,https://ad-forge-api.onrender.com
```

#### Ad Forge (.env)
```bash
# Campaign Launcher Integration
JWT_SECRET=campaign-launcher-ad-forge-shared-secret-2024
CAMPAIGN_API_URL=https://campaignlauncher.onrender.com/api
CAMPAIGN_LAUNCHER_URL=https://campaignlauncher.onrender.com
AD_FORGE_URL=https://ad-forge-api.onrender.com
```

## API Endpoints

### Campaign Launcher Endpoints

1. **Import Variation**
   - Endpoint: `POST /api/variations/import`
   - Body: `{ exportToken: string }`
   - Returns: Variation data for form prefill

2. **Get Prefill Data**
   - Endpoint: `GET /api/variations/prefill/:variationId`
   - Returns: Stored variation data

3. **Store Import Token**
   - Endpoint: `POST /api/variations/store-import-token`
   - Used during authentication flow

### Ad Forge Endpoints

1. **Validate Token**
   - Endpoint: `POST /api/variations/validate-token`
   - Validates and returns variation data

2. **Get Variation**
   - Endpoint: `GET /api/get-variation/:variationId`
   - Returns specific variation data

## Data Structure

The variation data structure is compatible between both systems:

```javascript
{
  headline: string,
  description: string,
  primaryText: string,
  mediaType: 'single_image' | 'carousel' | 'video',
  callToAction: string,
  imageUrl: string,
  images: string[]
}
```

## Deployment Steps

### 1. Deploy Ad Forge
- Deploy to Render or use Ngrok for local development
- Set environment variables including JWT_SECRET
- Note the public URL

### 2. Update Campaign Launcher
- Set AD_SCRAPER_URL to Ad Forge's public URL
- Ensure JWT_SECRET matches Ad Forge
- Deploy updates to Render

### 3. Test Integration
1. Create a test ad in Ad Forge
2. Use the export feature to generate a token
3. Verify redirect to Campaign Launcher works
4. Confirm form is pre-filled with data

## Security Considerations

1. **JWT Tokens**: Expire after 1 hour for security
2. **CORS**: Only configured origins are allowed
3. **HTTPS**: Use HTTPS in production for secure token transmission
4. **Secret Management**: Store JWT_SECRET securely, never commit to git

## Troubleshooting

### Common Issues:

1. **Token Verification Failed**
   - Ensure JWT_SECRET matches in both applications
   - Check token hasn't expired (1 hour limit)

2. **CORS Errors**
   - Verify CORS_ORIGIN includes both application URLs
   - Check both applications are using HTTPS in production

3. **Form Not Prefilling**
   - Verify variation data structure matches expected format
   - Check browser console for JavaScript errors
   - Ensure token is properly passed in URL parameters

## Local Development

For local testing:
1. Run Ad Forge on port 8080: `python app.py`
2. Run Campaign Launcher backend on port 5002: `npm run dev`
3. Run Campaign Launcher frontend on port 3000: `npm start`
4. Use ngrok if testing between remote and local: `ngrok http 8080`

## Support

For issues or questions about the integration:
- Check the logs in both applications
- Verify environment variables are set correctly
- Test with the provided test script: `node test-integration.js`