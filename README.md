# Technical Drawing Analyzer — HVAC Component Identification

A React + Node.js application that analyzes HVAC / building-automation technical
drawings with the **newest OpenAI GPT vision model available** (defaults to
`gpt-5.4-vision` with automatic fallback to `gpt-5.4`, `gpt-5.3`, `gpt-5`,
`gpt-4.1`, `gpt-4o`). The tool extracts every technical component from a
drawing, maps it to the nearest entry in a built-in HVAC reference catalog
**and** in the user's own company component database, and returns a complete
Bill-of-Materials (BOM) ready for procurement.

## 🔄 End-to-end workflow

1. **Upload a drawing** (PNG / JPG / PDF / DOCX) via the web UI.
2. **GPT Vision** analyzes the drawing using a strict HVAC-focused prompt based
   on VDI 3814, ISO 16484, ISO 14617, IEC 60617, DIN EN 81346, SIA 108/382/384,
   DIN EN 12792 and DIN EN 1861.
3. The backend **matches** every detected component against:
   - a built-in canonical HVAC catalog (43+ component classes with norms), and
   - the company-specific component database (`List of Items.csv` by default,
     or any CSV uploaded by the user through the UI).
4. A fuzzy nearest-match algorithm (Levenshtein + token-overlap with German
   compound-word and abbreviation expansion) selects the best candidate and
   shows the top 3 alternatives plus a confidence score for each row.
5. The BOM is rendered as a sortable German Excel-style table and can be
   exported as CSV.

## 🏗️ Architecture

This repository contains the **frontend only**. The application uses a microservices architecture:

- **Frontend (This Repo)**: React + TypeScript + Vite, deployed on Vercel
- **Backend**: Node.js + Express API, deployed on Render
- **AI Service**: OpenAI GPT-5.4 Vision API (oder neuer)

## 🌟 What Makes This Special

- **Modern Frontend**: React 18 + TypeScript + Vite for optimal performance
- **GPT-5.4 Vision Integration**: Nutzt das aktuelle Vision-Modell via `/api/analyze` für technische Zeichnungsanalyse
- **Beautiful UI/UX**: Responsive design with drag-and-drop file upload
- **Production Ready**: Optimized for Vercel deployment
- **Secure**: Environment-based configuration and secure API communication

## ✨ Features

- **GPT-5 Powered Analysis**: Utilizes the latest GPT-5 Vision API for superior technical drawing interpretation
- **Multiple File Formats**: Supports PNG, JPG, PDF, DOC, and DOCX files
- **Comprehensive BOM Generation**: Extracts detailed component information including:
  - Component names and identifiers
  - Quantities and specifications
  - Materials and ratings
  - Reference codes and locations
  - Technical specifications
- **Modern React Frontend**: Beautiful, responsive UI with drag-and-drop file upload
- **Secure API Backend**: Flask-based REST API with authentication
- **Real-time Analysis**: Instant processing and results display
- **Export Capabilities**: Download analysis results as CSV files
- **Single Server Deployment**: Frontend and backend served from one application

## 🚀 Technology Stack

### Frontend (This Repository)
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for modern, responsive design
- **Lucide React** for beautiful icons
- **React Dropzone** for file uploads

### Backend (Separate Repository)
- **Node.js** with Express
- **OpenAI GPT-5.4 Vision API (oder neuer)** für Dokumentanalyse mit strukturierten JSON-Antworten
- **Express-Session** for authentication
- **CORS** for secure cross-origin requests

### Deployment
- **Frontend**: Vercel (static hosting)
- **Backend**: Render (Node.js hosting)
- **Environment Variables**: Secure configuration management

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see backend repository)

## 🛠️ Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd TechDrawings-4
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp env.example .env.local
# Edit .env.local with your backend API URL
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Access the Application
- Open your browser and go to: **http://localhost:5173**
- Login with your backend credentials
- Start analyzing technical drawings!

## 🌐 Production Deployment

This application is designed to be deployed as a **complete web application** with several deployment options:

- **Single Server**: Nginx + Flask with integrated frontend
- **Docker**: Containerized deployment
- **Cloud Platforms**: AWS, GCP, Azure deployment guides

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 📱 Usage

### 1. Authentication
- Default credentials: `admin` / `admin`
- Configure custom credentials in the `.env` file

### 2. File Upload
- Drag and drop technical drawings, PDFs, or Word documents
- Supported formats: PNG, JPG, PDF, DOC, DOCX
- Maximum file size: 20MB

### 3. Analysis
- The system automatically analyzes uploaded files using GPT-5
- Results include comprehensive component identification
- Detailed BOM with technical specifications

### 4. Export
- Download analysis results as CSV files
- Results include all component details and specifications

## 🔧 API Endpoints

### Authentication
- `POST /api/login` - User authentication
- `POST /api/logout` - User logout

### File Analysis
- `POST /api/upload` - File upload and analysis
- `POST /api/analyze` - Analyze files from frontend
- `GET /api/download` - Download CSV results

### Chat
- `POST /api/chat` - Chat with the AI assistant

### Health Check
- `GET /health` - Server health status

### Web Application
- `GET /` - Serves the React frontend
- `GET /<path>` - Serves static files and handles routing

## 🎯 Supported Technical Standards

The analyzer follows international engineering standards:
- **VDI 3814** - Building automation and control systems
- **ISO 16484** - Building automation and control systems
- **ISO 14617** - Graphical symbols for diagrams
- **IEC 60617** - Graphical symbols for diagrams
- **DIN EN 81346** - Reference designation system

## 🔍 Component Detection

The system identifies and categorizes:
- **Control Valves**: Ball, Gate, Check, Control, Safety, Solenoid
- **Pumps & Motors**: Various types and specifications
- **Sensors & Instruments**: Measurement and control devices
- **Control Systems**: PLCs, DCS, SCADA components
- **Pipes & Fittings**: Conduits, supports, and connections
- **Electrical Components**: Wiring, switches, and power systems
- **HVAC Equipment**: Heating, ventilation, and air conditioning
- **Safety Systems**: Emergency and protection equipment


## 🏢 Company component database

Each company can plug in its own component catalog without touching the code:

1. Log into the web UI.
2. Open the **„Firmen-Komponentendatenbank“** panel above the drawing upload.
3. Drag & drop a CSV file — the server auto-detects the delimiter (`,`, `;`,
   tab or `|`) and maps the following column aliases (case-insensitive):

   | Field           | Accepted column headers                                                        |
   |-----------------|--------------------------------------------------------------------------------|
   | code / article  | `code`, `artikel`, `artikelnummer`, `bezeichnung`, `material`, `teilenummer`   |
   | description     | `description`, `beschreibung`, `komponente`                                    |
   | nominal size    | `groesse`, `größe`, `size`, `dn`, `nennweite`                                  |
   | signal range    | `signal`, `signalbereich`                                                      |
   | kvs / rating    | `kvs`, `kv`, `rating`, `druckstufe`, `pn`                                      |
   | material        | `material`, `werkstoff`                                                        |
   | manufacturer    | `hersteller`, `fabrikat`, `manufacturer`, `brand`                              |
   | purchase price  | `eink. preis`, `eink preis / stk`, `einkaufspreis`, `purchase price`           |
   | sales price     | `verk. preis`, `verk preis / stk`, `verkaufspreis`, `sales price`              |

4. The uploaded database is stored per session. The BOM returned for every
   subsequent drawing will include for every row:
   - `Match Code` — the nearest matching entry from the company DB or HVAC
     catalog,
   - `Match Score` — confidence (0…1),
   - `Match Kandidaten` — top-3 alternatives (visible in the exported CSV).

## 🧾 Deutsches BOM-Format & Export

Die UI rendert Analyseergebnisse als deutsche Excel-ähnliche Stückliste mit folgenden Spalten:

- Anlage
- Artikel / Komponente
- Beschreibung
- Bemerkung
- Stück
- Größe / Signal / Material / Norm
- Match Code / Match Score / Match Kandidaten
- Eink. Preis / Stk.
- Summe Zessionspreis
- Verk. Preis / Stk.
- Summe Verk. Preis

Zusätzlich steht ein Button **„CSV/Excel herunterladen“** bereit, der die aktuelle Stückliste inkl. aller Match-Informationen als CSV exportiert.

### Beispiel (BOM-Ansicht)

![Beispiel BOM Tabelle](docs/images/bom-beispiel.svg)

## 🔌 Backend-API

Der Backend-Dienst (`backend/server.js`) stellt folgende relevante Endpunkte
bereit (alle authentifiziert, `credentials: include`):

| Methode | Pfad                       | Zweck                                                          |
|---------|----------------------------|----------------------------------------------------------------|
| POST    | `/api/login`               | Login                                                          |
| POST    | `/api/logout`              | Logout (räumt session-spezifische Firmen-DB ab)                |
| POST    | `/api/analyze`             | Zeichnung analysieren, BOM inkl. Matches zurückgeben           |
| GET     | `/api/progress`            | Fortschritt der laufenden Analyse                              |
| POST    | `/api/company-database`    | Firmen-CSV hochladen (`{ csv, filename }`)                     |
| GET     | `/api/company-database`    | Status der aktuell geladenen Firmendatenbank                   |
| DELETE  | `/api/company-database`    | Firmendatenbank der Session entfernen                          |
| GET     | `/health`                  | Health-Check inkl. eingesetzter Modellkandidaten               |

Antwortschema von `/api/analyze`:

```json
{
  "response": "HLK-Zeichnung analysiert (Modell: gpt-5.4-vision). Erkannte Komponenten: 23 …",
  "model_used": "gpt-5.4-vision",
  "bom": [
    {
      "anlage": "Heizgruppe 1",
      "artikel": "H.V.01",
      "komponente": "Mischventil 3-Wege",
      "beschreibung": "3-Wege Mischer DN25 kvs 6.3",
      "bemerkung": "Stellantrieb 0…10 V",
      "stueck": 2,
      "groesse": "DN25",
      "signal": "0…10 V",
      "rating": "kvs=6.3",
      "material": "Messing",
      "norm": ["DIN EN 60534", "VDI 3814"],
      "match_code": "V-01",
      "match_description": "Mischventil 3-Wege DN25 kvs 6.3",
      "match_score": 0.87,
      "match_candidates": [
        { "code": "V-01", "description": "Mischventil 3-Wege DN25 kvs 6.3", "score": 0.87 }
      ],
      "eink_preis_pro_stk": 189.50,
      "summe_zessionspreis": 379.00,
      "verk_preis_pro_stk": null,
      "summe_verk_preis": null
    }
  ],
  "relationships": [
    { "source_component": "H.P.01", "target_component": "H.V.01", "relationship_type": "feeds" }
  ]
}
```

### Modellkandidaten

Die Backend-Reihenfolge der ausprobierten GPT-Modelle steuert die Umgebungs-
variable `OPENAI_MODEL_CANDIDATES` (kommaseparierte Liste). Default ist

```
gpt-5.4-vision, gpt-5.4, gpt-5.3, gpt-5, gpt-4.1, gpt-4o
```

Das Backend versucht die Modelle der Reihe nach und nutzt automatisch das erste
Modell, das eine gültige Antwort liefert. So steht das Tool immer auf dem
neuesten verfügbaren Chat-GPT-Modell, ohne Code-Änderung.

## 🚨 Troubleshooting

### Common Issues

1. **PDF Processing Errors**:
   - Ensure Poppler is properly installed
   - Check file permissions and accessibility

2. **OpenAI API Errors**:
   - Verify API key is valid and has GPT-5 access
   - Check API quota and billing status

3. **File Upload Issues**:
   - Ensure file size is under 20MB
   - Check file format compatibility

4. **Authentication Problems**:
   - Verify environment variables are set correctly
   - Check session configuration

5. **Frontend Not Loading**:
   - Ensure `npm run build` completed successfully
   - Check if `dist` folder exists
   - Verify Flask is serving static files correctly

### Debug Mode
Enable debug logging by setting:
```python
app.run(debug=True)
```

## 🌍 Web Application Features

### Integrated Frontend
- **Single Server**: No need for separate frontend/backend servers
- **Automatic Routing**: Flask handles both API and frontend routes
- **Production Build**: Optimized React build served by Flask
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Security Features
- **Session Management**: Secure user authentication
- **File Validation**: Secure file upload handling
- **CORS Configuration**: Proper cross-origin request handling
- **Environment Variables**: Secure configuration management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for providing the GPT-5 Vision API
- The open-source community for various libraries and tools
- Engineering standards organizations for technical specifications

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the [DEPLOYMENT.md](DEPLOYMENT.md) guide
- Check the API documentation

---

**🚀 Ready to deploy as a complete web application!**

**Built with ❤️ for the engineering community**
