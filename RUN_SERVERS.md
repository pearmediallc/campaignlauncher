# 🖥️ How to Run Servers with Logs Visible

## Terminal Setup (3 terminals needed)

### Terminal 1 - Backend (with logs)
```bash
cd /Users/mac/Desktop/campaign/fb-campaign-launcher/backend
npm run start:https
```
You'll see:
- API requests
- Authentication attempts  
- Database queries
- Error messages

### Terminal 2 - Frontend (with logs)
```bash
cd /Users/mac/Desktop/campaign/fb-campaign-launcher/frontend
npm start
```
You'll see:
- Compilation status
- React warnings/errors
- Network requests

### Terminal 3 - Ngrok (keep running)
```bash
ngrok http https://localhost:3000
```
You'll see:
- Tunnel URL
- Request forwarding

## Current Running Processes

Your servers are currently running in background:
- Backend: bash_29 (HTTPS on port 5002)
- Frontend: bash_28 (HTTPS on port 3000)
- Ngrok: Forwarding to frontend

## To Switch to Foreground (see logs):

1. Kill background processes:
```bash
# Find process IDs
ps aux | grep -E "server-https|react-scripts"

# Kill them
kill [PID]
```

2. Start in foreground terminals as shown above

## Important Points

✅ **Ngrok does NOT replace your servers** - it just provides a public URL
✅ **Both servers MUST be running** for the app to work
✅ **Logs appear in the terminal** where servers are running
✅ **Access via ngrok URL** but servers run locally

## Quick Check - Are servers running?
```bash
# Check backend
curl -k https://localhost:5002/api/health

# Check frontend  
curl -k https://localhost:3000

# Check ngrok
curl https://831f82429126.ngrok-free.app
```