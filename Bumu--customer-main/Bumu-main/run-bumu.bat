@echo off
title BUMU Dev Launcher
REM Change working directory to the folder containing this script
cd /d "%~dp0"
REM Start Vite dev server in a new command window
start "BUMU Server" cmd /k "npm run dev -- --port 5174"
REM Give the server a moment to start, then open the browser
timeout /t 3 /nobreak >nul
start "" "http://localhost:5174/"
exit
