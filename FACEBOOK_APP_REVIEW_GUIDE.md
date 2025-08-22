# Facebook App Review Submission Guide

## Current App Status
- **App Name**: FB Campaign Launcher
- **App ID**: 735375959485927
- **Current Mode**: Development
- **Target**: Business Verification & App Review

## Required Permissions for App Review

### 1. ads_management
**Use Case**: Create and manage Facebook ad campaigns programmatically
- Users can create campaign structures
- Set targeting parameters
- Define budgets and schedules
- Launch campaigns directly from the application

### 2. ads_read
**Use Case**: Display ad account information and campaign performance
- Show available ad accounts
- Display campaign metrics
- Monitor campaign status
- Provide campaign analytics

### 3. business_management
**Use Case**: Access and manage business assets
- List business accounts
- Access business-owned ad accounts
- Manage business pages
- Handle multi-client scenarios

### 4. pages_show_list
**Use Case**: Display available Facebook pages for ad creation
- Show list of pages user manages
- Allow page selection for ads
- Display page information

### 5. pages_read_engagement
**Use Case**: Analyze page performance for campaign optimization
- Read page insights
- Display engagement metrics
- Optimize ad targeting based on page data

### 6. pages_manage_ads
**Use Case**: Create and manage ads associated with Facebook pages
- Create ads for selected pages
- Manage page-promoted posts
- Handle page-specific campaigns

## Pre-Submission Checklist

### ✅ Completed Items
- [x] OAuth 2.0 implementation
- [x] Token encryption and secure storage
- [x] User authentication system
- [x] Resource selection (Ad Accounts, Pages, Pixels)
- [x] Basic campaign creation structure
- [x] HTTPS setup with valid certificates
- [x] Local domain configuration (fbcampaign.local)

### 🔄 Required for App Review

#### 1. Business Verification (Complete First)
- [ ] Go to App Dashboard > Settings > Business Verification
- [ ] Submit business documents
- [ ] Verify business domain ownership
- [ ] Wait for verification approval (2-5 business days)

#### 2. App Configuration
- [ ] **Privacy Policy URL**: Need to create and host
- [ ] **Terms of Service URL**: Need to create and host
- [ ] **Data Deletion Instructions URL**: Need to implement
- [ ] **App Icon**: Upload 1024x1024px icon
- [ ] **App Category**: Set to "Business and Pages"
- [ ] **App Description**: Clear description of functionality

#### 3. Data Deletion Callback
Create endpoint for data deletion requests:
```javascript
// Add to backend/routes/auth.js
router.post('/facebook/deletion-callback', async (req, res) => {
  // Verify the signed request from Facebook
  // Delete user's Facebook data
  // Return confirmation URL
});
```

#### 4. Test Users Setup
- [ ] Create 2-3 test users in App Dashboard > Roles > Test Users
- [ ] Configure test users with:
  - Active ad accounts
  - Pages with admin access
  - Sufficient permissions
  - Sample campaign data

#### 5. Screencast Requirements
Record a video showing:
1. User login flow
2. Facebook OAuth authentication
3. Permission grant screen
4. Resource selection (ad accounts, pages)
5. Campaign creation process
6. Successful campaign launch
7. Data management features

**Video specifications**:
- Duration: 3-5 minutes
- Resolution: 1280x720 minimum
- Include voice narration explaining each step
- Show actual functionality, not mockups

#### 6. Platform Configuration
- [ ] Set Platform: Web
- [ ] Add Valid OAuth Redirect URIs:
  - `https://fbcampaign.local:5002/api/auth/facebook/callback`
  - `https://localhost:5002/api/auth/facebook/callback`
- [ ] Deauthorize Callback URL
- [ ] Data Deletion Request URL

## Submission Steps

### Step 1: Complete Business Verification
1. Navigate to: https://developers.facebook.com/apps/735375959485927/settings/business-verification/
2. Click "Start Verification"
3. Upload required documents:
   - Business registration
   - Utility bill or bank statement
   - Business website ownership proof

### Step 2: Prepare App Details
1. Go to App Dashboard > App Review > Permissions and Features
2. For each permission, provide:
   - Detailed use case description (500+ words)
   - Step-by-step user flow
   - Screenshots of implementation
   - Screencast URL

### Step 3: Create Required URLs

#### Privacy Policy Template
```
Privacy Policy for FB Campaign Launcher

Last updated: [Date]

1. Information We Collect
- Facebook user ID and profile information
- Ad account data and campaign metrics
- Page information and insights

2. How We Use Information
- To create and manage ad campaigns
- To display campaign performance
- To optimize ad targeting

3. Data Storage
- All tokens are encrypted using AES-256-GCM
- Data is stored securely in MySQL database
- Sessions expire after 60 days

4. User Rights
- Request data deletion
- Revoke app permissions
- Export personal data

Contact: [Your Email]
```

#### Terms of Service Template
```
Terms of Service for FB Campaign Launcher

1. Acceptance of Terms
By using this application, you agree to these terms.

2. Service Description
FB Campaign Launcher helps create and manage Facebook ad campaigns.

3. User Responsibilities
- Comply with Facebook's advertising policies
- Provide accurate information
- Maintain account security

4. Limitations
- Service provided "as is"
- No guarantee of campaign performance
- Subject to Facebook API availability
```

### Step 4: Submit for Review
1. Complete all checklist items
2. Go to App Review > Permissions and Features
3. Click "Request" for each permission
4. Fill out detailed forms for each
5. Attach screencasts and documentation
6. Submit for review

## Review Timeline
- **Initial Review**: 5-7 business days
- **Additional Information**: May be requested
- **Total Process**: 2-4 weeks typically

## Common Rejection Reasons to Avoid
1. ❌ Insufficient use case explanation
2. ❌ Missing or unclear screencasts
3. ❌ No test user instructions
4. ❌ Privacy policy doesn't mention Facebook data
5. ❌ Data deletion not implemented
6. ❌ Business verification incomplete

## Testing Instructions for Reviewers

### Test Account Setup
```
Email: test_user_1@fbcampaign.local
Password: [Generated by Facebook]

Steps to test:
1. Visit https://fbcampaign.local:3000
2. Click "Login with Facebook"
3. Grant all requested permissions
4. Select test ad account: "Test Business Account"
5. Select test page: "Test Business Page"
6. Create a campaign with:
   - Name: "Test Campaign Review"
   - Objective: "Traffic"
   - Budget: $10/day
   - Duration: 7 days
7. Review campaign settings
8. Launch campaign
```

## Next Steps
1. Complete Business Verification first
2. Create and host privacy/terms pages
3. Implement data deletion endpoint
4. Record screencast
5. Submit for App Review

## Support Resources
- [App Review Documentation](https://developers.facebook.com/docs/app-review)
- [Business Verification Guide](https://developers.facebook.com/docs/development/release/business-verification)
- [Permission Reference](https://developers.facebook.com/docs/permissions/reference)
- [Data Deletion Callback](https://developers.facebook.com/docs/development/create-an-app/data-deletion-callback)

## Contact
For questions about the review process:
- Facebook Developer Support: https://developers.facebook.com/support/
- Community Forum: https://developers.facebook.com/community/