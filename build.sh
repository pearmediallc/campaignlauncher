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

# Run database migrations in production
if [ "$NODE_ENV" = "production" ]; then
  echo "🗄️ Running database migrations..."
  npx sequelize-cli db:migrate
fi

echo "✅ Build complete!"