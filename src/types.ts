export interface FileData {
  data: string;
  type: string;
  name: string;
}

export interface BomMatchCandidate {
  code: string;
  description: string;
  score: number;
}

export interface BomItem {
  Anlage: string;
  'Artikel / Komponente': string;
  Beschreibung: string;
  Bemerkung: string;
  Stück: number;
  Größe: string | null;
  Signal: string | null;
  Rating: string | null;
  Material: string | null;
  Norm: string;
  'Match Code': string | null;
  'Match Score': number | null;
  'Match Kandidaten': BomMatchCandidate[];
  'Eink. Preis / Stk.': number | null;
  'Summe Zessionspreis': number | null;
  'Verk. Preis / Stk.': number | null;
  'Summe Verk. Preis': number | null;
}

export interface Relationship {
  source_component?: string;
  target_component?: string;
  relationship_type?: string;
  parent?: string;
  child?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  file?: FileData;
  bom?: BomItem[];
  relationships?: Relationship[];
  modelUsed?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface CompanyDatabaseStatus {
  uploaded: boolean;
  count: number;
  filename?: string;
}
