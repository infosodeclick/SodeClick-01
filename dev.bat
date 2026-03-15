@echo off
chcp 65001 >nul
echo 🪟 Starting Windows development environment...
echo.

echo 📝 Copying environment files...
if exist frontend\env.development (
    copy /Y frontend\env.development frontend\.env >nul 2>&1
    echo ✅ Copied frontend environment file
) else (
    echo ⚠️  Frontend env.development not found
)

if exist backend\env.development (
    copy /Y backend\env.development backend\.env >nul 2>&1
    echo ✅ Copied backend environment file
) else (
    echo ⚠️  Backend env.development not found
)

echo.
echo 🚀 Starting development servers...
echo Backend will run on http://localhost:5000
echo Frontend will run on http://localhost:5173
echo Press Ctrl+C to stop all servers
echo.

start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Development servers are starting in separate windows
echo You can close this window safely
echo.

