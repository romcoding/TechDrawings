import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Download, Brain, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { FileUpload } from './components/FileUpload';
import { ChatState, Message } from './types';

const INITIAL_MESSAGE = `I am an AI assistant specialized in analyzing technical drawings and documents using GPT-4o with expert engineering knowledge. I can provide comprehensive analysis of technical drawings according to international standards (VDI 3814, ISO 16484, ISO 14617, IEC 60617, DIN EN 81346).

🔧 **What I can analyze:**
• HVAC systems, building automation, and industrial control systems
• Valves, pumps, sensors, actuators, and control equipment
• Electrical systems, wiring, and instrumentation
• Piping systems, fittings, and mechanical components
• Safety systems and emergency equipment

📊 **Analysis includes:**
• Detailed Bill of Materials (BOM) with quantities
• Component specifications, ratings, and materials
• Signal types and communication protocols
• System locations and technical standards
• Downloadable CSV report for procurement

Upload a technical drawing and I'll provide a professional engineering analysis!`;

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'https://techdrawings-1.onrender.com';

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
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth-status`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
        console.log('Auth status:', data);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    }
  };

  const checkServerStatus = async () => {
    try {
      console.log('Checking server status...');
      console.log('API_URL:', API_URL);
      console.log('Full health URL:', `${API_URL}/health`);
      
      // Check server status using health endpoint
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Health response status:', response.status);
      console.log('Health response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('Health data:', data);
        setServerStatus('online');
      } else {
        console.log('Health check failed with status:', response.status);
        const errorText = await response.text();
        console.log('Error response:', errorText);
        setServerStatus('offline');
      }
      
    } catch (error) {
      console.error('Server connection error:', error);
      console.error('Error details:', error.message);
      setServerStatus('offline');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      console.log('Attempting login...');
      console.log('API_URL:', API_URL);
      console.log('Login URL:', `${API_URL}/api/login`);
      console.log('Credentials:', { username: loginCredentials.username, password: '***' });
      
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginCredentials),
        credentials: 'include'
      });

      console.log('Login response status:', response.status);
      console.log('Login response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('Login response data:', data);
      
      if (data.success) {
        setIsAuthenticated(true);
        setShowLogin(false);
        setLoginCredentials({ username: '', password: '' });
        // If login works, server is definitely online
        setServerStatus('online');
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
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
    // Check authentication first
    if (!isAuthenticated) {
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'assistant',
          content: 'Please log in first before uploading files.'
        }],
      }));
      return;
    }

    // Check server status and retry if needed
    if (serverStatus === 'offline') {
      console.log('Server appears offline, retrying health check...');
      await checkServerStatus();
      
      if (serverStatus === 'offline') {
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, {
            role: 'assistant',
            content: 'Server appears to be offline. Please check your connection and try again. If the problem persists, the server may be experiencing issues.'
          }],
        }));
        return;
      }
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
          if (response.status === 401) {
            throw new Error('401: Authentication required');
          }
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
        
        // If file analysis works, server is definitely online
        setServerStatus('online');
      } catch (error) {
        console.error('Error:', error);
        
        let errorMessage = 'Sorry, I encountered an error while analyzing the file. Please ensure the server is running and try again.';
        
        // Check if it's an authentication error
        if (error.message && error.message.includes('401')) {
          errorMessage = 'Authentication required. Please log in first before analyzing files.';
          setIsAuthenticated(false);
        }
        
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, {
            role: 'assistant',
            content: errorMessage
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
              <p className="text-gray-600">Powered by GPT-4o • Expert Engineering Analysis</p>
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
                <p className="text-sm text-gray-600">Powered by GPT-4o • Expert Engineering Analysis</p>
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
                onClick={checkServerStatus}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                title="Refresh server status"
              >
                Refresh
              </button>
              
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
            
            {/* Download Section */}
            {chatState.messages.some(msg => msg.role === 'assistant' && msg.content.includes('Total components identified:')) && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-blue-900">Analysis Complete!</h3>
                    <p className="text-sm text-blue-700">Download the detailed Bill of Materials (BOM) as CSV</p>
                  </div>
                </div>
                 <button
                   onClick={() => window.open(`${API_URL}/api/download`, '_blank')}
                   className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                 >
                   <Download className="w-4 h-4 mr-2" />
                   Download BOM
                 </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={serverStatus === 'offline' ? 'Server is offline. Cannot send messages.' : 'Type your message or upload a file...'}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={chatState.isLoading || serverStatus === 'offline' || !isAuthenticated}
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center p-3 border border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-lg shadow-sm transition-all transform hover:scale-[1.02]"
                disabled={chatState.isLoading || serverStatus === 'offline' || !isAuthenticated}
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

      <footer className="bg-gray-800 text-white text-center p-4 text-sm">
        <p>&copy; {new Date().getFullYear()} Technical Drawing Analyzer. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
