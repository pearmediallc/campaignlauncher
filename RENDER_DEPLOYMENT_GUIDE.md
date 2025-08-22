# Render Deployment Guide

## Pre-Deployment Checklist

✅ PostgreSQL dependencies installed (`pg` and `pg-hstore`)
✅ Single server configuration ready
✅ Production database config updated
✅ Privacy and Terms pages ready

## Step 1: Build Frontend Locally (Test)

```bash
cd frontend
npm run build
```

## Step 2: Push to GitHub

If you haven't already created a GitHub repository:

```bash
git init
git add .
git commit -m "Prepare for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fb-campaign-launcher.git
git push -u origin main
```

## Step 3: Deploy to Render

1. **Login to Render**: https://dashboard.render.com
   - Email: shubham.chandrabansi@pearmediallc.com
   - Password: (your password)

2. **Create PostgreSQL Database First**:
   - Click "New +" → "PostgreSQL"
   - Name: `fb-campaign-db`
   - Database: `fb_campaign_launcher`
   - User: (auto-generated)
   - Region: Choose closest to you
   - Plan: Free
   - Click "Create Database"
   - **COPY THE DATABASE URL** (Internal Database URL)

3. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Configure:
     - **Name**: `fb-campaign-launcher`
     - **Environment**: `Node`
     - **Build Command**: 
       ```bash
       cd frontend && npm install && npm run build && cd ../backend && npm install
       ```
     - **Start Command**: 
       ```bash
       cd backend && node server.js
       ```
     - **Plan**: Free

4. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):

```bash
# Essential Variables
NODE_ENV=production
PORT=10000

# Database (Render provides this automatically when you connect the database)
DATABASE_URL=[Will be auto-filled when you connect the database]

# Security (Use the generated values from earlier)
JWT_SECRET=Ao2Z4tdB80IVODQk/kdGYKyyPrRmZft+3ZX0qbicVsk=
SESSION_SECRET=MskUoKqvnY8sFAw7OcZ2ZFqam+TVhHPKVBm2R8dZTuA=
ENCRYPTION_KEY=e29fe77ea230949d852fa37ce034473c3f91082d054465ffaa787cd7e02e86b4

# Facebook App
FB_APP_ID=735375959485927
FB_APP_SECRET=[Your Facebook App Secret from Dashboard]
FB_API_VERSION=v18.0

# URLs (Update with your Render URL after creation)
FB_REDIRECT_URI=https://fb-campaign-launcher.onrender.com/api/auth/facebook/callback
FRONTEND_URL=https://fb-campaign-launcher.onrender.com
BACKEND_URL=https://fb-campaign-launcher.onrender.com

# Redis (Optional - leave empty for now)
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
```

5. **Connect Database**:
   - In the web service settings
   - Go to "Environment" tab
   - Under "Databases", click "Connect"
   - Select your PostgreSQL database
   - This automatically adds the DATABASE_URL

6. **Deploy**:
   - Click "Create Web Service"
   - Wait for build and deployment (5-10 minutes)

## Step 4: Run Database Migrations

After deployment, you need to run migrations on the PostgreSQL database:

1. In Render Dashboard, go to your web service
2. Click "Shell" tab
3. Run:
```bash
cd backend
npx sequelize-cli db:migrate --env production
```

## Step 5: Update Facebook App Dashboard

Once deployed, your app will be at: `https://fb-campaign-launcher.onrender.com`

Update these URLs in Facebook App Dashboard:

1. **Settings → Basic**:
   - App Domains: `fb-campaign-launcher.onrender.com`
   - Privacy Policy URL: `https://yourdomain.com/privacy-policy.html`
   - Terms of Service URL: `https://yourdomain.com/terms-of-service.html`

2. **Facebook Login → Settings**:
   - Valid OAuth Redirect URIs:
     ```
     https://fb-campaign-launcher.onrender.com/api/auth/facebook/callback
     ```
   - Deauthorize Callback URL:
     ```
     https://fb-campaign-launcher.onrender.com/api/data-deletion/callback
     ```
   - Data Deletion Request URL:
     ```
     https://fb-campaign-launcher.onrender.com/api/data-deletion/callback
     ```

## Step 6: Test Your Deployment

1. Visit: `https://fb-campaign-launcher.onrender.com`
2. Test the login flow
3. Test Facebook OAuth
4. Verify data deletion endpoint:
```bash
curl https://fb-campaign-launcher.onrender.com/api/health
```

## Troubleshooting

### If migrations fail:
- Check DATABASE_URL is set correctly
- Ensure PostgreSQL database is running
- Check logs in Render dashboard

### If Facebook OAuth fails:
- Verify all URLs match exactly
- Check FB_APP_SECRET is correct
- Ensure redirect URIs are whitelisted

### If build fails:
- Check build logs in Render
- Ensure all dependencies are in package.json
- Verify Node version compatibility

## Important Notes

1. **Free Tier Limitations**:
   - Render free tier spins down after 15 minutes of inactivity
   - First request after spin-down takes ~30 seconds
   - Database has limited storage (1GB)

2. **For App Review**:
   - The URL will be: `https://fb-campaign-launcher.onrender.com`
   - This is what Facebook reviewers will access
   - Make sure everything works before submitting

3. **After App Review Approval**:
   - You can change to custom domain
   - Update all URLs in Facebook Dashboard
   - No re-review needed for domain change

## Next Steps After Deployment

1. ✅ Test all functionality
2. ✅ Create test users in Facebook App Dashboard
3. ✅ Record screencast showing app functionality
4. ✅ Submit for App Review

## Support

If you encounter issues:
1. Check Render logs (Dashboard → Logs)
2. Verify environment variables
3. Test database connection
4. Check Facebook App settings match deployed URLs