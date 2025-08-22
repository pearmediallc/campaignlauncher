# Facebook Domain Configuration Fix

## The Issue
Facebook is rejecting the domain even though we're using ngrok. This usually happens when:
1. The domain format is incorrect in Facebook settings
2. The app is in the wrong mode
3. Changes haven't propagated yet

## Try These Solutions IN ORDER:

### Solution 1: Add Multiple Domain Formats
Go to: https://developers.facebook.com/apps/962596279298517/settings/basic/

In **App Domains**, add ALL of these (one per line):
```
ee33d57d5747.ngrok-free.app
ngrok-free.app
ngrok.app
```

Click **Save Changes**

### Solution 2: Add to Website Platform
Still in Basic Settings, scroll down to **Platform** section:

1. If "Website" is not added, click **"+ Add Platform"** → Choose **Website**
2. In **Site URL**, enter:
   ```
   https://ee33d57d5747.ngrok-free.app
   ```
3. Click **Save Changes**

### Solution 3: Update Facebook Login Settings
Go to: https://developers.facebook.com/apps/962596279298517/fb-login/settings/

1. **Valid OAuth Redirect URIs** - Add ALL these URLs:
   ```
   https://ee33d57d5747.ngrok-free.app/api/auth/facebook/callback
   https://ee33d57d5747.ngrok-free.app/
   ```

2. **Deauthorize Callback URL**:
   ```
   https://ee33d57d5747.ngrok-free.app/api/auth/facebook/deauth
   ```

3. Make sure these are set:
   - Use Strict Mode for Redirect URIs: **No**
   - Client OAuth Login: **Yes**
   - Web OAuth Login: **Yes**
   - Enforce HTTPS: **No**

4. Click **Save Changes**

### Solution 4: Clear Facebook Cache
Facebook caches app settings. To force a refresh:

1. Go to: https://developers.facebook.com/tools/debug/
2. Enter your ngrok URL: `https://ee33d57d5747.ngrok-free.app`
3. Click "Debug"
4. Click "Scrape Again" to clear cache

### Solution 5: Switch App Mode
1. Check the toggle at the top of your app dashboard
2. If it's in **Live** mode, switch to **Development** mode
3. Development mode is more permissive with domains

### Solution 6: Add Yourself as Tester
If app must stay in Live mode:

1. Go to: https://developers.facebook.com/apps/962596279298517/roles/
2. Under **Testers**, click **"Add Testers"**
3. Add your Facebook account
4. Accept the invitation from your Facebook account

### Solution 7: Use App in Development Mode
Create a test app:

1. In your app dashboard, click the app name dropdown (top left)
2. Select **"Create Test App"**
3. Name it "Campaign Dev"
4. Use the new test app's credentials (it will be in Development mode by default)

## If Nothing Works - Alternative Approach

### Use Facebook Login SDK Instead
Instead of server-side OAuth, use client-side Facebook SDK:

1. The frontend handles Facebook login directly
2. Gets the access token
3. Sends token to backend
4. Backend validates and stores it

This bypasses the redirect URI issue entirely.

## Quick Test
After making changes, test with this simple URL first:
```
https://www.facebook.com/v18.0/dialog/oauth?client_id=962596279298517&redirect_uri=https://ee33d57d5747.ngrok-free.app/&scope=email
```

If this simpler URL works, then gradually add more parameters.