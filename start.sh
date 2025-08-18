#!/bin/bash

# Technical Drawing Analyzer Startup Script
echo "🚀 Starting Technical Drawing Analyzer..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "📥 Installing Python dependencies..."
pip install -r requirements.txt

# Install Node.js dependencies
echo "📥 Installing Node.js dependencies..."
npm install

# Build frontend for production
echo "🔨 Building frontend for production..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Frontend build failed. Please check for errors."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Please create one based on env.example"
    echo "   Make sure to set your OPENAI_API_KEY"
    exit 1
fi

# Start the web application
echo "🌟 Starting the Technical Drawing Analyzer web app..."
echo "   🌍 Web App: http://localhost:10000"
echo "   📁 Upload folder: uploads/"
echo "   🔒 Default login: admin / admin"
echo "   Press Ctrl+C to stop the application"

# Start Flask backend (which now serves the frontend)
python app.py
