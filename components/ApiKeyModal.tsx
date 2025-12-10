import React, { useState, useEffect } from 'react';
import { Key, Lock, X, Check, AlertTriangle, Loader2, Eye, EyeOff, Trash2, ExternalLink, ShieldCheck, CreditCard } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentKey }) => {
  const [key, setKey] = useState(currentKey);
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setKey(currentKey);
    setStatus('idle');
    setErrorMessage('');
  }, [currentKey, isOpen]);

  if (!isOpen) return null;

  const validateAndSave = async () => {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
        setErrorMessage("Please enter an API key.");
        setStatus('error');
        return;
    }
    
    setStatus('validating');
    setErrorMessage('');

    try {
      const ai = new GoogleGenAI({ apiKey: trimmedKey });
      
      // Lightweight validation call
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { role: 'user', parts: [{ text: 'Hi' }] },
      });
      
      setStatus('valid');
      setTimeout(() => {
          onSave(trimmedKey);
          onClose(); 
      }, 500);
      
    } catch (e: any) {
      const errString = e.toString().toLowerCase();
      
      // Be smarter about errors. 
      // If it's a 429 (Rate Limit), the key is actually VALID, just busy.
      if (errString.includes('429') || errString.includes('quota')) {
          setStatus('valid'); // Treat as valid, just busy
          setTimeout(() => {
            onSave(trimmedKey);
            onClose(); 
          }, 500);
          return;
      }

      console.error("Validation Error:", e);
      setStatus('error');

      if (errString.includes('403') || errString.includes('permission denied')) {
          setErrorMessage('Key rejected. This is usually a billing/project setting.');
      } else if (errString.includes('400') || errString.includes('invalid argument')) {
          setErrorMessage('Invalid Key Format.');
      } else {
          setErrorMessage('Connection failed. Please check internet.');
      }
    }
  };

  const handleClear = () => {
      setKey('');
      setStatus('idle');
      setErrorMessage('');
      onSave('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden ring-1 ring-white/10">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 pb-4 flex justify-between items-start border-b border-slate-800">
          <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-brand-500" /> 
                API Configuration
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                Enter your Gemini API key to activate BookSmith.
              </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          
          {/* Input Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gemini API Key</label>
                <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 hover:underline"
                >
                    Get Free API Key <ExternalLink className="w-3 h-3" />
                </a>
            </div>
            
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-400 transition-colors">
                  <Key className="w-5 h-5" />
              </div>
              
              <input 
                type={isVisible ? "text" : "password"}
                value={key}
                onChange={(e) => {
                    setKey(e.target.value);
                    setStatus('idle');
                    setErrorMessage('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && validateAndSave()}
                placeholder="Paste your API key here..."
                className={`w-full bg-slate-950 border-2 rounded-xl py-3 pl-10 pr-12 text-white placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all font-mono text-sm ${
                    status === 'error' ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/10' : 
                    status === 'valid' ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500/10' : 
                    'border-slate-800 focus:border-brand-500'
                }`}
              />
              
              <button 
                onClick={() => setIsVisible(!isVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1 rounded-md transition-colors"
                title={isVisible ? "Hide API Key" : "Show API Key"}
              >
                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Status Feedback */}
            <div className="min-h-[24px]">
                {status === 'error' && (
                    <div className="flex items-center gap-2 text-rose-400 animate-in slide-in-from-top-1">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-medium">{errorMessage}</span>
                    </div>
                )}
                {status === 'valid' && (
                    <div className="flex items-center gap-2 text-green-400 animate-in slide-in-from-top-1">
                        <Check className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-medium">Key verified! You are ready to go.</span>
                    </div>
                )}
                {status === 'idle' && (
                    <div className="flex items-center gap-2 text-slate-500">
                        <Lock className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs">Keys are stored locally. Free keys supported.</span>
                    </div>
                )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {currentKey && (
                <button 
                    onClick={handleClear}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 transition-all flex items-center gap-2"
                    title="Remove API Key"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
            
            <button 
              onClick={validateAndSave}
              disabled={status === 'validating' || !key.trim()}
              className={`flex-1 flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl transition-all shadow-lg text-sm ${
                  status === 'valid' 
                  ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20' 
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-900/20 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-brand-500/20'
              }`}
            >
              {status === 'validating' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
              ) : status === 'valid' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Connected</span>
                  </>
              ) : (
                  <span>Save API Key</span>
              )}
            </button>
          </div>
          
          <div className="pt-2 border-t border-slate-800">
              <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-800/50 p-3 rounded-lg">
                  <CreditCard className="w-4 h-4 mt-0.5 text-slate-400" />
                  <p>
                      Supports both Free and Paid tiers. <span className="text-brand-400">Free Tier</span> users may experience short pauses if generating very quickly (Rate Limits), which this app handles automatically.
                  </p>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
};