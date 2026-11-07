@echo off
title Campus Mart - 1-Click Excel Price Updater
cd /d "C:\Users\deepa\Downloads\capus canteen preoder"

echo ======================================================================
echo    Campus Mart - Updating Menu Prices from all_menu_prices.csv
echo ======================================================================
echo.

python sync_prices_from_csv.py

echo.
echo ======================================================================
pause
