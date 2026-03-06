export interface FileData {
  data: string;
  type: string;
  name: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  file?: FileData;
  bom?: BomItem[];
  relationships?: Relationship[];
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}

export interface BomItem {
  anlage: string;        // Plant/Facility
  artikel: string;       // Article/Item number
  komponente: string;    // Component name
  beschreibung: string;   // Description
  bemerkung: string;     // Remark/Note
  stueck: number;        // Count/Pieces
  groesse?: string | null;    // Nominal size/DN
  signal?: string | null;     // Signal range
  rating?: string | null;     // Flow coefficient/pressure class
  material?: string | null;   // Material
  eink_preis_pro_stk?: number | null; // Einkaufspreis pro Stück
  eink_preis_hinweis?: string | null; // Preis-Hinweis wenn kein exakter Wert
  summe_zessionspreis?: number | null; // Summe Einkaufspreis
  summe_zessionspreis_hinweis?: string | null; // Hinweis für geschätzte Summe
  verk_preis_pro_stk?: number | null; // Verkaufspreis pro Stück
  verk_preis_hinweis?: string | null; // Preis-Hinweis wenn kein exakter Wert
  summe_verk_preis?: number | null; // Summe Verkaufspreis
  summe_verk_preis_hinweis?: string | null; // Hinweis für geschätzte Summe
  suissetec_symbol?: string | null; // Gemapptes Suissetec-Symbol
  confidence?: 'high' | 'medium' | 'low' | null; // Mapping confidence
  confidence_reason?: string | null; // Grund für confidence
}

export interface Relationship {
  source_component: string;
  target_component: string;
  relationship_type: string;
}