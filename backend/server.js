import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import session from 'express-session';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

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
  proxy: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Set to true in production for HTTPS, false for local HTTP
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none' // Required for cross-origin requests
  }
}));

// Initialize OpenAI with error handling
let openai;
try {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not set - AI features will be disabled');
    openai = null;
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client initialized');
  }
} catch (error) {
  console.error('❌ OpenAI initialization failed:', error.message);
  openai = null;
}

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

// PDF text extraction function using pdfjs-dist
const extractPdfText = async (pdfBuffer) => {
  try {
    console.log('Extracting text from PDF using pdfjs-dist...');
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      useSystemFonts: true
    });
    
    const pdfDocument = await loadingTask.promise;
    console.log('PDF loaded, pages:', pdfDocument.numPages);
    
    let fullText = '';
    const metadata = {
      title: 'Untitled',
      author: 'Unknown',
      creator: 'Unknown',
      producer: 'Unknown'
    };
    
    // Extract metadata
    if (pdfDocument.info) {
      metadata.title = pdfDocument.info.Title || 'Untitled';
      metadata.author = pdfDocument.info.Author || 'Unknown';
      metadata.creator = pdfDocument.info.Creator || 'Unknown';
      metadata.producer = pdfDocument.info.Producer || 'Unknown';
    }
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ')
        .trim();
      
      if (pageText) {
        fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
      }
    }
    
    console.log('Text extraction completed, length:', fullText.length);
    
    return {
      success: true,
      text: fullText,
      pages: pdfDocument.numPages,
      metadata: metadata
    };
  } catch (error) {
    console.error('PDF text extraction error:', error);
    return {
      success: false,
      error: error.message
    };
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

// Wake-up ping endpoint for Render spin-up
app.get('/ping', (req, res) => {
  console.log('Ping requested from:', req.headers['user-agent']);
  res.status(200).json({ 
    status: 'awake',
    timestamp: new Date().toISOString(),
    message: 'Backend is awake and ready'
  });
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
    console.log('File analysis request received');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('File data present:', !!req.body.file);
    console.log('Message:', req.body.message);
    
    const { file, message } = req.body;

    if (!file || !file.data) {
      console.log('No file data provided');
      return res.status(400).json({ error: 'No file data provided' });
    }

    if (!openai) {
      console.log('OpenAI not available - API key missing');
      return res.status(503).json({ 
        error: 'AI service unavailable - OpenAI API key not configured' 
      });
    }

    console.log('Starting OpenAI analysis...');
    console.log('File type:', file.type);
    console.log('File name:', file.name);

    // Check if it's an image or PDF
    const isImage = file.type && file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (isPDF) {
      // Extract and analyze PDF text content
      console.log('PDF file detected - extracting text content for analysis');
      
      try {
        // Extract base64 data from the file
        const base64Data = file.data.split(',')[1]; // Remove data:application/pdf;base64, prefix
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        
        // Extract text from PDF
        const extractionResult = await extractPdfText(pdfBuffer);
        
        if (!extractionResult.success) {
          console.log('PDF text extraction failed:', extractionResult.error);
          return res.status(400).json({ 
            error: `PDF text extraction failed: ${extractionResult.error}` 
          });
        }
        
        console.log('PDF text extracted successfully, analyzing content...');
        console.log('PDF pages:', extractionResult.pages);
        console.log('Text length:', extractionResult.text.length);
        
        // Analyze the extracted text with GPT-4o
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert in analyzing technical documents, engineering specifications, and technical drawings. Focus on identifying and explaining technical components, specifications, and important details from the provided text content. Provide detailed, professional analysis including component identification, specifications, and technical standards.

This text was extracted from a PDF document. Please provide comprehensive analysis of the technical content, including any technical drawings descriptions, component specifications, dimensions, materials, and engineering standards mentioned.`
            },
            {
              role: "user",
              content: `${message || "Please analyze this technical document."}

📄 **Document Information:**
- **Filename:** ${file.name}
- **Pages:** ${extractionResult.pages}
- **Title:** ${extractionResult.metadata.title}
- **Author:** ${extractionResult.metadata.author}
- **Creator:** ${extractionResult.metadata.creator}

**PDF Content:**
${extractionResult.text}`
            }
          ],
          max_tokens: 1500,
        });
        
        console.log('OpenAI analysis completed successfully for PDF');
        res.json({ 
          response: `📄 **PDF Document Analysis Complete**

**Document Details:**
- **Filename:** ${file.name}
- **Pages:** ${extractionResult.pages}
- **Title:** ${extractionResult.metadata.title}
- **Author:** ${extractionResult.metadata.author}
- **Creator:** ${extractionResult.metadata.creator}

---

${response.choices[0].message.content}`
        });
        return;
        
      } catch (error) {
        console.error('PDF processing error:', error);
        return res.status(500).json({ 
          error: `PDF processing failed: ${error.message}` 
        });
      }
    }

    if (!isImage) {
      return res.status(400).json({ 
        error: 'Unsupported file type. Please upload images (PNG, JPG, JPEG) or PDF files.' 
      });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert in analyzing technical drawings and engineering documents. Focus on identifying and explaining technical components, specifications, and important details from the provided images. Provide detailed, professional analysis including component identification, specifications, and technical standards."
        },
        {
          role: "user",
          content: [
            { type: "text", text: message || "Please analyze this technical drawing." },
            {
              type: "image_url",
              image_url: {
                url: file.data,
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    });

    console.log('OpenAI analysis completed successfully');
    res.json({ response: response.choices[0].message.content });
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code
    });
    
    let errorMessage = 'Failed to analyze file';
    let statusCode = 500;
    
    if (error.code === 'insufficient_quota') {
      errorMessage = 'OpenAI API quota exceeded. Please check your billing.';
      statusCode = 402;
    } else if (error.code === 'invalid_api_key') {
      errorMessage = 'OpenAI API key is invalid. Please check configuration.';
      statusCode = 401;
    } else if (error.code === 'model_not_found') {
      errorMessage = 'AI model not available. Please try again later.';
      statusCode = 404;
    } else if (error.code === 'invalid_image_format') {
      errorMessage = 'Invalid image format. Please upload PNG, JPG, or JPEG images.';
      statusCode = 400;
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      statusCode = 429;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
      statusCode = 408;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
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

    if (!openai) {
      return res.status(503).json({ 
        error: 'AI service unavailable - OpenAI API key not configured' 
      });
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

console.log('🚀 Starting Technical Drawing Analyzer Backend...');
console.log('📋 Environment Variables:');
console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`  - PORT: ${PORT}`);
console.log(`  - APP_USERNAME: ${process.env.APP_USERNAME || 'admin'}`);
console.log(`  - SESSION_SECRET: ${process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`  - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: https://tech-drawings.vercel.app`);
  console.log(`🔑 Authentication: ${process.env.APP_USERNAME || 'admin'}`);
  console.log(`🤖 AI Service: ${openai ? '✅ Available' : '❌ Disabled'}`);
  console.log('🎉 Server startup complete!');
});