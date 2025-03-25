import React, { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { FileUpload } from './components/FileUpload';
import { ChatState, Message } from './types';

const INITIAL_MESSAGE = `I am an AI assistant specialized in analyzing technical drawings. I can help identify components like valves, pipes, electrical systems, and other technical elements in your drawings. Upload a technical drawing and I'll analyze it for you.`;

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [
      { role: 'assistant', content: INITIAL_MESSAGE }
    ],
    isLoading: false
  });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = { role: 'user', content: input };
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      isLoading: true
    }));
    setInput('');

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          context: chatState.messages.map(({ role, content }) => ({ role, content }))
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const aiResponse: Message = {
        role: 'assistant',
        content: data.response
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, aiResponse],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error:', error);
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your message. Please try again.'
        }],
        isLoading: false
      }));
    }
    scrollToBottom();
  };

  const handleFileSelect = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;
      const newMessage: Message = {
        role: 'user',
        content: 'Please analyze this technical drawing.',
        image: base64Image
      };
      
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage],
        isLoading: true
      }));

      try {
        const response = await fetch(`${API_URL}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Image,
            message: 'Please analyze this technical drawing.'
          }),
        });

        if (!response.ok) throw new Error('Failed to analyze image');

        const data = await response.json();
        const aiResponse: Message = {
          role: 'assistant',
          content: data.response
        };

        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, aiResponse],
          isLoading: false
        }));
      } catch (error) {
        console.error('Error:', error);
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, {
            role: 'assistant',
            content: 'Sorry, I encountered an error while analyzing the image. Please try again.'
          }],
          isLoading: false
        }));
      }
      scrollToBottom();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Technical Drawing Analyzer</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatState.messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-4 space-y-4">
            <FileUpload onFileSelect={handleFileSelect} />
            
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about the drawing..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={chatState.isLoading}
              />
              <button
                type="submit"
                disabled={chatState.isLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;