# Starting the Facebook Campaign Launcher

## Prerequisites

1. **MySQL** - Make sure MySQL is running on port 3306
2. **Redis** - Make sure Redis is running on port 6379
3. **Node.js** - Version 16 or higher
4. **SSL Certificates** - Already generated in `/certificates` folder

## Backend Setup

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Install dependencies (if not already installed)
```bash
npm install
```

### 3. Setup Database
```bash
# Create database and run migrations
npm run migrate

# Seed initial admin user (optional)
npm run seed
```

### 4. Start Backend Server

**Option A: HTTPS Server (Required for Facebook OAuth)**
```bash
npm run start:https
```
Server will run on: https://lvh.me:5002

**Option B: Development mode with auto-reload**
```bash
npm run dev:https
```

## Frontend Setup

### 1. Open new terminal and navigate to frontend
```bash
cd frontend
```

### 2. Install dependencies (if not already installed)
```bash
npm install
```

### 3. Create .env file for frontend
```bash
# Create .env file with backend URL
echo "REACT_APP_API_URL=https://lvh.me:5002" > .env
```

### 4. Start Frontend Server
```bash
npm start
```
Frontend will run on: http://localhost:3000

## Quick Start (Both Servers)

### Using two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:https
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

## Access the Application

1. Open browser and go to: http://localhost:3000
2. Register a new user or login
3. Connect your Facebook account
4. Select your ad account and pages
5. Start creating campaigns!

## Troubleshooting

### Database Connection Issues
- Ensure MySQL is running: `mysql.server start` (Mac) or `sudo service mysql start` (Linux)
- Check credentials in `backend/.env`

### Redis Connection Issues
- Ensure Redis is running: `redis-server`
- Check Redis connection in `backend/.env`

### SSL Certificate Issues
- Certificates are in `/certificates` folder
- If browser shows security warning, click "Advanced" → "Proceed to lvh.me"

### Facebook OAuth Issues
- Ensure you're using `https://lvh.me:5002` for backend
- Check FB_APP_ID and FB_APP_SECRET in `backend/.env`
- Verify redirect URI matches Facebook app settings

### Port Already in Use
- Backend (5002): `lsof -i :5002` then `kill -9 <PID>`
- Frontend (3000): `lsof -i :3000` then `kill -9 <PID>`

## Development Tips

1. Use `npm run dev:https` for backend to enable hot-reload
2. Frontend has hot-reload enabled by default
3. Check backend logs for API errors
4. Use Chrome DevTools Network tab to debug API calls
5. Redis Commander (optional): `npm install -g redis-commander && redis-commander`