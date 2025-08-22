# Facebook SDK Domain Configuration

## Error: "Unknown Host domain"
This error occurs when your domain isn't whitelisted in Facebook App settings.

## Solution Steps:

### 1. Go to Facebook App Dashboard
Visit: https://developers.facebook.com/apps/962596279298517/settings/basic/

### 2. Add JavaScript SDK Allowed Domains
In the Facebook App Dashboard, navigate to:
- **Settings** → **Basic**
- Scroll down to **"App Domains"**
- Add these domains:
  ```
  localhost
  lvh.me
  127.0.0.1
  ```

### 3. Configure Facebook Login Settings
Navigate to:
- **Facebook Login** → **Settings**
- Add to **Valid OAuth Redirect URIs**:
  ```
  http://localhost:3000/
  http://localhost:3000/facebook-sdk-test
  https://lvh.me:5002/api/auth/facebook/callback
  https://127.0.0.1:5002/api/auth/facebook/callback
  ```

### 4. Add Facebook SDK to Frontend
The Facebook SDK needs to be initialized in your React app.

Add this to your `frontend/public/index.html` before closing `</body>` tag:

```html
<!-- Facebook SDK -->
<script>
  window.fbAsyncInit = function() {
    FB.init({
      appId      : '962596279298517',
      cookie     : true,
      xfbml      : true,
      version    : 'v18.0'
    });
    FB.AppEvents.logPageView();
  };

  (function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
</script>
```

### 5. Alternative: Use Server-Side OAuth Flow
If SDK issues persist, use the server-side OAuth flow instead:
1. Click "Login with Facebook" button (uses OAuth, not SDK)
2. This redirects to Facebook's OAuth page
3. After authorization, redirects back to your app

## Quick Fix for Development:

### Option 1: Use OAuth Flow (Recommended)
Instead of using the SDK test page, use the main authentication flow:
1. Go to http://localhost:3000
2. Click "Connect Facebook Account" 
3. This uses server-side OAuth which doesn't have domain restrictions

### Option 2: Add localhost to Facebook App
1. Go to your Facebook App Dashboard
2. Settings → Basic → App Domains
3. Add `localhost` (sometimes Facebook doesn't accept this)
4. Save Changes

### Option 3: Use lvh.me domain
1. Access your app via http://lvh.me:3000 instead of localhost
2. lvh.me resolves to 127.0.0.1 and is more Facebook-friendly

## Testing Token Without SDK:
You can also get a test token from:
https://developers.facebook.com/tools/explorer/

1. Select your app
2. Generate access token with required permissions
3. Copy token and user ID
4. Paste into the Facebook SDK Test page

## Verification:
After setup, check that domains are properly configured:
- Facebook App Dashboard → Settings → Basic → App Domains
- Facebook Login → Settings → Valid OAuth Redirect URIs