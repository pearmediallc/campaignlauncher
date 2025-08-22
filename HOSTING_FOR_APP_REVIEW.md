# Hosting Your App for Facebook App Review

## Quick Solution: Using ngrok for App Review

### Step 1: Install ngrok
```bash
# If you haven't already
brew install ngrok
```

### Step 2: Start your backend server
```bash
cd backend
npm start
```

### Step 3: Create ngrok tunnel
```bash
# This creates a public URL that forwards to your local server
ngrok http 5002
```

You'll get output like:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:5002
```

### Step 4: Update Facebook App Settings
1. Go to your App Dashboard
2. Update these URLs with your ngrok URL:
   - **Data Deletion Callback URL**: `https://abc123.ngrok.io/api/data-deletion/callback`
   - **Valid OAuth Redirect URIs**: Add `https://abc123.ngrok.io/api/auth/facebook/callback`
   - **Deauthorize Callback URL**: `https://abc123.ngrok.io/api/data-deletion/callback`

### Step 5: Test the endpoint
```bash
# Test that Facebook can reach your endpoint
curl -X POST https://abc123.ngrok.io/api/data-deletion/callback \
  -H "Content-Type: application/json" \
  -d '{"signed_request":"test"}'
```

## Production Hosting Options

### Option 1: Deploy to Heroku (Free tier available)
```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Create a new Heroku app
heroku create fb-campaign-launcher

# Deploy your backend
git push heroku main

# Your URLs will be:
# https://fb-campaign-launcher.herokuapp.com/api/data-deletion/callback
```

### Option 2: Deploy to Railway.app (Modern alternative)
1. Visit https://railway.app
2. Connect your GitHub repo
3. Deploy with one click
4. Get instant public URL

### Option 3: Deploy to AWS/DigitalOcean/Linode
- More control but requires more setup
- Good for production

## Can You Change Domains Later? YES! ✅

### How Domain Changes Work:

1. **After App Review Approval**, you can change domains anytime:
   - Go to App Dashboard > Settings > Basic
   - Update your URLs
   - Changes take effect immediately
   - No need for re-review

2. **What You Can Change**:
   - ✅ Domain name
   - ✅ Hosting provider
   - ✅ Server location
   - ✅ OAuth redirect URLs (add multiple)
   - ✅ Callback URLs

3. **What Triggers Re-Review**:
   - ❌ Requesting new permissions
   - ❌ Changing app's core functionality
   - ❌ Major changes to data usage

## Recommended Approach for App Review

### Phase 1: For App Review (Now)
```javascript
// Use ngrok for quick public access
// backend/.env
FRONTEND_URL=https://abc123.ngrok.io
BACKEND_URL=https://abc123.ngrok.io
FB_REDIRECT_URI=https://abc123.ngrok.io/api/auth/facebook/callback
```

### Phase 2: After Approval (Production)
```javascript
// Switch to your production domain
// backend/.env
FRONTEND_URL=https://yourcampaignapp.com
BACKEND_URL=https://api.yourcampaignapp.com
FB_REDIRECT_URI=https://api.yourcampaignapp.com/api/auth/facebook/callback
```

## Step-by-Step for ngrok Setup

### 1. Start ngrok
```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start ngrok
ngrok http 5002
```

### 2. Update your backend environment
```bash
# backend/.env
# Add your ngrok URL
PUBLIC_URL=https://your-ngrok-id.ngrok.io
```

### 3. Test Data Deletion Endpoint
```javascript
// Test script to verify your endpoint works
const crypto = require('crypto');
const axios = require('axios');

const appSecret = 'your-app-secret';
const userId = 'test-user-id';

// Create a signed request (simplified for testing)
function createSignedRequest(data, secret) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const sig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${sig}.${payload}`;
}

const signedRequest = createSignedRequest({ user_id: userId }, appSecret);

// Test the endpoint
axios.post('https://your-ngrok-id.ngrok.io/api/data-deletion/callback', {
  signed_request: signedRequest
})
.then(response => {
  console.log('Success:', response.data);
  // Should return: { url: "...", confirmation_code: "..." }
})
.catch(error => {
  console.error('Error:', error.response?.data);
});
```

## Important Notes

### For App Review:
1. **ngrok URLs expire** after 8 hours on free plan
   - Get ngrok paid plan for stable URLs
   - Or use Railway/Heroku for review

2. **Update All References**:
   - Facebook App Dashboard URLs
   - Backend environment variables
   - Frontend API endpoints

3. **SSL is Required**:
   - ngrok provides HTTPS automatically ✅
   - Heroku provides HTTPS automatically ✅
   - Custom domains need SSL certificates

### After Approval:
1. You can move to any domain
2. Update URLs in Facebook App Dashboard
3. No re-review needed for domain changes
4. Keep data deletion endpoint active

## Quick Checklist for App Review

- [ ] Backend publicly accessible via ngrok/hosting
- [ ] Data deletion endpoint returns correct format:
  ```json
  {
    "url": "https://yourdomain.com/deletion-status",
    "confirmation_code": "unique_code_here"
  }
  ```
- [ ] All Facebook Dashboard URLs updated
- [ ] OAuth redirect URL matches public URL
- [ ] Privacy Policy hosted and accessible
- [ ] Terms of Service hosted and accessible

## Testing Your Public Endpoint

Once ngrok is running:

```bash
# Test that it's accessible
curl https://your-ngrok-id.ngrok.io/api/health

# Test data deletion endpoint
curl -X POST https://your-ngrok-id.ngrok.io/api/data-deletion/callback \
  -H "Content-Type: application/json" \
  -d '{"signed_request":"test.eyJ1c2VyX2lkIjoidGVzdCJ9"}'
```

## Migration Path

1. **Now (App Review)**: Use ngrok or free hosting
2. **After Approval**: Move to production domain
3. **Update in Dashboard**: Change all URLs
4. **No Re-review**: Domain changes don't need approval

The key is that Facebook just needs to verify your endpoint works during review. After approval, you have full flexibility to change domains as needed!