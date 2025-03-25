export interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}