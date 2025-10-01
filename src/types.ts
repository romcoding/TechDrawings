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
}

export interface Relationship {
  source_component: string;
  target_component: string;
  relationship_type: string;
}