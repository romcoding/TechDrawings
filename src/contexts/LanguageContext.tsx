import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'de' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  de: {
    // App.tsx
    'app.title': 'Technische Zeichnungs-Analyzer',
    'app.subtitle': 'Powered by GPT-4o • Expert Engineering Analysis',
    'app.initialMessage': 'Ich bin ein KI-Assistent, spezialisiert auf die Analyse technischer Zeichnungen und Dokumente mit GPT-4o und Expertenwissen im Ingenieurwesen. Ich kann umfassende Analysen technischer Zeichnungen nach internationalen Standards (VDI 3814, ISO 16484, ISO 14617, IEC 60617, DIN EN 81346) durchführen.\n\n🔧 **Was ich analysieren kann:**\n• HLK-Systeme, Gebäudeautomation und industrielle Steuerungssysteme\n• Ventile, Pumpen, Sensoren, Aktoren und Steuerungsgeräte\n• Elektrische Systeme, Verkabelung und Instrumentierung\n• Rohrleitungssysteme, Fittings und mechanische Komponenten\n• Sicherheitssysteme und Notfallausrüstung\n\n📊 **Die Analyse umfasst:**\n• Detaillierte Stückliste (BOM) mit Mengen\n• Komponentenspezifikationen, Bewertungen und Materialien\n• Signaltypen und Kommunikationsprotokolle\n• Systemstandorte und technische Standards\n• Herunterladbarer CSV-Bericht für die Beschaffung\n\nLaden Sie eine technische Zeichnung hoch und ich werde eine professionelle Ingenieursanalyse durchführen!',
    'login.title': 'Technische Zeichnungs-Analyzer',
    'login.subtitle': 'Powered by GPT-4o • Expert Engineering Analysis',
    'login.username': 'Benutzername',
    'login.password': 'Passwort',
    'login.usernamePlaceholder': 'Benutzername eingeben',
    'login.passwordPlaceholder': 'Passwort eingeben',
    'login.signIn': 'Anmelden',
    'login.serverOnline': 'Server Online',
    'login.serverOffline': 'Server Offline',
    'login.checkingServer': 'Server wird überprüft...',
    'login.error': 'Anmeldung fehlgeschlagen',
    'login.connectionError': 'Verbindungsfehler. Bitte versuchen Sie es erneut.',
    'login.pleaseLogin': 'Bitte melden Sie sich zuerst an, bevor Sie Dateien hochladen.',
    'login.serverOfflineMessage': 'Server scheint offline zu sein. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut. Falls das Problem weiterhin besteht, könnte der Server Probleme haben.',
    'main.refresh': 'Aktualisieren',
    'main.signOut': 'Abmelden',
    'main.askQuestion': 'Stellen Sie eine Frage zum Dokument...',
    'main.analyzing': 'Analysiere...',
    'main.uploadFile': 'Datei hochladen',
    'main.dragDrop': 'Ziehen Sie eine Datei hierher oder klicken Sie zum Auswählen',
    'main.supportedFormats': 'Unterstützte Formate: PNG, JPG, PDF, DOC, DOCX',
    'main.maxSize': 'Maximale Dateigröße: 20MB',
    'main.error': 'Fehler beim Analysieren der Datei',
    'main.errorMessage': 'Entschuldigung, ich bin auf einen Fehler beim Analysieren der Datei gestoßen. Bitte stellen Sie sicher, dass der Server läuft und versuchen Sie es erneut.',
    'main.chatError': 'Entschuldigung, ich bin auf einen Fehler beim Verarbeiten Ihrer Nachricht gestoßen. Bitte stellen Sie sicher, dass der Server läuft und versuchen Sie es erneut.',
    'main.loading': 'Lädt...',
    'main.uploading': 'Lädt hoch...',
    'main.analyzingFile': 'Analysiere Datei...',
    'main.fileAnalyzed': 'Datei analysiert',
    'main.componentsFound': 'Komponenten gefunden',
    'main.bomGenerated': 'Stückliste generiert',
    'main.downloadBom': 'Stückliste herunterladen',
    'main.downloadCsv': 'Als CSV herunterladen',
    'main.noBom': 'Keine Stückliste für dieses Dokument gefunden.',
    'main.bomTitle': 'Stückliste (BOM)',
    'main.bomColumns.anlage': 'Anlage',
    'main.bomColumns.artikel': 'Artikel',
    'main.bomColumns.komponente': 'Komponente',
    'main.bomColumns.beschreibung': 'Beschreibung',
    'main.bomColumns.bemerkung': 'Bemerkung',
    'main.bomColumns.stueck': 'Stück',
    'main.bomDownload': 'Stückliste als CSV herunterladen',
    'main.language': 'Sprache',
    'main.languageGerman': 'Deutsch',
    'main.languageEnglish': 'English',
  },
  en: {
    // App.tsx
    'app.title': 'Technical Drawing Analyzer',
    'app.subtitle': 'Powered by GPT-4o • Expert Engineering Analysis',
    'app.initialMessage': 'I am an AI assistant specialized in analyzing technical drawings and documents using GPT-4o with expert engineering knowledge. I can provide comprehensive analysis of technical drawings according to international standards (VDI 3814, ISO 16484, ISO 14617, IEC 60617, DIN EN 81346).\n\n🔧 **What I can analyze:**\n• HVAC systems, building automation, and industrial control systems\n• Valves, pumps, sensors, actuators, and control equipment\n• Electrical systems, wiring, and instrumentation\n• Piping systems, fittings, and mechanical components\n• Safety systems and emergency equipment\n\n📊 **Analysis includes:**\n• Detailed Bill of Materials (BOM) with quantities\n• Component specifications, ratings, and materials\n• Signal types and communication protocols\n• System locations and technical standards\n• Downloadable CSV report for procurement\n\nUpload a technical drawing and I\'ll provide a professional engineering analysis!',
    'login.title': 'Technical Drawing Analyzer',
    'login.subtitle': 'Powered by GPT-4o • Expert Engineering Analysis',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.usernamePlaceholder': 'Enter username',
    'login.passwordPlaceholder': 'Enter password',
    'login.signIn': 'Sign In',
    'login.serverOnline': 'Server Online',
    'login.serverOffline': 'Server Offline',
    'login.checkingServer': 'Checking Server...',
    'login.error': 'Login failed',
    'login.connectionError': 'Connection error. Please try again.',
    'login.pleaseLogin': 'Please log in first before uploading files.',
    'login.serverOfflineMessage': 'Server appears to be offline. Please check your connection and try again. If the problem persists, the server may be experiencing issues.',
    'main.refresh': 'Refresh',
    'main.signOut': 'Sign Out',
    'main.askQuestion': 'Ask a question about the document...',
    'main.analyzing': 'Analyzing...',
    'main.uploadFile': 'Upload File',
    'main.dragDrop': 'Drag a file here or click to select',
    'main.supportedFormats': 'Supported formats: PNG, JPG, PDF, DOC, DOCX',
    'main.maxSize': 'Maximum file size: 20MB',
    'main.error': 'Error analyzing file',
    'main.errorMessage': 'Sorry, I encountered an error while analyzing the file. Please ensure the server is running and try again.',
    'main.chatError': 'Sorry, I encountered an error while processing your message. Please ensure the server is running and try again.',
    'main.loading': 'Loading...',
    'main.uploading': 'Uploading...',
    'main.analyzingFile': 'Analyzing file...',
    'main.fileAnalyzed': 'File analyzed',
    'main.componentsFound': 'Components found',
    'main.bomGenerated': 'BOM generated',
    'main.downloadBom': 'Download BOM',
    'main.downloadCsv': 'Download as CSV',
    'main.noBom': 'No Bill of Materials found for this document.',
    'main.bomTitle': 'Bill of Materials (BOM)',
    'main.bomColumns.anlage': 'Plant',
    'main.bomColumns.artikel': 'Article',
    'main.bomColumns.komponente': 'Component',
    'main.bomColumns.beschreibung': 'Description',
    'main.bomColumns.bemerkung': 'Remark',
    'main.bomColumns.stueck': 'Count',
    'main.bomDownload': 'Download BOM as CSV',
    'main.language': 'Language',
    'main.languageGerman': 'Deutsch',
    'main.languageEnglish': 'English',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('de'); // Default to German

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
