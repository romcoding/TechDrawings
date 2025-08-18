import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Download, Brain, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { FileUpload } from './components/FileUpload';
import { ChatState, Message } from './types';

const INITIAL_MESSAGE = `I am an AI assistant specialized in analyzing technical drawings and documents using GPT-5. I can help identify components like valves, pipes, electrical systems, and other technical elements in your drawings, PDFs, or Word documents. Upload a file and I'll provide a comprehensive analysis with detailed component information.`;

// Use relative API paths since frontend is served from the same server
const API_URL = '';

function App() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [
      { role: 'assistant', content: INITIAL_MESSAGE }
    ],
    isLoading: false
  });
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [input, setInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch (error) {
      setServerStatus('offline');
      console.error('Server connection error:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginCredentials),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        setShowLogin(false);
        setLoginCredentials({ username: '', password: '' });
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (error) {
      setLoginError('Connection error. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || serverStatus === 'offline' || !isAuthenticated) return;

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
        credentials: 'include'
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
          content: 'Sorry, I encountered an error while processing your message. Please ensure the server is running and try again.'
        }],
        isLoading: false
      }));
      checkServerStatus();
    }
    scrollToBottom();
  };

  const handleFileSelect = async (file: File) => {
    if (serverStatus === 'offline' || !isAuthenticated) {
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'assistant',
          content: 'Please ensure you are logged in and the server is running before uploading files.'
        }],
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      const fileType = file.type;
      const newMessage: Message = {
        role: 'user',
        content: `Please analyze this ${fileType === 'application/pdf' ? 'PDF' : 
                  fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Word document' : 
                  'technical drawing'} using GPT-5.`,
        file: {
          data: base64Data,
          type: fileType,
          name: file.name
        }
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
            file: {
              data: base64Data,
              type: fileType,
              name: file.name
            },
            message: `Please analyze this ${file.type.includes('image') ? 'technical drawing' : 'document'} using GPT-5.`
          }),
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

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
            content: 'Sorry, I encountered an error while analyzing the file. Please ensure the server is running and try again.'
          }],
          isLoading: false
        }));
        checkServerStatus();
      }
      scrollToBottom();
    };
    reader.readAsDataURL(file);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Technical Drawing Analyzer</h1>
              <p className="text-gray-600">Powered by GPT-5 AI</p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={loginCredentials.username}
                  onChange={(e) => setLoginCredentials(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter username"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={loginCredentials.password}
                  onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02]"
              >
                Sign In
              </button>
            </form>

            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                {serverStatus === 'online' ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Server Online</span>
                  </>
                ) : serverStatus === 'offline' ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span>Server Offline</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span>Checking Server...</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Technical Drawing Analyzer</h1>
                <p className="text-sm text-gray-600">Powered by GPT-5 AI</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {serverStatus === 'online' ? (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  <span>Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  <span>Offline</span>
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 h-[700px] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatState.messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-100 p-6 space-y-4 bg-gray-50">
            <FileUpload onFileSelect={handleFileSelect} />
            
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about the document..."
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                disabled={chatState.isLoading}
              />
              <button
                type="submit"
                disabled={chatState.isLoading}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {chatState.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;