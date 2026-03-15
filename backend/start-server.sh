#!/bin/bash

echo "Starting SodeClick Backend Server..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Set environment variables
export NODE_ENV=development
export PORT=5000

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the server with nodemon for development
echo "Starting server in development mode..."
npm run dev

# Alternative: Start with PM2 for production
# pm2 start ecosystem.config.js --env development
