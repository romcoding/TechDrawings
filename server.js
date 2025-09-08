import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import session from 'express-session';

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Session configuration for Vercel
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.loggedIn) {
    return next();
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({ 
    status: 'ok',
    authenticated: req.session && req.session.loggedIn || false,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Also add a simple ping endpoint
app.get('/ping', (req, res) => {
  res.status(200).json({ message: 'pong' });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    const validUsername = process.env.APP_USERNAME || 'admin';
    const validPassword = process.env.APP_PASSWORD || 'admin';
    
    if (username === validUsername && password === validPassword) {
      req.session.loggedIn = true;
      req.session.username = username;
      res.json({ 
        success: true, 
        message: 'Login successful',
        username: username
      });
    } else {
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
  res.json({ 
    authenticated: req.session && req.session.loggedIn || false,
    username: req.session && req.session.username || null
  });
});

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

// Export the app for Vercel
export default app;

// Only start server if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}