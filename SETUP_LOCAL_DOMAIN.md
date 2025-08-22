# Setup Local Domain for Facebook SDK

## Step 1: Add to hosts file

Run this command in terminal:
```bash
sudo echo "127.0.0.1 local.fbcampaigns.dev" >> /etc/hosts
```

Or manually edit:
```bash
sudo nano /etc/hosts
```

Add this line:
```
127.0.0.1 local.fbcampaigns.dev
```

## Step 2: Update Facebook App Settings

Go to: https://developers.facebook.com/apps/962596279298517/settings/basic/

### App Domains
Add:
```
fbcampaigns.dev
```

### Site URL (if present)
```
https://local.fbcampaigns.dev:3000
```

Go to: https://developers.facebook.com/apps/962596279298517/fb-login/settings/

### Valid OAuth Redirect URIs
Add:
```
https://local.fbcampaigns.dev:5002/api/auth/facebook/callback
https://local.fbcampaigns.dev:3000
```

### Allowed Domains for the JavaScript SDK
Add:
```
fbcampaigns.dev
```

## Step 3: Access your app

Instead of https://localhost:3000, use:
```
https://local.fbcampaigns.dev:3000
```

This domain will work with Facebook SDK!