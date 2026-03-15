#!/bin/bash

# Railway Deployment Script
echo "🚀 Starting Railway deployment process..."

# Install dependencies
echo "📦 Installing root dependencies..."
npm install

echo "📦 Installing frontend dependencies..."
cd frontend
npm install

echo "📦 Installing backend dependencies..."
cd ../backend
npm install

# Build frontend for production
echo "🔨 Building frontend for production..."
cd ../frontend
npm run build

echo "✅ Build completed successfully!"

# Start backend server (Railway will handle this)
echo "🚀 Starting backend server..."
cd ../backend
npm start
