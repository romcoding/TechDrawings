import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

import { HVAC_STANDARDS, componentsSystemPromptFragment } from './hvacCatalog.js';
import {
  parseCsvToEntries,
  loadDefaultDatabase,
  setSessionDatabase,
  clearSessionDatabase,
  getSessionDatabase,
  getEffectiveDatabase
} from './companyDatabase.js';
import { enrichComponentsWithMatches } from './matchingService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Model selection
// ---------------------------------------------------------------------------
// We default to the newest OpenAI chat completion models that expose vision
// capabilities (GPT-5.4 and siblings).  The caller can override the candidate
// list via OPENAI_MODEL_CANDIDATES.  The first candidate that returns usable
// content is used; on failure we transparently fall back to the next one.
const DEFAULT_MODEL_CANDIDATES = [
  'gpt-5.4-vision',
  'gpt-5.4',
  'gpt-5.3',
  'gpt-5',
  'gpt-4.1',
  'gpt-4o'
];
const MODEL_CANDIDATES = process.env.OPENAI_MODEL_CANDIDATES
  ? process.env.OPENAI_MODEL_CANDIDATES.split(',').map((m) => m.trim()).filter(Boolean)
  : DEFAULT_MODEL_CANDIDATES;

// Load the default reference database (List of Items + canonical HVAC catalog).
loadDefaultDatabase(path.resolve(__dirname, '..', 'List of Items.csv'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const parseNumeric = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const normalized = value
    .replace(/CHF|EUR|€|\$/gi, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractJsonFromText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;
  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  const slice = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(slice);
  } catch (_) {
    try {
      return JSON.parse(slice.replace(/\\n/g, ' ').replace(/\\t/g, ' '));
    } catch (_inner) {
      return null;
    }
  }
};

const runChatCompletionWithFallback = async ({ messages, maxTokens = 4000, responseFormat }) => {
  let lastError = null;

  for (const model of MODEL_CANDIDATES) {
    try {
      const payload = { model, messages };

      if (/^gpt-5/i.test(model)) {
        payload.max_completion_tokens = maxTokens;
        payload.reasoning_effort = 'medium';
        payload.verbosity = 'medium';
      } else {
        payload.max_tokens = maxTokens;
      }

      if (responseFormat) {
        payload.response_format = responseFormat;
      }

      const response = await openai.chat.completions.create(payload);
      const content = response.choices?.[0]?.message?.content?.trim();
      if (content) {
        return { response, modelUsed: model };
      }
      console.warn(`Model ${model} returned empty content, trying next fallback...`);
    } catch (error) {
      lastError = error;
      console.warn(`Model ${model} failed: ${error?.message || error}`);
    }
  }

  throw lastError || new Error('No model produced a valid response');
};

async function extractPdfText(pdfBuffer) {
  const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  let fullText = '';
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item) => item.str).join(' ') + '\n';
  }
  return fullText.trim();
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = express();

app.use(
  cors({
    origin: [
      'https://tech-drawings.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    optionsSuccessStatus: 200
  })
);

app.use(express.json({ limit: '25mb' }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'none'
    }
  })
);

let openai = null;
try {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not set - AI features will be disabled');
  } else {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('✅ OpenAI client initialized');
  }
} catch (error) {
  console.error('❌ OpenAI initialization failed:', error.message);
}

const requireAuth = (req, res, next) => {
  if (req.session && req.session.loggedIn) return next();
  return res.status(401).json({ error: 'Authentication required' });
};

// ---------------------------------------------------------------------------
// Health / ping / auth
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    model: MODEL_CANDIDATES[0],
    model_candidates: MODEL_CANDIDATES,
    standards: HVAC_STANDARDS.map((s) => s.code),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'awake', timestamp: new Date().toISOString() });
});

app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    const validUsername = process.env.APP_USERNAME || 'admin';
    const validPassword = process.env.APP_PASSWORD || 'admin';
    if (username === validUsername && password === validPassword) {
      req.session.loggedIn = true;
      req.session.username = username;
      res.json({ success: true, message: 'Login successful', username });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  const sessionId = req.sessionID;
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
    clearSessionDatabase(sessionId);
    res.json({ success: true, message: 'Logout successful' });
  });
});

app.get('/api/auth-status', (req, res) => {
  const authenticated = Boolean(req.session && req.session.loggedIn);
  const username = (req.session && req.session.username) || null;
  res.json({ authenticated, username });
});

app.get('/api/progress', requireAuth, (req, res) => {
  const sessionId = req.sessionID || 'default';
  const progress = (global.analysisProgress && global.analysisProgress[sessionId]) || {
    stage: 'idle',
    progress: 0,
    message: 'No analysis in progress',
    timestamp: Date.now()
  };
  res.json(progress);
});

// ---------------------------------------------------------------------------
// Company database endpoints
// ---------------------------------------------------------------------------
app.post('/api/company-database', requireAuth, (req, res) => {
  try {
    const { csv, filename } = req.body || {};
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'csv field (string) required' });
    }
    const entries = parseCsvToEntries(csv);
    if (entries.length === 0) {
      return res.status(400).json({
        error: 'Could not parse any component entries from the provided CSV.',
        hint: 'Erwartet werden Spalten wie "Code/Artikel" und "Beschreibung" mit , ; oder Tab als Trennzeichen.'
      });
    }

    setSessionDatabase(req.sessionID, entries, { filename: filename || 'upload.csv' });
    res.json({
      success: true,
      count: entries.length,
      filename: filename || 'upload.csv',
      preview: entries.slice(0, 5).map((entry) => ({
        code: entry.code,
        description: entry.description
      }))
    });
  } catch (error) {
    console.error('Company DB upload error:', error);
    res.status(500).json({ error: 'Failed to parse company database', details: error.message });
  }
});

app.get('/api/company-database', requireAuth, (req, res) => {
  const session = getSessionDatabase(req.sessionID);
  if (!session) {
    return res.json({ uploaded: false, count: 0 });
  }
  res.json({
    uploaded: true,
    count: session.entries.length,
    meta: session.meta,
    preview: session.entries.slice(0, 10).map((entry) => ({
      code: entry.code,
      description: entry.description
    }))
  });
});

app.delete('/api/company-database', requireAuth, (req, res) => {
  clearSessionDatabase(req.sessionID);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Analysis endpoint
// ---------------------------------------------------------------------------
const ANALYSIS_SYSTEM_PROMPT = () => `Du bist ein Fachingenieur für HLK, Gebäudeautomation und Elektrotechnik. Deine Aufgabe ist es, technische Zeichnungen (Prinzip-/Funktionsschemata, HLK-Pläne, Elektro-Pläne, Anlagenschemen) präzise zu analysieren und eine Stückliste (BOM) zu erzeugen.

${componentsSystemPromptFragment()}

ANWEISUNGEN:
1. Identifiziere JEDE einzelne HLK-/GA-Komponente auf der Zeichnung (Ventile, Pumpen, Fühler, Aktoren, Wärmeerzeuger, Wärmetauscher, Ventilatoren, Filter, Klappen, Zähler, Automationsstationen usw.).
2. Extrahiere zusätzlich sämtliche in Legenden oder Bauteillisten aufgeführten Komponenten — auch solche, die nicht im Schema gezeichnet sind.
3. Für jede Komponente liefere die folgenden Felder (fehlende Angaben als null):
   - anlage (Anlagen-/Systembezeichnung, z. B. "Heizgruppe 1", "Lüftung L1")
   - artikel (Artikel- oder Kennzeichen, z. B. "H.V.01", "5WG1510-1AB03")
   - komponente (kanonischer Komponentenname gemäß obiger Liste, z. B. "Mischventil 3-Wege")
   - beschreibung (ausführliche technische Beschreibung)
   - bemerkung (zusätzliche Hinweise, z. B. Einbauort, Regelfunktion)
   - stueck (Anzahl als Zahl)
   - groesse (Nennweite, z. B. "DN25")
   - signal (Signalbereich, z. B. "0…10 V", "4…20 mA", "3-Punkt")
   - rating (kvs-Wert, Druckstufe o. Ä.)
   - material (Werkstoff)
   - norm (eine oder mehrere anwendbare Normen, z. B. "VDI 3814", "DIN EN 60534")
4. Liefere außerdem eine Liste der erkannten Verbindungen (relationships) zwischen Komponenten.
5. ERFINDE KEINE Komponenten. Wenn eine Information fehlt, gib null zurück.
6. Die Antwort MUSS strikt dem folgenden JSON-Schema entsprechen:

{
  "summary": "Kurzer deutscher Analysebericht",
  "components": [ { "anlage": "...", "artikel": "...", "komponente": "...", "beschreibung": "...", "bemerkung": "...", "stueck": 1, "groesse": null, "signal": null, "rating": null, "material": null, "norm": [] } ],
  "relationships": [ { "source_component": "...", "target_component": "...", "relationship_type": "feeds|controls|monitors|regulates" } ]
}

Gib ausschließlich valides JSON (ohne Markdown-Fences, ohne erklärenden Text) zurück.`;

app.post('/api/analyze', requireAuth, async (req, res) => {
  const sessionId = req.sessionID || 'default';
  global.analysisProgress = global.analysisProgress || {};
  global.analysisProgress[sessionId] = {
    stage: 'starting',
    progress: 0,
    message: 'Starting analysis...',
    timestamp: Date.now()
  };

  try {
    const { file, message } = req.body || {};
    if (!file || !file.data) {
      return res.status(400).json({ error: 'No file data provided' });
    }
    if (!openai) {
      return res.status(503).json({
        error: 'AI service unavailable - OpenAI API key not configured'
      });
    }

    const fileType = file.type || 'unknown';
    const isPDF = fileType === 'application/pdf' || String(file.data).startsWith('data:application/pdf');

    let userContent;

    if (isPDF) {
      global.analysisProgress[sessionId] = {
        stage: 'extracting',
        progress: 15,
        message: 'Extracting PDF text...',
        timestamp: Date.now()
      };
      try {
        const base64Data = file.data.split(',')[1];
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        const pdfText = await extractPdfText(pdfBuffer);
        userContent = [
          {
            type: 'text',
            text: `${message || 'Bitte analysiere dieses PDF und erzeuge eine vollständige HLK-Stückliste.'}

PDF INHALT:
${pdfText}`
          }
        ];
      } catch (pdfError) {
        console.warn('PDF text extraction failed, falling back to image mode:', pdfError.message);
        userContent = [
          { type: 'text', text: message || 'Bitte analysiere diese PDF-Zeichnung.' },
          { type: 'image_url', image_url: { url: file.data } }
        ];
      }
    } else {
      if (!String(file.data).startsWith('data:')) {
        return res.status(400).json({ error: 'Invalid image data format' });
      }
      userContent = [
        {
          type: 'text',
          text:
            message ||
            'Bitte analysiere diese technische Zeichnung und erzeuge eine vollständige HLK-Stückliste inkl. aller Komponenten, Normen und Verbindungen.'
        },
        { type: 'image_url', image_url: { url: file.data } }
      ];
    }

    global.analysisProgress[sessionId] = {
      stage: 'analyzing',
      progress: 40,
      message: 'Calling GPT Vision...',
      timestamp: Date.now()
    };

    const { response, modelUsed } = await runChatCompletionWithFallback({
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT() },
        { role: 'user', content: userContent }
      ],
      maxTokens: 4000,
      responseFormat: { type: 'json_object' }
    });

    const rawContent = response.choices?.[0]?.message?.content || '';
    let parsed = null;
    try {
      parsed = JSON.parse(rawContent);
    } catch (_) {
      parsed = extractJsonFromText(rawContent);
    }

    if (!parsed || typeof parsed !== 'object') {
      console.error('Could not parse model response as JSON. Raw:', rawContent.slice(0, 500));
      return res.status(502).json({
        error: 'Model response could not be parsed as JSON',
        modelUsed
      });
    }

    const rawComponents = Array.isArray(parsed.components) ? parsed.components : [];
    const relationships = Array.isArray(parsed.relationships) ? parsed.relationships : [];

    // ------------------------------------------------------------------
    // Enrich with company database + canonical HVAC catalog via fuzzy match
    // ------------------------------------------------------------------
    global.analysisProgress[sessionId] = {
      stage: 'matching',
      progress: 75,
      message: 'Matching components with company database...',
      timestamp: Date.now()
    };

    const { entries: databaseEntries, sessionCount, defaultCount } = getEffectiveDatabase(sessionId);
    const matched = enrichComponentsWithMatches(rawComponents, databaseEntries, {
      threshold: 0.4,
      topN: 3
    });

    const normalizedBom = matched.map((item, index) => {
      const stueck = typeof item.stueck === 'number' && Number.isFinite(item.stueck)
        ? item.stueck
        : parseNumeric(item.stueck) ?? 1;
      const einkPreis = parseNumeric(item.eink_preis_pro_stk);
      const verkPreis = parseNumeric(item.verk_preis_pro_stk);
      const matchCode = item.match?.code || null;

      return {
        anlage: item.anlage || 'Hauptanlage',
        artikel: item.artikel || matchCode || `ART-${String(index + 1).padStart(3, '0')}`,
        komponente: item.komponente || 'Unbekannte Komponente',
        beschreibung: item.beschreibung || 'Keine Beschreibung verfügbar',
        bemerkung: item.bemerkung || '',
        stueck,
        groesse: item.groesse || null,
        signal: item.signal || null,
        rating: item.rating || null,
        material: item.material || null,
        norm: Array.isArray(item.norm) ? item.norm : item.norm ? [item.norm] : [],
        match_code: matchCode,
        match_description: item.match?.description || null,
        match_score: item.match?.score ?? null,
        match_source: item.match?.source || null,
        match_candidates: item.match_candidates || [],
        eink_preis_pro_stk: einkPreis,
        verk_preis_pro_stk: verkPreis,
        summe_zessionspreis: einkPreis !== null ? Number((einkPreis * stueck).toFixed(2)) : null,
        summe_verk_preis: verkPreis !== null ? Number((verkPreis * stueck).toFixed(2)) : null
      };
    });

    // ------------------------------------------------------------------
    // Build human-readable summary
    // ------------------------------------------------------------------
    const summaryLines = [];
    summaryLines.push(`HLK / Gebäudeautomation Zeichnung analysiert (Modell: ${modelUsed}).`);
    summaryLines.push(`Erkannte Komponenten: ${normalizedBom.length}`);
    summaryLines.push(`Erkannte Verbindungen: ${relationships.length}`);
    summaryLines.push(
      `Referenzdatenbank: ${sessionCount} firmen-spezifische Einträge + ${defaultCount} Katalog-Einträge.`
    );
    if (parsed.summary) summaryLines.push('', parsed.summary);

    global.analysisProgress[sessionId] = {
      stage: 'completed',
      progress: 100,
      message: `Analysis complete! Found ${normalizedBom.length} components`,
      timestamp: Date.now()
    };

    res.json({
      response: summaryLines.join('\n'),
      bom: normalizedBom,
      relationships,
      model_used: modelUsed,
      database: {
        sessionEntries: sessionCount,
        defaultEntries: defaultCount
      }
    });
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    global.analysisProgress[sessionId] = {
      stage: 'error',
      progress: 0,
      message: error.message,
      timestamp: Date.now()
    };
    res.status(500).json({ error: 'Failed to analyze file', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// Chat endpoint (unchanged public contract)
// ---------------------------------------------------------------------------
app.post('/api/chat', requireAuth, async (req, res) => {
  try {
    const { message, context } = req.body || {};
    if (!message) return res.status(400).json({ error: 'No message provided' });
    if (!openai) {
      return res.status(503).json({
        error: 'AI service unavailable - OpenAI API key not configured'
      });
    }

    const messages = [
      {
        role: 'system',
        content:
          'Du bist ein Fachingenieur für HLK, Gebäudeautomation und Elektrotechnik. Antworte präzise und fachlich korrekt auf Deutsch, verweise wo sinnvoll auf VDI 3814, ISO 16484, ISO 14617, IEC 60617, DIN EN 81346.'
      },
      ...(Array.isArray(context) ? context : []),
      { role: 'user', content: message }
    ];

    const { response, modelUsed } = await runChatCompletionWithFallback({
      messages,
      maxTokens: 1500
    });

    res.json({
      response: response.choices[0].message.content,
      model_used: modelUsed
    });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Failed to process message', details: error.message });
  }
});

// ---------------------------------------------------------------------------
// Preflight / startup
// ---------------------------------------------------------------------------
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

console.log('🚀 Starting Technical Drawing Analyzer Backend...');
console.log(`  NODE_ENV:        ${process.env.NODE_ENV || 'development'}`);
console.log(`  PORT:            ${PORT}`);
console.log(`  APP_USERNAME:    ${process.env.APP_USERNAME || 'admin'}`);
console.log(`  SESSION_SECRET:  ${process.env.SESSION_SECRET ? 'set' : 'missing'}`);
console.log(`  OPENAI_API_KEY:  ${process.env.OPENAI_API_KEY ? 'set' : 'missing'}`);
console.log(`  MODEL_CANDIDATES: ${MODEL_CANDIDATES.join(', ')}`);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
