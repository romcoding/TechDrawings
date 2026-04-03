export interface FileData {
  data: string;
  type: string;
  name: string;
}

export interface BomItem {
  Anlage: string;
  'Artikel / Komponente': string;
  Beschreibung: string;
  Bemerkung: string;
  Stück: number;
  'Eink. Preis / Stk.': number | null;
  'Summe Zessionspreis': number | null;
  'Verk. Preis / Stk.': number | null;
  'Summe Verk. Preis': number | null;
}

export interface Relationship {
  parent: string;
  child: string;
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
