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
| `OPENAI_API_KEY` | OpenAI API key for GPT models | Yes | - |
| `OPENAI_MODEL_CANDIDATES` | Comma-separated fallback order (e.g. `gpt-5.3,gpt-5,gpt-4o`) | No | `gpt-5.3,gpt-5,gpt-4o` |
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

### Option A: Use `render.yaml` (recommended)
1. Push this repository with `render.yaml` at repo root.
2. In Render, create service from **Blueprint**.
3. Render will automatically use:
   - `rootDir: backend`
   - `buildCommand: npm ci`
   - `startCommand: npm start`
   - health check `/health`

### Option B: Manual service setup
If you create a Web Service manually, set:
- **Root Directory**: `backend`
- **Build Command**: `npm ci`
- **Start Command**: `npm start`
- **Environment**: Node

### Required environment variables
- `OPENAI_API_KEY`
- `SESSION_SECRET`
- (optional) `APP_USERNAME`, `APP_PASSWORD`, `OPENAI_MODEL_CANDIDATES`

### Important
If Render is still deploying an older broken commit (e.g. syntax error around line 772), trigger **Manual Deploy → Deploy latest commit** after confirming your branch includes the fix.

## 📝 Logs

The server provides detailed logging for:
- Health check requests
- Authentication attempts
- API errors
- Server startup information
# Render Backend Status Check


## 🤖 Model Selection

The backend uses a configurable fallback model order for both `/api/analyze` and `/api/chat`.
It tries each model in `OPENAI_MODEL_CANDIDATES` until a non-empty response is returned.

