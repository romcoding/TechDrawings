import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import session from 'express-session';
import fs from 'fs';

let componentCategories = {};

// Function to load categorization data from CSV
const loadCategories = () => {
  try {
    const csvContent = fs.readFileSync('./Elemente_Kategorisierung.csv', 'utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    componentCategories = {};
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const values = line.split(',');
        if (values.length >= 2) {
          const komponente = values[0].trim();
          const kategorie = values[1].trim();
          if (komponente && kategorie) {
            componentCategories[komponente.toLowerCase()] = kategorie;
          }
        }
      }
    }
    
    console.log(`✅ Loaded ${Object.keys(componentCategories).length} component categories from CSV.`);
  } catch (error) {
    console.error('❌ Failed to load component categories from CSV:', error);
  }
};

// Load categories on startup
loadCategories();

dotenv.config();

// Function to extract text from PDF
async function extractPdfText(pdfBuffer) {
  try {
    console.log('Extracting text from PDF using pdfjs-dist...');
    const pdfUint8Array = new Uint8Array(pdfBuffer);
    const pdfDocument = await pdfjs.getDocument({ data: pdfUint8Array }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log(`PDF text extraction successful. Extracted ${fullText.length} characters.`);
    return fullText.trim();
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw error;
  }
}

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

// Progress tracking endpoint
app.get('/api/progress', requireAuth, (req, res) => {
  const sessionId = req.sessionID || 'default';
  const progress = global.analysisProgress?.[sessionId] || {
    stage: 'idle',
    progress: 0,
    message: 'No analysis in progress',
    timestamp: Date.now()
  };
  
  res.json(progress);
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
    
    const { file, message } = req.body;

    if (!file || !file.data) {
      console.log('No file data provided');
      return res.status(400).json({ error: 'No file data provided' });
    }

    console.log('File data present:', !!file.data);
    console.log('Message:', message);

    if (!openai) {
      console.log('OpenAI not available');
      return res.status(503).json({ 
        error: 'AI service unavailable - OpenAI API key not configured' 
      });
    }

    console.log('Starting OpenAI analysis...');

    // Check if it's a PDF file
    const fileType = file.type || 'unknown';
    const fileName = file.name || 'unknown';
    const fileSize = file.size || 'undefined';
    
    console.log('File type:', fileType);
    console.log('File name:', fileName);
    console.log('File size:', fileSize);
    console.log('File data prefix:', file.data.substring(0, 50));

    const isImage = fileType.startsWith('image/');
    const isPDF = fileType === 'application/pdf' || file.data.startsWith('data:application/pdf');
    
    console.log('File type checks:', { isImage, isPDF, fileType });

    let analysisContent = [];
    
    if (isPDF) {
      console.log('PDF file detected - extracting text content for analysis');
      try {
        // Extract base64 data from data URL
        const base64Data = file.data.split(',')[1];
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        
        // Extract text from PDF
        const pdfText = await extractPdfText(pdfBuffer);
        console.log('PDF text extraction successful, text length:', pdfText.length);
        
        // Use text-based analysis for PDFs
        analysisContent = [
          { 
            type: 'text', 
            text: `${message || 'Please analyze this PDF document.'}\n\nPDF Content:\n${pdfText}` 
          }
        ];
      } catch (pdfError) {
        console.error('PDF text extraction failed:', pdfError.message);
        // Fallback to image-based analysis if text extraction fails
        console.log('Falling back to image-based analysis for PDF');
        analysisContent = [
          { type: 'text', text: message || 'Please analyze this PDF document (image-based analysis).' },
          {
            type: 'image_url',
            image_url: {
              url: file.data,
            }
          }
        ];
      }
    } else {
      // For images and other files, use image-based analysis
      console.log('Using image-based analysis');
      
      // Validate and format image data for OpenAI Vision API
      if (!file.data.startsWith('data:')) {
        console.error('Invalid image data format - missing data: prefix');
        return res.status(400).json({ error: 'Invalid image data format' });
      }
      
      // Extract the base64 data and validate it
      const [header, base64Data] = file.data.split(',');
      if (!base64Data) {
        console.error('Invalid image data - no base64 content');
        return res.status(400).json({ error: 'Invalid image data - no base64 content' });
      }
      
      // Validate base64 data
      try {
        Buffer.from(base64Data, 'base64');
      } catch (error) {
        console.error('Invalid base64 data:', error.message);
        return res.status(400).json({ error: 'Invalid base64 image data' });
      }
      
      console.log('Image data validated successfully');
      console.log('Image header:', header);
      console.log('Base64 data length:', base64Data.length);
      
      analysisContent = [
        { type: 'text', text: message || 'Please analyze this technical drawing and create a comprehensive Bill of Materials (BOM).' },
        {
          type: 'image_url',
          image_url: {
            url: file.data,
          }
        }
      ];
    }

    console.log('Sending multiple analysis requests to OpenAI...');
    
    // Store progress for this analysis session
    const sessionId = req.sessionID || 'default';
    global.analysisProgress = global.analysisProgress || {};
    global.analysisProgress[sessionId] = {
      stage: 'starting',
      progress: 0,
      message: 'Starting analysis...',
      timestamp: Date.now()
    };
    
    // Simplified analysis queries to ensure image processing works
    const analysisQueries = [
      {
        name: 'Primary Analysis',
        systemPrompt: 'You are a technical drawing analyst. Analyze the provided image and identify all technical components. Return a JSON array with each component having: anlage (string), artikel (string like "ART-001"), komponente (string), beschreibung (string), bemerkung (string), stueck (number). Return ONLY valid JSON.'
      },
      {
        name: 'Component Focus',
        systemPrompt: 'Analyze the technical drawing image and identify all valves, pumps, sensors, and electrical components. Return a JSON array with each component having: anlage (string), artikel (string like "ART-001"), komponente (string), beschreibung (string), bemerkung (string), stueck (number). Return ONLY valid JSON.'
      }
    ];

    // Execute multiple analysis queries
    const allResponses = [];
    for (let i = 0; i < analysisQueries.length; i++) {
      const query = analysisQueries[i];
      try {
        console.log(`Executing ${query.name}...`);
        
        // Update progress
        global.analysisProgress[sessionId] = {
          stage: query.name.toLowerCase().replace(/\s+/g, '_'),
          progress: Math.round((i / analysisQueries.length) * 80) + 10, // 10-90%
          message: `Executing ${query.name}...`,
          timestamp: Date.now()
        };
        
        console.log(`Sending request to OpenAI for ${query.name}...`);
        console.log('Analysis content type:', analysisContent[0].type);
        console.log('Analysis content length:', analysisContent[0].text?.length || 'N/A');
        if (analysisContent[1] && analysisContent[1].type === 'image_url') {
          console.log('Image URL prefix:', analysisContent[1].image_url.url.substring(0, 50) + '...');
          console.log('Image URL length:', analysisContent[1].image_url.url.length);
        }
        console.log('System prompt length:', query.systemPrompt.length);
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: query.systemPrompt },
            { role: 'user', content: analysisContent }
      ],
      max_tokens: 1500,
    });

        console.log(`${query.name} OpenAI response received successfully`);
        allResponses.push({
          name: query.name,
          response: response.choices[0].message.content
        });
      } catch (error) {
        console.error(`Error in ${query.name}:`, error);
        console.error(`Error details:`, {
          message: error.message,
          status: error.status,
          code: error.code,
          type: error.type
        });
        
        // Add a fallback response for failed queries
        allResponses.push({
          name: query.name,
          response: `[]` // Empty JSON array as fallback
        });
      }
    }

    // Combine and deduplicate results
    let combinedBOM = [];
    const seenComponents = new Set();
    let componentCounter = 1;

    for (const result of allResponses) {
      try {
        let rawResponse = result.response;
        console.log(`${result.name} response:`, rawResponse.substring(0, 200) + "...");
        
        // Clean up markdown formatting
        rawResponse = rawResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        
        // Extract JSON array - be more flexible with malformed JSON
        const jsonMatch = rawResponse.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          rawResponse = jsonMatch[0];
        }
        
        // Try to fix common JSON issues
        rawResponse = rawResponse
          .replace(/,\s*}/g, '}')  // Remove trailing commas before }
          .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
          .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2') // Fix unescaped backslashes
          .replace(/"([^"]*)"([^"]*)"([^"]*)"/g, '"$1\\"$2\\"$3"') // Fix unescaped quotes in strings
          .replace(/"([^"]*)"([^"]*)"([^"]*)"/g, '"$1\\"$2\\"$3"'); // Fix more unescaped quotes
        
      const parsedBOM = JSON.parse(rawResponse);
      if (Array.isArray(parsedBOM)) {
          // Normalize different response formats to our German BOM format
          parsedBOM.forEach(item => {
            let normalizedItem = {};
            
            // Handle different response formats
            if (item.komponente) {
              // Already in German format
              normalizedItem = {
                anlage: item.anlage || "Hauptanlage",
                artikel: item.artikel || `ART-${String(componentCounter).padStart(3, '0')}`,
                komponente: item.komponente,
                beschreibung: item.beschreibung || "Keine Beschreibung verfügbar",
                bemerkung: item.bemerkung || "Keine Bemerkungen",
                stueck: typeof item.stueck === "number" ? item.stueck : 1
              };
            } else if (item.type) {
              // Convert type-based format to German format
              normalizedItem = {
                anlage: "Hauptanlage",
                artikel: `ART-${String(componentCounter).padStart(3, '0')}`,
                komponente: item.type,
                beschreibung: item.description || item.details || item.specifications ? 
                  (typeof item.specifications === 'object' ? 
                    Object.entries(item.specifications).map(([k,v]) => `${k}: ${v}`).join(', ') :
                    (item.description || item.details || "Keine Beschreibung verfügbar")) : 
                  "Keine Beschreibung verfügbar",
                bemerkung: item.manufacturer ? `Hersteller: ${item.manufacturer}` : "Keine Bemerkungen",
                stueck: typeof item.count === "number" ? item.count : 1
              };
            } else if (typeof item === 'string') {
              // Handle simple string array format
              normalizedItem = {
                anlage: "Hauptanlage",
                artikel: `ART-${String(componentCounter).padStart(3, '0')}`,
                komponente: item,
                beschreibung: "Komponente aus technischer Zeichnung",
                bemerkung: "Automatisch erkannt",
                stueck: 1
              };
            } else {
              // Fallback for other formats
              normalizedItem = {
                anlage: "Hauptanlage",
                artikel: `ART-${String(componentCounter).padStart(3, '0')}`,
                komponente: item.name || item.component || "Unbekannte Komponente",
                beschreibung: item.description || item.desc || "Keine Beschreibung verfügbar",
                bemerkung: item.note || item.remark || "Keine Bemerkungen",
                stueck: typeof item.quantity === "number" ? item.quantity : 1
              };
            }
            
            // Create a more flexible deduplication key
            const key = `${normalizedItem.komponente.toLowerCase()}-${normalizedItem.beschreibung.toLowerCase()}`;
            if (!seenComponents.has(key)) {
              seenComponents.add(key);
              combinedBOM.push(normalizedItem);
              componentCounter++;
            }
          });
          console.log(`${result.name} found ${parsedBOM.length} components, added ${parsedBOM.length} to combined list`);
        }
      } catch (parseError) {
        console.error(`Failed to parse ${result.name} response:`, parseError);
        console.error(`Raw response was:`, result.response.substring(0, 500));
        
        // Try to extract components from malformed JSON using regex
        try {
          const componentMatches = result.response.match(/"komponente":\s*"([^"]+)"/g) || 
                                 result.response.match(/"type":\s*"([^"]+)"/g) ||
                                 result.response.match(/"([^"]+)"/g);
          
          if (componentMatches && componentMatches.length > 0) {
            componentMatches.slice(0, 10).forEach(match => {
              const componentName = match.replace(/["{}]/g, '').replace(/^(komponente|type):\s*/, '');
              if (componentName && componentName.length > 2) {
                const key = componentName.toLowerCase();
                if (!seenComponents.has(key)) {
                  seenComponents.add(key);
                  combinedBOM.push({
                    anlage: "Hauptanlage",
                    artikel: `ART-${String(componentCounter).padStart(3, '0')}`,
                    komponente: componentName,
                    beschreibung: "Komponente aus technischer Zeichnung",
                    bemerkung: "Automatisch erkannt",
                    stueck: 1
                  });
                  componentCounter++;
                }
              }
            });
            console.log(`${result.name} extracted ${componentMatches.length} components from malformed JSON`);
          }
        } catch (extractError) {
          console.error(`Failed to extract components from malformed JSON:`, extractError);
        }
      }
    }

    console.log(`Combined analysis found ${combinedBOM.length} unique components`);

    // Update progress for combining phase
    global.analysisProgress[sessionId] = {
      stage: 'combining',
      progress: 90,
      message: `Combining results... Found ${combinedBOM.length} components`,
      timestamp: Date.now()
    };

    console.log("Multiple AI analysis completed successfully");
    
    let bom = [];
    let analysisText = "";
    
    try {
      if (combinedBOM.length > 0) {
        // Process the combined German BOM format
        bom = combinedBOM.map((item, index) => ({
          anlage: item.anlage || "Hauptanlage",
          artikel: item.artikel || `ART-${String(index + 1).padStart(3, '0')}`,
          komponente: item.komponente || "Unbekannte Komponente",
          beschreibung: item.beschreibung || "Keine Beschreibung verfügbar",
          bemerkung: item.bemerkung || "Keine Bemerkungen",
          stueck: typeof item.stueck === "number" ? item.stueck : 1
        }));
        
        // Generate analysis text
        analysisText = `Technische Zeichnung erfolgreich analysiert!\n\n`;
        analysisText += `Gefundene Komponenten: ${bom.length}\n\n`;
        analysisText += `Stückliste:\n`;
        bom.forEach((item, index) => {
          analysisText += `${index + 1}. ${item.komponente} (${item.stueck}x) - ${item.beschreibung}\n`;
        });
        
        console.log(`Combined German BOM parsed successfully. Found ${bom.length} components.`);
        
        // Update progress for finalizing
        global.analysisProgress[sessionId] = {
          stage: 'finalizing',
          progress: 95,
          message: `Creating BOM... Found ${bom.length} components`,
          timestamp: Date.now()
        };
      } else {
        console.warn("No components found in combined analysis");
        bom = [{ 
          anlage: "Fehler", 
          artikel: "ERR-001", 
          komponente: "Analysefehler", 
          beschreibung: "Keine Komponenten in der kombinierten Analyse gefunden.", 
          bemerkung: "Fehler bei der Analyse", 
          stueck: 1 
        }];
        analysisText = "Fehler bei der Analyse der technischen Zeichnung.";
      }
    } catch (parseError) {
      console.error("Failed to process combined BOM:", parseError);
      bom = [{ 
        anlage: "Fehler", 
        artikel: "ERR-001", 
        komponente: "Parse-Fehler", 
        beschreibung: "Konnte kombinierte AI-Antworten nicht verarbeiten.", 
        bemerkung: "Fehler beim Parsen", 
        stueck: 1 
      }];
      analysisText = "Fehler beim Parsen der kombinierten AI-Antworten.";
    }

    // Final progress update
    global.analysisProgress[sessionId] = {
      stage: 'completed',
      progress: 100,
      message: `Analysis complete! Found ${bom.length} components`,
      timestamp: Date.now()
    };

    res.json({ 
      response: analysisText,
      bom: bom 
    });
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

    if (!openai) {
      return res.status(503).json({ 
        error: 'AI service unavailable - OpenAI API key not configured' 
      });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are an expert in technical drawings and documents. Help users understand technical components and answer their questions about specifications, systems, and technical details.'
      },
      ...context,
      { role: 'user', content: message }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages,
      max_tokens: 1500,
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
