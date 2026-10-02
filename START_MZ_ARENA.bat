@echo off
title MZ Arena - Local Server
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
    echo Python was not found.
    echo Install Python and try again.
    pause
    exit /b 1
)

echo Starting MZ Arena on http://localhost:5500 ...
start "" "http://localhost:5500/index.html"
python -m http.server 5500
