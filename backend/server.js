import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import session from 'express-session';

dotenv.config();

const app = express();

// CORS configuration for frontend
app.use(cors({
  origin: [
    'https://tech-drawings.vercel.app',
    'http://localhost:3000', 
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for Render compatibility
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none' // Required for cross-origin requests
  }
}));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  console.log('RequireAuth check - Session ID:', req.sessionID);
  console.log('RequireAuth check - Session:', req.session);
  console.log('RequireAuth check - Headers:', req.headers);
  
  if (req.session && req.session.loggedIn) {
    console.log('Authentication successful');
    return next();
  } else {
    console.log('Authentication failed - no valid session');
    return res.status(401).json({ error: 'Authentication required' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested from:', req.headers['user-agent']);
  
  try {
    res.status(200).json({ 
      status: 'healthy',
      model: 'gpt-4o',
      standards: [
        'VDI 3814',
        'ISO 16484', 
        'ISO 14617',
        'IEC 60617',
        'DIN EN 81346'
      ],
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      vercel: process.env.VERCEL === '1' ? 'Yes' : 'No'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

// Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username, password: '***' });
    console.log('Session before login:', req.session);
    
    const validUsername = process.env.APP_USERNAME || 'admin';
    const validPassword = process.env.APP_PASSWORD || 'admin';
    
    if (username === validUsername && password === validPassword) {
      req.session.loggedIn = true;
      req.session.username = username;
      
      console.log('Login successful, session after login:', req.session);
      console.log('Session ID:', req.sessionID);
      
      res.json({ 
        success: true, 
        message: 'Login successful',
        username: username
      });
    } else {
      console.log('Invalid credentials');
      res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed' 
    });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Logout failed' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Logout successful' 
    });
  });
});

// Check authentication status
app.get('/api/auth-status', (req, res) => {
  console.log('Auth status check - Session ID:', req.sessionID);
  console.log('Auth status check - Session:', req.session);
  console.log('Auth status check - Headers:', req.headers);
  
  const authenticated = req.session && req.session.loggedIn || false;
  const username = req.session && req.session.username || null;
  
  console.log('Auth status result:', { authenticated, username });
  
  res.json({ 
    authenticated,
    username
  });
});

// File analysis endpoint
app.post('/api/analyze', requireAuth, async (req, res) => {
  try {
    const { file, message } = req.body;

    if (!file || !file.data) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert in analyzing technical drawings, PDFs, and documents. Focus on identifying and explaining technical components, specifications, and important details from the provided files. Provide detailed, professional analysis."
        },
        {
          role: "user",
          content: [
            { type: "text", text: message || "Please analyze this file." },
            {
              type: "image_url",
              image_url: {
                url: file.data,
              }
            }
          ]
        }
      ],
      max_tokens: 500,
    });

    res.json({ response: response.choices[0].message.content });
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    res.status(500).json({ 
      error: 'Failed to analyze file',
      details: error.message 
    });
  }
});

// Chat endpoint
app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'No message provided' });
    }

    const messages = [
      {
        role: "system",
        content: "You are an expert in technical drawings and documents. Help users understand technical components and answer their questions about specifications, systems, and technical details."
      },
      ...context,
      { role: "user", content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 500,
    });

    res.json({ response: response.choices[0].message.content });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message 
    });
  }
});

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: https://tech-drawings.vercel.app`);
  console.log(`🔑 Authentication: ${process.env.APP_USERNAME || 'admin'}`);
});
