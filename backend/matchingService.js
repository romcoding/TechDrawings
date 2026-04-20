// Fuzzy / nearest-match logic between components extracted from a technical
// drawing and a company-specific component database.
//
// The goal is simple: for every component the Vision model finds on the
// drawing, try to attach the best-matching row from the company catalog so
// the BOM contains the real article code and pricing instead of a free-text
// LLM guess.

const ABBREVIATIONS = {
  ventil: ['valve', 'v'],
  ventilator: ['fan'],
  pumpe: ['pump', 'p'],
  fuhler: ['sensor'],
  fuehler: ['sensor'],
  temperatur: ['temperature', 'temp'],
  feuchte: ['humidity'],
  druck: ['pressure'],
  klappe: ['damper'],
  brandschutzklappe: ['bsk', 'fire damper'],
  heizkessel: ['boiler'],
  warmepumpe: ['heat pump'],
  warmezahler: ['heat meter'],
  wrg: ['wärmerückgewinnung', 'heat recovery'],
  vav: ['volumenstromregler', 'variable air volume'],
  rbg: ['raumbediengerät', 'room panel'],
  as: ['automationsstation'],
  ddc: ['direct digital controller']
};

const stripDiacritics = (value) =>
  value
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/Ä/g, 'ae')
    .replace(/Ö/g, 'oe')
    .replace(/Ü/g, 'ue');

export const normalizeText = (value) => {
  if (value === null || value === undefined) return '';
  const raw = typeof value === 'string' ? value : String(value);
  return stripDiacritics(raw)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Common German HVAC compound-word suffixes. When a token ends on one of
// these we also emit the suffix as a stand-alone token so "Heizungspumpe"
// and "Umwaelzpumpe" share the "pumpe" signal.
const COMPOUND_SUFFIXES = [
  'pumpe',
  'ventil',
  'fuehler',
  'klappe',
  'kessel',
  'zaehler',
  'messer',
  'hahn',
  'filter',
  'motor',
  'wechsler',
  'tauscher',
  'ventilator',
  'station',
  'regler',
  'schalter',
  'aktor',
  'antrieb',
  'sensor',
  'geraet',
  'kappe',
  'wandler',
  'leitung',
  'mischer'
];

export const tokenize = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  const tokens = new Set(normalized.split(' ').filter(Boolean));
  for (const token of Array.from(tokens)) {
    const expansions = ABBREVIATIONS[token];
    if (expansions) {
      for (const exp of expansions) {
        tokens.add(normalizeText(exp));
      }
    }
    for (const suffix of COMPOUND_SUFFIXES) {
      if (token.length > suffix.length + 2 && token.endsWith(suffix)) {
        tokens.add(suffix);
      }
    }
  }
  return Array.from(tokens);
};

// Levenshtein distance used for short-string similarity (article codes).
const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = new Array(rows);
  for (let i = 0; i < rows; i++) matrix[i] = new Array(cols).fill(0);
  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[rows - 1][cols - 1];
};

const stringSimilarity = (a, b) => {
  const na = normalizeText(a).replace(/\s+/g, '');
  const nb = normalizeText(b).replace(/\s+/g, '');
  if (!na || !nb) return 0;
  const distance = levenshtein(na, nb);
  return 1 - distance / Math.max(na.length, nb.length);
};

// Token similarity with abbreviation expansion.  We use the maximum of the
// Jaccard coefficient and the overlap coefficient so a short component label
// still scores high against a verbose company description.
const tokenSimilarity = (a, b) => {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  let intersection = 0;
  for (const token of ta) if (tb.has(token)) intersection++;
  if (intersection === 0) return 0;
  const union = ta.size + tb.size - intersection;
  const jaccard = union > 0 ? intersection / union : 0;
  const overlap = intersection / Math.min(ta.size, tb.size);
  return Math.max(jaccard, overlap * 0.9);
};

const sizeSimilarity = (a, b) => {
  const extract = (value) => {
    if (!value) return null;
    const match = String(value).toUpperCase().match(/DN\s*([0-9]{1,4})/);
    return match ? Number.parseInt(match[1], 10) : null;
  };
  const da = extract(a);
  const db = extract(b);
  if (da === null || db === null) return 0;
  if (da === db) return 1;
  const diff = Math.abs(da - db);
  if (diff <= 5) return 0.85;
  if (diff <= 15) return 0.6;
  if (diff <= 40) return 0.3;
  return 0;
};

// Primary scoring function.  Higher is better, capped at 1.
//
// The scoring is intentionally forgiving: we take the maximum of the code and
// description similarity as the base score (so a strong match on either
// signal drives the result) and then add small bonuses for concurrent code
// agreement and matching nominal size.
// Detect "position designation" codes that engineers put on schematics
// (e.g. "H.V.01", "L.V.02", "K-01") — these are location tags, NOT part
// numbers, so we must not use them to drive the fuzzy match.
const isPositionTag = (code) => {
  if (!code) return false;
  if (/^[A-Za-z]\.[A-Za-z]\.?\d+$/.test(code)) return true;
  if (/^[A-Za-z]\.[A-Za-z]\.[A-Za-z]\.?\d+$/.test(code)) return true;
  return false;
};

export const scoreCandidate = (component, candidate) => {
  const codeA = component.artikel || '';
  const codeB = candidate.code || '';

  let codeScore = 0;
  if (codeA && codeB) {
    const normA = normalizeText(codeA).replace(/\s+/g, '');
    const normB = normalizeText(codeB).replace(/\s+/g, '');
    if (normA && normB) {
      if (normA === normB) {
        codeScore = 1;
      } else if (!isPositionTag(codeA) && !isPositionTag(codeB) && normA.length >= 5 && normB.length >= 5) {
        codeScore = stringSimilarity(normA, normB);
      }
    }
  }

  const descA = [component.komponente, component.beschreibung].filter(Boolean).join(' ');
  const descB = [
    candidate.code,
    candidate.description,
    candidate.englisch,
    ...(candidate.synonyme || [])
  ]
    .filter(Boolean)
    .join(' ');

  const descTokenScore = tokenSimilarity(descA, descB);
  const descStringScore = stringSimilarity(descA, descB);
  const descScore = Math.max(descTokenScore, descStringScore * 0.8);

  const sizeScore = sizeSimilarity(component.groesse, candidate.description);

  const base = Math.max(descScore, codeScore * 0.9);
  const codeBonus = codeScore > 0.7 ? 0.1 : 0;
  const sizeBonus = sizeScore > 0.8 ? 0.05 : 0;
  const bothBonus = codeScore > 0.6 && descScore > 0.4 ? 0.05 : 0;

  return {
    score: Math.min(1, base + codeBonus + sizeBonus + bothBonus),
    codeScore,
    descScore,
    sizeScore
  };
};

export const findBestMatch = (component, database, options = {}) => {
  const { threshold = 0.55, topN = 3 } = options;
  if (!Array.isArray(database) || database.length === 0) return null;

  const scored = database
    .map((candidate) => ({ candidate, ...scoreCandidate(component, candidate) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < threshold) {
    return {
      best: null,
      topCandidates: scored.slice(0, topN).map(({ candidate, score }) => ({
        code: candidate.code,
        description: candidate.description,
        score: Number(score.toFixed(3))
      }))
    };
  }

  return {
    best: {
      code: best.candidate.code,
      description: best.candidate.description,
      source: best.candidate.source || 'company-db',
      score: Number(best.score.toFixed(3))
    },
    topCandidates: scored.slice(0, topN).map(({ candidate, score }) => ({
      code: candidate.code,
      description: candidate.description,
      score: Number(score.toFixed(3))
    }))
  };
};

export const enrichComponentsWithMatches = (components, database, options = {}) => {
  if (!Array.isArray(components)) return [];
  return components.map((component) => {
    const match = findBestMatch(component, database, options);
    if (!match) return { ...component, match: null };

    const enriched = { ...component, match: match.best };
    if (match.best) {
      enriched.artikel = component.artikel || match.best.code;
      enriched.beschreibung =
        component.beschreibung && component.beschreibung !== 'Keine Beschreibung verfügbar'
          ? component.beschreibung
          : match.best.description;
    }
    enriched.match_candidates = match.topCandidates;
    return enriched;
  });
};
