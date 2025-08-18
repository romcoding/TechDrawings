@echo off
echo 🚀 Starting Technical Drawing Analyzer...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install Python dependencies
echo 📥 Installing Python dependencies...
pip install -r requirements.txt

REM Install Node.js dependencies
echo 📥 Installing Node.js dependencies...
npm install

REM Build frontend for production
echo 🔨 Building frontend for production...
npm run build

REM Check if build was successful
if not exist "dist" (
    echo ❌ Frontend build failed. Please check for errors.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  No .env file found. Please create one based on env.example
    echo    Make sure to set your OPENAI_API_KEY
    pause
    exit /b 1
)

REM Start the web application
echo 🌟 Starting the Technical Drawing Analyzer web app...
echo    🌍 Web App: http://localhost:10000
echo    📁 Upload folder: uploads/
echo    🔒 Default login: admin / admin
echo    Press Ctrl+C to stop the application

REM Start Flask backend (which now serves the frontend)
python app.py

pause
