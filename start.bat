@echo off
echo Starting HR Tracking System...
echo.

start "HR Backend" cmd /k "cd /d %~dp0backend && node server.js"
timeout /t 2 /nobreak >nul
start "HR Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Both servers are starting in separate windows.
pause
