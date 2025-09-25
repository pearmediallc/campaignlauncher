#!/bin/bash
set -e  # Exit on any error

echo "🔨 Starting build process..."
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"

# Build frontend
echo "📦 Building frontend..."
cd frontend
echo "In frontend directory: $(pwd)"
echo "Installing frontend dependencies..."
npm install || { echo "❌ Frontend install failed!"; exit 1; }

echo "Building React app (with increased memory)..."
# Increase Node memory for build process
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build || { echo "❌ Frontend build failed!"; exit 1; }

echo "Frontend build completed. Checking build directory:"
if [ -f build/index.html ]; then
  echo "✅ index.html found in build directory"
  ls -la build/ | head -10
else
  echo "❌ ERROR: build/index.html not found!"
  echo "Build directory contents:"
  ls -la build/ 2>/dev/null || echo "Build directory doesn't exist!"
  exit 1
fi
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install || { echo "❌ Backend install failed!"; exit 1; }

# Run database migrations (always in production on Render)
echo "🗄️ Running database migrations..."
NODE_ENV=production npx sequelize-cli db:migrate || echo "⚠️ Migration warning (may already be applied)"

# Run seeders to create admin user (ignore errors as user might already exist)
echo "🌱 Running database seeders..."
NODE_ENV=production npx sequelize-cli db:seed:all 2>/dev/null || echo "ℹ️ Seeder info: Admin user likely already exists"

cd ..

echo "Final directory structure:"
echo "Root directory: $(pwd)"
echo "Frontend build exists: $([ -d frontend/build ] && echo 'YES' || echo 'NO')"
echo "Frontend build/index.html exists: $([ -f frontend/build/index.html ] && echo 'YES' || echo 'NO')"
echo "Backend exists: $([ -d backend ] && echo 'YES' || echo 'NO')"

if [ ! -f frontend/build/index.html ]; then
  echo "❌ CRITICAL ERROR: Frontend build/index.html not found after build!"
  exit 1
fi

echo "✅ Build complete!"