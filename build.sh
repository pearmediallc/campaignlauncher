#!/bin/bash

echo "🔨 Starting build process..."
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"

# Build frontend
echo "📦 Building frontend..."
cd frontend
echo "In frontend directory: $(pwd)"
npm install
npm run build
echo "Frontend build completed. Checking build directory:"
ls -la build/ 2>/dev/null || echo "Build directory not found!"
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Run database migrations (always in production on Render)
echo "🗄️ Running database migrations..."
NODE_ENV=production npx sequelize-cli db:migrate || echo "Migration failed or already applied"

# Run seeders to create admin user
echo "🌱 Running database seeders..."
NODE_ENV=production npx sequelize-cli db:seed:all || echo "Seeders failed or already applied"

cd ..

echo "Final directory structure:"
echo "Root directory: $(pwd)"
echo "Frontend build exists: $([ -d frontend/build ] && echo 'YES' || echo 'NO')"
echo "Backend exists: $([ -d backend ] && echo 'YES' || echo 'NO')"

echo "✅ Build complete!"