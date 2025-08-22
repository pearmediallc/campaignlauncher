# Facebook OAuth Authentication & Eligibility Verification System

## Overview

This system implements a comprehensive Facebook OAuth 2.0 authentication flow with eligibility verification for users who want to create Facebook ad campaigns. It ensures users have the necessary permissions, active ad accounts, and meet Facebook's advertising requirements before allowing campaign creation.

## Features

- **Facebook OAuth 2.0 Authentication**: Secure login with Facebook
- **Permission Management**: Validates required permissions for ad management
- **Eligibility Verification**: Comprehensive checks for account eligibility
- **Token Encryption**: Secure storage of access tokens using AES-256-GCM
- **Audit Logging**: Complete audit trail of all authentication attempts
- **Auto-refresh**: Automatic token refresh before expiration
- **Rate Limiting**: Protection against brute force attacks
- **CSRF Protection**: State parameter validation for OAuth flow

## Setup Instructions

### 1. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Choose "Business" type
4. Fill in app details:
   - App Name: Your Campaign Launcher
   - App Contact Email: your-email@example.com
   - App Purpose: Business
5. After creation, go to Settings → Basic
6. Copy your App ID and App Secret

### 2. Configure Facebook App

1. In your Facebook App Dashboard:
   - Go to "Facebook Login" → "Settings"
   - Add Valid OAuth Redirect URIs:
     - Development: `http://localhost:5002/api/auth/facebook/callback`
     - Production: `https://yourdomain.com/api/auth/facebook/callback`
   - Set "Use Strict Mode for Redirect URIs" to Yes
   - Save Changes

2. Add Required Permissions:
   - Go to "App Review" → "Permissions and Features"
   - Request the following permissions:
     - `ads_management`
     - `business_management`
     - `pages_show_list`
     - `ads_read`
     - `pages_read_engagement`
     - `pages_manage_ads`

3. Configure Business Verification (if needed):
   - Go to "Business Verification"
   - Complete the verification process
   - This may be required for production use

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Required Facebook OAuth Settings
FB_APP_ID=your_facebook_app_id
FB_APP_SECRET=your_facebook_app_secret
FB_REDIRECT_URI=http://localhost:5002/api/auth/facebook/callback

# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000

# Eligibility Criteria (customize as needed)
MIN_ACCOUNT_AGE_DAYS=30
REQUIRE_SPENDING_HISTORY=false
REQUIRE_PAYMENT_METHOD=true
MIN_AD_ACCOUNTS=1
CHECK_BUSINESS_VERIFICATION=false
ELIGIBILITY_VALIDITY_DAYS=30
```

### 4. Database Setup

Run migrations to create necessary tables:

```bash
# Run migrations
npx sequelize-cli db:migrate

# Or if using npm scripts
npm run migrate
```

This creates:
- `facebook_auth` - Stores encrypted Facebook tokens
- `eligibility_checks` - Stores eligibility verification results
- `auth_audit_logs` - Audit trail of all auth events

### 5. Frontend Integration

Add the Facebook Auth component to your app:

```jsx
import FacebookAuth from './components/FacebookAuth';

function Dashboard() {
  return (
    <div>
      <FacebookAuth />
      {/* Other dashboard content */}
    </div>
  );
}
```

Add callback route to your router:

```jsx
import FacebookAuthCallback from './pages/FacebookAuthCallback';

<Route path="/auth/facebook/callback" element={<FacebookAuthCallback />} />
```

## API Documentation

### Authentication Endpoints

#### `GET /api/auth/facebook/login`
Initiates Facebook OAuth flow
- **Auth Required**: Yes (JWT)
- **Returns**: OAuth URL and state parameter

#### `GET /api/auth/facebook/callback`
Handles OAuth callback from Facebook
- **Auth Required**: No (validates state)
- **Query Params**: `code`, `state`, `error` (from Facebook)
- **Redirects to**: Frontend with success/error status

#### `GET /api/auth/facebook/status`
Returns current authentication and eligibility status
- **Auth Required**: Yes (JWT)
- **Returns**: Authentication status, permissions, eligibility details

#### `POST /api/auth/facebook/verify-eligibility`
Re-verifies user eligibility
- **Auth Required**: Yes (JWT)
- **Returns**: Updated eligibility status

#### `POST /api/auth/facebook/logout`
Revokes Facebook authentication
- **Auth Required**: Yes (JWT)
- **Returns**: Success message

#### `GET /api/auth/facebook/audit-logs`
Retrieves authentication audit logs
- **Auth Required**: Yes (JWT)
- **Query Params**: `limit`, `offset`
- **Returns**: Array of audit log entries

## Eligibility Criteria

The system checks the following criteria (configurable via environment variables):

| Criteria | Description | Environment Variable |
|----------|-------------|---------------------|
| Active Ad Account | User must have at least one active ad account | `MIN_AD_ACCOUNTS` |
| No Restrictions | Ad accounts must not be restricted or disabled | Always checked |
| Account Age | Account must be at least X days old | `MIN_ACCOUNT_AGE_DAYS` |
| Payment Method | Valid payment method configured | `REQUIRE_PAYMENT_METHOD` |
| Spending History | Has previous ad spend | `REQUIRE_SPENDING_HISTORY` |
| Business Verification | Business account is verified | `CHECK_BUSINESS_VERIFICATION` |

## Customizing Eligibility Criteria

### Modifying Criteria

Edit the `eligibilityCriteria` object in `FacebookAuthService.js`:

```javascript
this.eligibilityCriteria = {
  minAccountAgeDays: 30,        // Minimum account age
  requireSpendingHistory: false, // Require previous ad spend
  requirePaymentMethod: true,    // Require payment method
  minAdAccounts: 1,              // Minimum number of ad accounts
  checkBusinessVerification: false, // Check business verification
  eligibilityValidityDays: 30    // How long eligibility is valid
};
```

### Adding Custom Criteria

1. Add check in `checkEligibility` method:

```javascript
// Custom criterion example
if (customCheck) {
  criteria.customRequirement = true;
} else {
  failureReasons.push('Custom requirement not met');
}
```

2. Add to database model in `EligibilityCheck.js`:

```javascript
customRequirement: {
  type: DataTypes.BOOLEAN,
  defaultValue: false
}
```

3. Run migration to update database schema

## Security Measures

### Token Encryption
- Access tokens are encrypted using AES-256-GCM
- Encryption key must be 64 hex characters
- Tokens are decrypted only when needed

### CSRF Protection
- State parameter with HMAC signature
- 5-minute expiration for state tokens
- Validates origin on callback

### Rate Limiting
- Auth endpoints: 5 requests per 15 minutes
- Verification endpoints: 10 requests per 5 minutes
- Configurable via environment variables

### Audit Logging
All authentication events are logged:
- Login attempts/success/failure
- Permission grants/revokes
- Eligibility checks
- Token refreshes
- Suspicious activities

## Troubleshooting

### Common Issues

#### "Missing Permissions" Error
- User didn't grant all required permissions
- Solution: User needs to re-authenticate and grant all permissions

#### "Token Expired" Error
- Facebook access token has expired
- Solution: User needs to re-authenticate
- Consider implementing auto-refresh

#### "Not Eligible" Status
- User doesn't meet eligibility criteria
- Check `failureReasons` in response
- User may need to:
  - Add payment method
  - Wait for account to age
  - Verify business account

#### "Invalid State" Error
- CSRF token validation failed
- Possible causes:
  - State expired (>5 minutes)
  - Session mismatch
  - Man-in-the-middle attack

### Debug Mode

Enable debug logging:

```bash
DEBUG_MODE=true
LOG_LEVEL=debug
```

Check logs in `./logs` directory

### Testing with Test Users

1. Go to Facebook App Dashboard
2. Navigate to "Roles" → "Test Users"
3. Create test users with different configurations
4. Use test users to verify different scenarios

## Monitoring

### Metrics to Track

- Authentication success/failure rates
- Average eligibility check duration
- Token refresh success rate
- Permission grant rates
- Common failure reasons

### Implementing Monitoring

```javascript
// Example with custom metrics
const metrics = {
  authAttempts: 0,
  authSuccesses: 0,
  authFailures: 0,
  eligibilityChecks: 0,
  tokenRefreshes: 0
};

// Track in your code
metrics.authAttempts++;
```

## Production Checklist

- [ ] Facebook App approved for production
- [ ] All required permissions approved
- [ ] SSL certificate configured
- [ ] Production redirect URI added to Facebook App
- [ ] Environment variables set for production
- [ ] Database migrations run
- [ ] Encryption key securely stored
- [ ] Rate limiting configured
- [ ] Monitoring/alerting set up
- [ ] Audit log retention policy defined
- [ ] Backup strategy for auth data
- [ ] Error tracking (Sentry, etc.) configured
- [ ] Load testing completed
- [ ] Security audit performed

## Alternative Verification Methods

### Email Verification Fallback

If Facebook authentication fails, enable email verification:

```bash
ENABLE_EMAIL_VERIFICATION=true
```

Implement in `EmailVerificationService.js`:

```javascript
class EmailVerificationService {
  async sendVerificationEmail(user) {
    // Send verification email
  }
  
  async verifyEmailToken(token) {
    // Verify email token
  }
}
```

### Manual Review Process

For edge cases, enable manual review:

```bash
ENABLE_MANUAL_REVIEW=true
```

This allows admins to manually approve users who fail automatic verification.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review audit logs for detailed error information
3. Enable debug mode for verbose logging
4. Contact support with:
   - User ID
   - Timestamp of issue
   - Error messages from audit logs
   - Browser/device information

## License

This implementation is provided as-is for use in your Facebook Campaign Launcher application.