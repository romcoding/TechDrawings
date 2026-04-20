// Lightweight store for company-specific component databases.
//
// Every session can upload its own CSV file (e.g. the internal parts list
// of a planning company) and the rows are kept in memory so the matcher can
// look them up immediately.  In addition we maintain a default database
// loaded from "List of Items.csv" so the tool is useful even without an
// explicit upload.

import fs from 'fs';
import path from 'path';
import { HVAC_CATALOG_AS_DB_ENTRIES } from './hvacCatalog.js';

const sessionDatabases = new Map();
let defaultDatabase = [];

const FIELD_ALIASES = {
  code: [
    'code',
    'artikel',
    'artikelnummer',
    'artikel nr',
    'artikelnr',
    'bezeichnung',
    'bezeichnung / feldgeräte',
    'bezeichnung / feldgerate',
    'kennung',
    'id',
    'material',
    'teilenummer',
    'partnumber',
    'part number',
    'sku'
  ],
  description: [
    'description',
    'beschreibung',
    'bezeichnung',
    'komponente',
    'komponenten',
    'bezeichnung / feldgeräte',
    'bezeichnung / feldgerate'
  ],
  size: ['groesse', 'größe', 'size', 'dn', 'nennweite'],
  signal: ['signal', 'signalbereich'],
  rating: ['kvs', 'kv', 'rating', 'druckstufe', 'pn'],
  material: ['material', 'werkstoff'],
  einkaufspreis: [
    'eink preis',
    'einkaufspreis',
    'eink. preis',
    'eink preis stk',
    'eink preis / stk',
    'eink. preis / stk.',
    'kaufpreis',
    'purchase price'
  ],
  verkaufspreis: [
    'verk preis',
    'verkaufspreis',
    'verk. preis',
    'verk preis stk',
    'verk. preis / stk.',
    'verkauf',
    'sales price'
  ],
  manufacturer: ['hersteller', 'fabrikat', 'manufacturer', 'brand']
};

const normHeader = (value) =>
  String(value || '')
    .replace(/\ufeff/g, '')
    .toLowerCase()
    .replace(/[_\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value)
    .replace(/CHF|EUR|€|\$/gi, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const detectDelimiter = (line) => {
  const candidates = [';', '\t', '|', ','];
  let best = ',';
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = line.split(candidate).length;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
};

const splitCsvLine = (line, delimiter) => {
  const result = [];
  let current = '';
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (ch === delimiter && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((cell) => cell.trim());
};

export const parseCsvToEntries = (csvContent) => {
  if (!csvContent || typeof csvContent !== 'string') return [];

  const cleaned = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\ufeff/, '');
  const lines = cleaned.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const rawHeaders = splitCsvLine(lines[0], delimiter);
  const headers = rawHeaders.map(normHeader);

  const columnIndex = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias);
      if (idx !== -1) {
        columnIndex[field] = idx;
        break;
      }
    }
  }

  if (columnIndex.code === undefined && columnIndex.description === undefined) {
    // Fall back to "first column = code, second column = description".
    columnIndex.code = 0;
    columnIndex.description = headers.length > 1 ? 1 : 0;
  }

  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter);
    if (!cells.length) continue;

    const code = columnIndex.code !== undefined ? cells[columnIndex.code] : '';
    const description = columnIndex.description !== undefined ? cells[columnIndex.description] : '';

    if (!code && !description) continue;

    const entry = {
      code: code || description,
      description: description || code,
      size: columnIndex.size !== undefined ? cells[columnIndex.size] || null : null,
      signal: columnIndex.signal !== undefined ? cells[columnIndex.signal] || null : null,
      rating: columnIndex.rating !== undefined ? cells[columnIndex.rating] || null : null,
      material: columnIndex.material !== undefined ? cells[columnIndex.material] || null : null,
      manufacturer:
        columnIndex.manufacturer !== undefined ? cells[columnIndex.manufacturer] || null : null,
      eink_preis_pro_stk:
        columnIndex.einkaufspreis !== undefined
          ? parseNumber(cells[columnIndex.einkaufspreis])
          : null,
      verk_preis_pro_stk:
        columnIndex.verkaufspreis !== undefined
          ? parseNumber(cells[columnIndex.verkaufspreis])
          : null,
      source: 'company-db'
    };

    // Auto-detect DN if not explicitly provided.
    if (!entry.size && entry.description) {
      const dn = entry.description.match(/DN\s*([0-9]+)/i);
      if (dn) entry.size = `DN${dn[1]}`;
    }

    entries.push(entry);
  }
  return entries;
};

export const loadDefaultDatabase = (listOfItemsPath) => {
  const candidates = [
    listOfItemsPath,
    path.resolve(process.cwd(), 'List of Items.csv'),
    path.resolve(process.cwd(), '..', 'List of Items.csv'),
    path.resolve(process.cwd(), 'backend', '..', 'List of Items.csv')
  ].filter(Boolean);

  let loaded = [];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const content = fs.readFileSync(candidate, 'utf8');
        loaded = parseCsvToEntries(content);
        if (loaded.length > 0) {
          console.log(`✅ Loaded ${loaded.length} rows from default DB: ${candidate}`);
          break;
        }
      }
    } catch (err) {
      console.warn(`⚠️  Failed to read default DB ${candidate}:`, err.message);
    }
  }

  defaultDatabase = [...loaded, ...HVAC_CATALOG_AS_DB_ENTRIES];
  console.log(
    `✅ Default reference database ready: ${defaultDatabase.length} entries ` +
      `(including ${HVAC_CATALOG_AS_DB_ENTRIES.length} canonical HVAC catalog items).`
  );
};

export const getDefaultDatabase = () => defaultDatabase;

export const setSessionDatabase = (sessionId, entries, meta = {}) => {
  if (!sessionId) return;
  sessionDatabases.set(sessionId, {
    entries: Array.isArray(entries) ? entries : [],
    meta: {
      uploadedAt: new Date().toISOString(),
      count: Array.isArray(entries) ? entries.length : 0,
      ...meta
    }
  });
};

export const clearSessionDatabase = (sessionId) => {
  if (sessionId) sessionDatabases.delete(sessionId);
};

export const getSessionDatabase = (sessionId) => {
  if (!sessionId) return null;
  return sessionDatabases.get(sessionId) || null;
};

export const getEffectiveDatabase = (sessionId) => {
  const session = getSessionDatabase(sessionId);
  if (session && session.entries.length > 0) {
    return {
      entries: [...session.entries, ...defaultDatabase],
      source: 'session+default',
      sessionCount: session.entries.length,
      defaultCount: defaultDatabase.length
    };
  }
  return {
    entries: defaultDatabase,
    source: 'default',
    sessionCount: 0,
    defaultCount: defaultDatabase.length
  };
};
