import React from 'react';
import { Message } from '../types';
import { User, Brain, FileText, Image, File } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const hasFile = message.file;

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return <Image className="w-4 h-4" />;
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4" />;
    if (fileType.includes('word') || fileType.includes('document')) return <File className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
      
      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div className={`
          rounded-2xl px-4 py-3 shadow-sm
          ${isUser 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
            : 'bg-white border border-gray-200 text-gray-900'
          }
        `}>
          {hasFile && (
            <div className={`
              mb-3 p-3 rounded-lg border
              ${isUser 
                ? 'bg-white/20 border-white/30 text-white' 
                : 'bg-gray-50 border-gray-200 text-gray-700'
              }
            `}>
              <div className="flex items-center gap-2 mb-2">
                {getFileIcon(hasFile.type)}
                <span className="font-medium text-sm">{hasFile.name}</span>
              </div>
              <div className="text-xs opacity-80">
                Type: {hasFile.type} • Size: {formatFileSize(hasFile.data.length * 0.75)}
              </div>
            </div>
          )}
          
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
        </div>
        
        <div className={`
          mt-2 text-xs opacity-70
          ${isUser ? 'text-right' : 'text-left'}
        `}>
          {isUser ? 'You' : 'GPT-5 AI'} • {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      )}
    </div>
  );
};