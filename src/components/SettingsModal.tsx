import { useState, useEffect } from 'react';
import { getGitHubToken, setGitHubToken } from '../services/github';
import { 
  getGeminiApiKey, 
  setGeminiApiKey, 
  getSelectedGeminiModel, 
  setSelectedGeminiModel, 
  fetchGeminiModels, 
  testGeminiApi, 
  GeminiModelInfo, 
  DEFAULT_GEMINI_MODELS 
} from '../services/gemini';
import { X, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, Key, Sparkles, Cpu, RefreshCw, Bot } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'gemini' | 'github'>('gemini');
  
  // GitHub State
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [testingGithub, setTestingGithub] = useState(false);
  const [githubTestResult, setGithubTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Gemini State
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [models, setModels] = useState<GeminiModelInfo[]>(DEFAULT_GEMINI_MODELS);
  const [testingGemini, setTestingGemini] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load stored values
      setToken(getGitHubToken());
      const key = getGeminiApiKey();
      const model = getSelectedGeminiModel();
      setGeminiKey(key);
      setSelectedModel(model);
      setGithubTestResult(null);
      setGeminiTestResult(null);

      // Fetch models if key exists
      if (key) {
        setLoadingModels(true);
        fetchGeminiModels(key)
          .then(mList => {
            if (mList && mList.length > 0) {
              setModels(mList);
            }
          })
          .finally(() => setLoadingModels(false));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestGithubToken = async () => {
    if (!token.trim()) {
      setGithubTestResult({ success: false, message: 'Please enter a token first.' });
      return;
    }
    setTestingGithub(true);
    setGithubTestResult(null);
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (res.ok) {
        const user = await res.json();
        setGithubTestResult({ success: true, message: `Authenticated as @${user.login} (Rate limit: 5,000/hr)` });
      } else {
        setGithubTestResult({ success: false, message: `GitHub API Error (${res.status}): Invalid token or insufficient permissions.` });
      }
    } catch (e: any) {
      setGithubTestResult({ success: false, message: `Connection failed: ${e.message}` });
    } finally {
      setTestingGithub(false);
    }
  };

  const handleTestGeminiKey = async () => {
    if (!geminiKey.trim()) {
      setGeminiTestResult({ success: false, message: 'Please enter a Gemini API key.' });
      return;
    }
    setTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const result = await testGeminiApi(geminiKey.trim(), selectedModel);
      setGeminiTestResult({ success: result.success, message: result.message });
      if (result.models && result.models.length > 0) {
        setModels(result.models);
      }
    } catch (e: any) {
      setGeminiTestResult({ success: false, message: `Test failed: ${e.message}` });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleFetchModels = async () => {
    if (!geminiKey.trim()) return;
    setLoadingModels(true);
    try {
      const fetched = await fetchGeminiModels(geminiKey.trim());
      setModels(fetched);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = () => {
    setGitHubToken(token.trim());
    setGeminiApiKey(geminiKey.trim());
    setSelectedGeminiModel(selectedModel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <h2 className="font-bold text-white text-base">API Settings & Models</h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800 bg-zinc-950 px-5 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('gemini')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'gemini'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Gemini AI Settings
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'github'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            GitHub Token
          </button>
        </div>
        
        {/* Tab Contents */}
        <div className="p-5 space-y-5 text-sm overflow-y-auto flex-1">
          {activeTab === 'gemini' ? (
            <div className="space-y-4">
              {/* API Key */}
              <div>
                <label className="block font-semibold mb-1.5 text-zinc-200 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  Google Gemini API Key
                </label>
                <p className="text-zinc-400 text-xs mb-2.5 leading-relaxed">
                  Required for AI search synthesis, deep repository evaluation, and natural language recommendations. Your key is kept secure in your browser.
                </p>
                <div className="relative">
                  <input 
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 border border-zinc-800 rounded-xl bg-zinc-900 text-zinc-100 focus:outline-none focus:border-cyan-500/50 font-mono text-xs placeholder:text-zinc-600"
                    placeholder="AIzaSy..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Gemini Model Selector Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Select Gemini Model
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={loadingModels || !geminiKey.trim()}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingModels ? 'animate-spin' : ''}`} />
                    Refresh Models
                  </button>
                </div>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-zinc-800 rounded-xl bg-zinc-900 text-zinc-100 focus:outline-none focus:border-cyan-500/50 text-xs cursor-pointer font-mono"
                >
                  {models.map(m => (
                    <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-100">
                      {m.displayName || m.id} ({m.id})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Active model: <strong className="text-cyan-400 font-mono">{selectedModel}</strong>. Models are populated dynamically from your Gemini API Key.
                </p>
              </div>

              {/* Test Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTestGeminiKey}
                  disabled={testingGemini || !geminiKey.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testingGemini ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  )}
                  {testingGemini ? 'Testing Gemini API Connection...' : 'Test Gemini API & Fetch All Models'}
                </button>
              </div>

              {/* Test Output Banner */}
              {geminiTestResult && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed ${
                  geminiTestResult.success 
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50' 
                    : 'bg-red-950/40 text-red-300 border-red-800/50'
                }`}>
                  {geminiTestResult.success ? (
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  )}
                  <span>{geminiTestResult.message}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1.5 text-zinc-200">GitHub Personal Access Token (PAT)</label>
                <p className="text-zinc-400 text-xs mb-3 leading-relaxed">
                  Increases your rate limit from 60 to 5,000 requests/hour and unlocks code search. Classic tokens with <code className="text-cyan-400 bg-zinc-900 px-1 py-0.5 rounded">public_repo</code> scope work best.
                </p>
                <div className="relative">
                  <input 
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 border border-zinc-800 rounded-xl bg-zinc-900 text-zinc-100 focus:outline-none focus:border-cyan-500/50 font-mono text-xs placeholder:text-zinc-600"
                    placeholder="ghp_..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleTestGithubToken}
                  disabled={testingGithub || !token.trim()}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold border border-zinc-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testingGithub && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                  {testingGithub ? 'Testing GitHub Token...' : 'Test GitHub Token Connection'}
                </button>
              </div>

              {githubTestResult && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed ${
                  githubTestResult.success 
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50' 
                    : 'bg-red-950/40 text-red-300 border-red-800/50'
                }`}>
                  {githubTestResult.success ? (
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  )}
                  <span>{githubTestResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between shrink-0">
          <button 
            type="button"
            onClick={() => { 
              if (activeTab === 'gemini') {
                setGeminiApiKey(''); 
                setGeminiKey(''); 
                setSelectedModel('gemini-2.0-flash');
                setSelectedGeminiModel('gemini-2.0-flash');
              } else {
                setGitHubToken(''); 
                setToken(''); 
              }
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
          >
            Clear {activeTab === 'gemini' ? 'Gemini Key' : 'GitHub Token'}
          </button>
          <button 
            onClick={handleSave}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

