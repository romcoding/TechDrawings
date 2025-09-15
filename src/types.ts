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
}