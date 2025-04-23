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
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}