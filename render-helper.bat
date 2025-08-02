@echo off
REM Render CLI Helper Script for Stock Sense Backend (Windows)
REM Service ID: srv-d270p0p5pdvs73bttkog

set SERVICE_ID=srv-d270p0p5pdvs73bttkog
set RENDER_CLI=render.exe

echo 🚀 Stock Sense Backend - Render CLI Helper
echo ===========================================
echo.

if "%1"=="" goto help
if "%1"=="logs" goto logs
if "%1"=="quick-logs" goto quick-logs
if "%1"=="deploys" goto deploys
if "%1"=="status" goto status
if "%1"=="deploy" goto deploy
if "%1"=="restart" goto restart
if "%1"=="ssh" goto ssh
goto help

:logs
echo 📋 Viewing live logs...
%RENDER_CLI% logs --resources %SERVICE_ID% --tail
goto end

:quick-logs
echo 📋 Last 20 log entries:
%RENDER_CLI% logs --resources %SERVICE_ID% --limit 20 --output text
goto end

:deploys
echo 🚢 Recent deployments:
%RENDER_CLI% deploys list %SERVICE_ID% --output json
goto end

:status
echo 📊 Service status:
%RENDER_CLI% services --output json
goto end

:deploy
echo 🚀 Triggering new deployment...
%RENDER_CLI% deploys create %SERVICE_ID%
goto end

:restart
echo 🔄 Restarting service...
%RENDER_CLI% restart --resources %SERVICE_ID%
goto end

:ssh
echo 🔗 Opening SSH session...
%RENDER_CLI% ssh --resources %SERVICE_ID%
goto end

:help
echo Usage: %0 {logs^|deploys^|status^|deploy^|restart^|ssh^|quick-logs}
echo.
echo Available commands:
echo   logs        - View live logs (tail mode)
echo   quick-logs  - Show last 20 log entries
echo   deploys     - Show recent deployments
echo   status      - Show service status
echo   deploy      - Trigger new deployment
echo   restart     - Restart the service
echo   ssh         - Open SSH session to service
echo.
echo Examples:
echo   %0 logs       # View live logs
echo   %0 quick-logs # Show recent logs
echo   %0 status     # Check service status

:end
