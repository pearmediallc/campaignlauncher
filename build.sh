#!/bin/bash

echo "🔨 Starting build process..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
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

echo "✅ Build complete!"