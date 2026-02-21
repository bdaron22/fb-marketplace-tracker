@echo off
echo ================================
echo  FB Marketplace Tracker
echo ================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Starting the app... (first time takes a few minutes to build)
echo.
docker compose up --build -d

if errorlevel 1 (
    echo.
    echo ERROR: Something went wrong. Make sure Docker Desktop is running.
    pause
    exit /b 1
)

echo.
echo ================================
echo  App is ready!
echo  Opening http://localhost:8090
echo ================================
echo.
timeout /t 2 /nobreak >nul
start http://localhost:8090
