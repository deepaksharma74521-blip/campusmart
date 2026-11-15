@echo off
title Campus Mart - 24x7 Live Server & Tunnel
color 0a

echo =======================================================================
echo           TMU CAMPUS MART - 24x7 PUBLIC SERVER & TUNNEL
echo =======================================================================
echo.
echo [1/2] Verifying Local Backend Server on Port 5000...
powershell -Command "try { $res = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/menu' -TimeoutSec 2; Write-Host '[OK] Flask Server is actively running!' -ForegroundColor Green } catch { Start-Process python -ArgumentList 'server.py' -WindowStyle Minimized; Write-Host '[OK] Flask Server started in background.' -ForegroundColor Cyan }"

echo.
echo [2/2] Launching Public Live Tunnel (100%% Free, Unlimited Bandwidth)...
echo.
echo =======================================================================
echo  PUBLIC WORLDWIDE LINK WILL APPEAR BELOW (Open on any Mobile/Laptop):
echo =======================================================================
echo.

npx --yes tunnelmole 5000
pause
