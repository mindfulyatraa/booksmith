import React, { useState, useRef, useEffect } from 'react';
import { Send, Book, Sparkles, PieChart as PieChartIcon, Menu, Feather, Rocket, CheckCircle, AlertCircle, FolderOpen, Clock, Loader2, Settings2, Image as ImageIcon } from 'lucide-react';
import { GeminiService } from './services/geminiService';
import { Message, Sender, EBook, MarketData, AppMode, SavedProject } from './types';
import { EBookReader } from './components/EBookReader';
import { MarketAnalysis } from './components/MarketAnalysis';
import { ProjectLibrary } from './components/ProjectLibrary';
import { ApiKeyModal } from './components/ApiKeyModal';
import ReactMarkdown from 'react-markdown';

const ENV_API_KEY = process.env.API_KEY || '';

function App() {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || ENV_API_KEY);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "Hello! I'm **BookSmith**.\n\nI can create **Novels**, **Comics**, and **Guides**.\n\nJust say: \n*\"Create a comic about a space cat\"*\n*\"Write a mystery novel\"*\n*\"Analyze the market for AI books\"*",
      sender: Sender.AI,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); 
  const [currentMode, setCurrentMode] = useState<AppMode>('chat');
  const [generatedBook, setGeneratedBook] = useState<EBook | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(() => {
    const saved = localStorage.getItem('booksmith_projects');
    return saved ? JSON.parse(saved) : [];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const geminiServiceRef = useRef<GeminiService | null>(null);

  useEffect(() => {
    if (apiKey) {
      try {
        geminiServiceRef.current = new GeminiService(apiKey);
        localStorage.setItem('gemini_api_key', apiKey);
      } catch (e) {
        console.error("Service construction error", e);
      }
    } else {
        setIsKeyModalOpen(true);
    }
  }, [apiKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, elapsedTime]);

  useEffect(() => {
    localStorage.setItem('booksmith_projects', JSON.stringify(savedProjects));
  }, [savedProjects]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      setElapsedTime(0);
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim()) return;
    if (!apiKey) {
        setIsKeyModalOpen(true);
        return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      text: text,
      sender: Sender.USER,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (!geminiServiceRef.current) throw new Error("Service not initialized");

      let isActionTaken = false;

      const response = await geminiServiceRef.current.sendMessage(
        text,
        (book) => {
          setGeneratedBook(book);
          const successMsg: Message = {
            id: 'book-success-' + Date.now(),
            text: `**Success!** Created: "${book.title}" (${book.format.toUpperCase()}).`,
            sender: Sender.AI,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMsg]);
          setCurrentMode('preview');
          isActionTaken = true;
        },
        (data) => {
          setMarketData(data);
          setCurrentMode('analysis');
          isActionTaken = true;
        },
        (chapterIndex, newContent) => {
          setGeneratedBook(prev => {
            if (!prev) return null;
            const updatedChapters = [...prev.chapters];
            if (updatedChapters[chapterIndex]) {
               updatedChapters[chapterIndex] = { ...updatedChapters[chapterIndex], content: newContent };
            }
            return { ...prev, chapters: updatedChapters };
          });
          const successMsg: Message = {
            id: 'edit-success-' + Date.now(),
            text: `**Edit Complete:** Chapter ${chapterIndex + 1} updated.`,
            sender: Sender.AI,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMsg]);
          setCurrentMode('preview');
          isActionTaken = true;
        }
      );

      // If action was taken (book created), we ignore empty text responses
      if (!response && !isActionTaken) throw new Error("Empty response from AI");

      if (response) {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: response,
          sender: Sender.AI,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
      }

    } catch (error: any) {
      console.error("Detailed Error:", error);
      let errorText = "Connection failed.";
      const errorStr = error.toString().toLowerCase();
      
      // Strict check for AUTHENTICATION errors
      if (errorStr.includes('403') || errorStr.includes('key not valid') || errorStr.includes('invalid_api_key')) {
        errorText = "Invalid API Key. Please click 'API Configuration' to update it.";
        setIsKeyModalOpen(true);
      } 
      // Network errors
      else if (errorStr.includes('fetch failed')) {
        errorText = "Network error. Please check your internet connection.";
      } 
      // Generation errors (Safety, Empty, etc)
      else if (errorStr.includes('empty response') || errorStr.includes('safety') || errorStr.includes('blocked')) {
        errorText = "The AI could not generate a response. " + (errorStr.includes('safety') ? "Content blocked by safety filters." : "Please try a simpler or shorter request.");
      } 
      // Generic errors (400, 500)
      else {
        errorText = "An error occurred. The system might be overloaded. Please wait a moment and try again.";
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: `**System Error:** ${errorText}`,
        sender: Sender.AI,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = (type: 'fiction' | 'non-fiction' | 'comic') => {
    let prompt = "";
    if (type === 'fiction') {
      prompt = "Create a Fiction novel. Use a Hero's Journey structure.";
    } else if (type === 'non-fiction') {
      prompt = "Create a Non-Fiction guide.";
    } else if (type === 'comic') {
      prompt = "Create a Comic Book script with detailed panels.";
    }
    handleSendMessage(prompt);
  };

  const handleSaveProject = () => {
    if (generatedBook) {
      const newProject: SavedProject = {
        id: Date.now().toString(),
        name: generatedBook.title,
        book: generatedBook,
        messages: messages,
        marketData: marketData,
        createdAt: Date.now()
      };
      setSavedProjects(prev => [newProject, ...prev]);
      setMessages(prev => [...prev, {
        id: 'save-msg-' + Date.now(),
        text: `**Project Saved!**`,
        sender: Sender.AI,
        timestamp: new Date()
      }]);
    }
  };

  const handleAnalyzeTopic = (topic: string) => {
    setCurrentMode('chat');
    handleSendMessage(`Analyze the market for: ${topic}`);
  };

  const handleGenerateImage = async (chapterIndex: number, prompt: string): Promise<string> => {
    if (!geminiServiceRef.current) throw new Error("AI Service not ready");
    try {
      const imageUrl = await geminiServiceRef.current.generateImage(prompt);
      
      // Update local state
      setGeneratedBook(prev => {
        if (!prev) return null;
        const newChapters = [...prev.chapters];
        if (newChapters[chapterIndex]) {
          newChapters[chapterIndex] = { ...newChapters[chapterIndex], imageUrl };
        }
        return { ...prev, chapters: newChapters };
      });

      return imageUrl;
    } catch (e) {
      console.error("Image generation failed in App", e);
      throw e;
    }
  };

  const getLoadingStatus = (seconds: number) => {
    if (seconds < 5) return "Initializing BookSmith AI...";
    if (seconds < 15) return "Brainstorming Plot & Characters...";
    if (seconds < 30) return "Structuring Chapters...";
    if (seconds < 60) return "Writing Content (This may take a minute)...";
    if (seconds < 90) return "Refining and Polishing...";
    return "Finalizing your book...";
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">
      <ApiKeyModal 
        isOpen={isKeyModalOpen} 
        onClose={() => setIsKeyModalOpen(false)} 
        onSave={(key) => {
            setApiKey(key); 
            setIsKeyModalOpen(false);
        }} 
        currentKey={apiKey} 
      />

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800 flex flex-col py-6 gap-6 transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="px-6 flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Book className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-lg tracking-tight">BookSmith AI</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2 px-3 mt-4">
          <button 
            onClick={() => { setCurrentMode('chat'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${currentMode === 'chat' ? 'bg-brand-600/10 text-brand-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Assistant</span>
          </button>
          <button 
            onClick={() => { if(generatedBook) { setCurrentMode('preview'); setIsMobileMenuOpen(false); } }}
            disabled={!generatedBook}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${currentMode === 'preview' ? 'bg-brand-600/10 text-brand-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'} ${!generatedBook && 'opacity-40 cursor-not-allowed'}`}
          >
            <Book className="w-5 h-5" />
            <span className="font-medium">Read Book</span>
          </button>
          
          <button 
            onClick={() => { setCurrentMode('analysis'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${currentMode === 'analysis' ? 'bg-brand-600/10 text-brand-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <PieChartIcon className="w-5 h-5" />
            <span className="font-medium">Market Analysis</span>
          </button>

           <button 
            onClick={() => { setCurrentMode('projects'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${currentMode === 'projects' ? 'bg-brand-600/10 text-brand-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="font-medium">Library</span>
          </button>
        </nav>

        <div className="px-4 mt-auto">
             <button 
                onClick={() => setIsKeyModalOpen(true)}
                className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-white transition-colors w-full text-xs"
             >
                <Settings2 className="w-4 h-4" />
                <span>API Configuration</span>
             </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        <div className="md:hidden h-14 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-950">
           <span className="font-bold">BookSmith AI</span>
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-400"><Menu className="w-6 h-6" /></button>
        </div>

        {currentMode === 'chat' && (
          <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.sender === Sender.USER ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === Sender.AI ? 'bg-brand-600' : 'bg-slate-700'}`}>
                    {msg.sender === Sender.AI ? <Sparkles className="w-4 h-4 text-white" /> : <div className="w-4 h-4 rounded-full bg-slate-400" />}
                  </div>
                  <div className="max-w-[85%] flex flex-col gap-2">
                    <div className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${msg.sender === Sender.USER ? 'bg-slate-800 text-white rounded-tr-sm' : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-sm'}`}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                    {msg.text.includes('**Success!**') && generatedBook && msg.sender === Sender.AI && (
                      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 mt-2">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                        <div className="flex-1">
                          <h4 className="font-bold text-white text-sm">{generatedBook.title}</h4>
                          <p className="text-xs text-slate-400 capitalize">{generatedBook.format} • {generatedBook.chapters.length} Chapters</p>
                        </div>
                        <button onClick={() => setCurrentMode('preview')} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">Open</button>
                      </div>
                    )}
                    {msg.text.includes('**System Error:**') && (
                       <div className="flex items-center gap-2 text-rose-400 text-xs mt-1 px-1">
                         <AlertCircle className="w-3 h-3" /> <span>{msg.text.replace('**System Error:**', '')}</span>
                       </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Suggestions */}
              {messages.length < 3 && !isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <button onClick={() => handleTemplateClick('fiction')} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-left transition-all hover:border-brand-500 group">
                    <Feather className="w-5 h-5 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-white text-sm">Create Fiction</h3>
                    <p className="text-xs text-slate-400 mt-1">Hero's Journey novel.</p>
                  </button>
                  <button onClick={() => handleTemplateClick('comic')} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-left transition-all hover:border-brand-500 group">
                    <ImageIcon className="w-5 h-5 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-white text-sm">Create Comic</h3>
                    <p className="text-xs text-slate-400 mt-1">Script with panels.</p>
                  </button>
                  <button onClick={() => handleTemplateClick('non-fiction')} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 p-4 rounded-xl text-left transition-all hover:border-brand-500 group">
                    <Rocket className="w-5 h-5 text-brand-400 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-bold text-white text-sm">Create Non-Fiction</h3>
                    <p className="text-xs text-slate-400 mt-1">Educational guide.</p>
                  </button>
                </div>
              )}
              
              {/* Timer Progress */}
              {isLoading && (
                <div className="flex flex-col gap-2 max-w-sm mx-auto my-6 animate-in fade-in zoom-in-95 duration-300">
                   <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                           <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                           <span className="text-sm font-bold text-white">Generating...</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded text-xs font-mono text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{elapsedTime}s</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 mb-3 overflow-hidden">
                        <div 
                          className="bg-brand-500 h-full rounded-full transition-all duration-1000 ease-linear"
                          style={{ width: `${Math.min((elapsedTime / 90) * 100, 98)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-400 text-center animate-pulse">{getLoadingStatus(elapsedTime)}</p>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800">
              <div className="relative max-w-4xl mx-auto">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={apiKey ? `Create a comic, novel, or guide about...` : "Please click 'API Configuration' to start"}
                  disabled={isLoading || !apiKey}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 pl-6 pr-14 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-lg"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputValue.trim() || !apiKey}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {currentMode === 'preview' && generatedBook && (
          <EBookReader book={generatedBook} onSaveProject={handleSaveProject} onGenerateImage={handleGenerateImage} />
        )}

        {currentMode === 'analysis' && (
          <MarketAnalysis data={marketData} onAnalyzeTopic={handleAnalyzeTopic} />
        )}

        {currentMode === 'projects' && (
           <ProjectLibrary 
             projects={savedProjects} 
             onLoadProject={(p) => { setGeneratedBook(p.book); setMessages(p.messages); setCurrentMode('preview'); }} 
             onDeleteProject={(id) => setSavedProjects(prev => prev.filter(p => p.id !== id))}
           />
        )}
      </div>
    </div>
  );
}

export default App;