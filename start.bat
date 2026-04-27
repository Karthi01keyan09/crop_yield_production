@echo off
echo ==========================================
echo   CropSense AI — Setup ^& Launch Script
echo ==========================================
echo.

cd /d "%~dp0backend"

echo [1/3] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: pip install failed. Please ensure Python 3.10+ is installed.
    pause
    exit /b 1
)

echo.
echo [2/3] Generating dataset...
python data\generate_data.py
echo.

echo [3/3] Starting Flask API (models will train on first run)...
echo Open frontend\index.html in your browser once the API starts.
echo Press CTRL+C to stop.
echo.
python app.py
pause
