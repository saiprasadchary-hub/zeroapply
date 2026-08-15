@echo off
title ZeroApply Desktop Application Launcher
echo =================================================================
echo   ZeroApply High-Output Persona Management ^& Native Desktop App
echo =================================================================
echo.
echo Cleaning up existing instances...
taskkill /f /im electron.exe >nul 2>&1
echo.
echo Building latest web assets...
call npm run build
echo.
echo Launching native Chromium Desktop window...
echo.
npx electron .
