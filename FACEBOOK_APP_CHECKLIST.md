# Facebook App Configuration Checklist

## Please verify these settings in your Facebook Developer Dashboard:

### 1. Go to: https://developers.facebook.com/apps/1013938650474901/settings/basic/

### 2. Check Basic Settings:
- [ ] **App ID**: `1013938650474901` (should match)
- [ ] **App Secret**: `66d1b486aba35c2ede0b5b32f699dc9a` (verify it matches)
- [ ] **App Domains**: Add `localhost` (for development)
- [ ] **Privacy Policy URL**: Can be any valid URL for now
- [ ] **Terms of Service URL**: Can be any valid URL for now

### 3. Go to: https://developers.facebook.com/apps/1013938650474901/fb-login/settings/

### 4. Check Facebook Login Settings:
- [ ] **Client OAuth Login**: Must be **ON**
- [ ] **Web OAuth Login**: Must be **ON**
- [ ] **Enforce HTTPS**: Should be **OFF** for localhost testing
- [ ] **Embedded Browser OAuth Login**: Should be **ON**
- [ ] **Valid OAuth Redirect URIs**: Must include EXACTLY:
  ```
  http://localhost:5002/api/auth/facebook/callback
  ```
  ⚠️ **IMPORTANT**: Copy and paste this exact URL - no trailing slash!

### 5. Go to: https://developers.facebook.com/apps/1013938650474901/settings/advanced/

### 6. Check Advanced Settings:
- [ ] **App Type**: Should be "Business" or "Consumer"
- [ ] **Native or desktop app**: Should be **No**
- [ ] **Is your app a bot**: Should be **No**

### 7. App Mode Check:
- [ ] At the top of the dashboard, confirm it shows **"Live"** mode (not "Development")

## Common Issues and Solutions:

### "Invalid App ID" Error Causes:

1. **Missing OAuth Redirect URI**: 
   - The exact URL must be in the Valid OAuth Redirect URIs list
   - Even one character difference will cause failure

2. **HTTP vs HTTPS**:
   - Facebook sometimes requires HTTPS even for localhost
   - If still failing, try adding both:
     - `http://localhost:5002/api/auth/facebook/callback`
     - `https://localhost:5002/api/auth/facebook/callback`

3. **App Domain Missing**:
   - Add `localhost` to App Domains in Basic Settings

4. **Facebook Login Not Enabled**:
   - Make sure Facebook Login product is added to your app
   - Go to Dashboard → Add Product → Facebook Login → Set Up

## Alternative Test:

Try this direct URL in your browser (replace STATE with any value):
```
https://www.facebook.com/v18.0/dialog/oauth?client_id=1013938650474901&redirect_uri=http://localhost:5002/api/auth/facebook/callback&scope=email&response_type=code&state=test123
```

If this also shows "Invalid App ID", the issue is definitely in Facebook's app configuration.

## If Everything Looks Correct:

1. **Clear Browser Cache**: Sometimes Facebook caches app settings
2. **Try Incognito/Private Mode**: Eliminates cache issues
3. **Wait 5 minutes**: Facebook sometimes takes time to propagate settings
4. **Check App Review Status**: Make sure your app isn't restricted

## Need to Create a New App?

If nothing works, you might need to create a fresh Facebook App:
1. Go to https://developers.facebook.com
2. Create New App → Type: Business
3. Add Facebook Login product
4. Configure OAuth settings as above
5. Update your .env with new App ID and Secret