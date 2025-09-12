# Technical Drawing Analyzer - Backend API

This is the backend API server for the Technical Drawing Analyzer application, designed to run on Render.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp env.example .env
# Edit .env with your actual values
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Production Server
```bash
npm start
```

## 🔧 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 | Yes | - |
| `APP_USERNAME` | Login username | No | admin |
| `APP_PASSWORD` | Login password | No | admin |
| `SESSION_SECRET` | Session encryption key | Yes | - |
| `NODE_ENV` | Environment mode | No | development |
| `PORT` | Server port | No | 3000 |

## 📡 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/auth-status` - Check authentication status

### Analysis
- `POST /api/analyze` - Analyze technical drawings (requires auth)
- `POST /api/chat` - Chat with AI assistant (requires auth)

### Health
- `GET /health` - Server health check

## 🔒 Security Features

- Session-based authentication
- CORS protection for specific origins
- Input validation and sanitization
- Rate limiting ready
- Secure cookie configuration

## 🌐 CORS Configuration

The server is configured to accept requests from:
- `https://tech-drawings.vercel.app` (Production frontend)
- `http://localhost:3000` (Local development)
- `http://localhost:5173` (Vite dev server)

## 🚀 Deployment on Render

1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Configure environment variables in Render dashboard
5. Deploy!

## 📝 Logs

The server provides detailed logging for:
- Health check requests
- Authentication attempts
- API errors
- Server startup information
# Render Backend Status Check
