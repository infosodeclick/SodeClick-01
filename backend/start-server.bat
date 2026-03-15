@echo off
echo Starting SodeClick Backend Server...

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Set environment variables
set NODE_ENV=development
set PORT=5000

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

REM Start the server with nodemon for development
echo Starting server in development mode...
npm run dev

REM Alternative: Start with PM2 for production
REM pm2 start ecosystem.config.js --env development

pause
