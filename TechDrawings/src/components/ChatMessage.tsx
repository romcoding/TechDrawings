import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, FileText } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-500' : 'bg-gray-600'}`}>
        {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
      </div>
      <div className={`flex-1 px-4 py-2 rounded-lg ${isUser ? 'bg-blue-100' : 'bg-gray-100'}`}>
        {message.file && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-white rounded border border-gray-200">
            <FileText className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600">{message.file.name}</span>
          </div>
        )}
        {message.image && (
          <img src={message.image} alt="Technical Drawing" className="max-w-sm rounded-lg mb-2" />
        )}
        <ReactMarkdown className="prose max-w-none">
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
};