import { useState, useEffect } from 'react';
import { askRadar } from '../services/gemini';
import { searchRepos } from '../services/github';
import { AskStep, AskResult, GitHubRepo } from '../types';
import { RepoCard } from '../components/RepoCard';
import { Sparkles, Search, Compass, CheckCircle2, ArrowRight, Bot, Cpu, History, AlertTriangle, Filter, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SAMPLE_PROMPTS = [
  "Best lightweight vector database for TypeScript / Node.js",
  "Modern Rust web frameworks with high async performance",
  "Top Python open source frameworks for AI Agent orchestration",
  "Minimalist React state management libraries with zero boilerplate",
  "Self-hosted Docker alternatives to Firebase or Supabase"
];

export function AskTab({ onOpenRepo }: { onOpenRepo: (r: GitHubRepo) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<AskStep[]>([]);
  const [result, setResult] = useState<AskResult | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [filterLanguage, setFilterLanguage] = useState('all');

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('rr_recent_searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveRecent = (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const next = [trimmed, ...prev.filter(p => p.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem('rr_recent_searches', JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to store search history", e);
      }
      return next;
    });
  };

  const clearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('rr_recent_searches');
  };

  const handleAsk = async (userQuery?: string) => {
    const q = userQuery || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    setSteps([]);
    setResult(null);
    setIsFallback(false);
    setFilterLanguage('all');
    saveRecent(q);

    try {
      const res = await askRadar(q, (step) => {
        setSteps(prev => [...prev, step]);
      });
      setResult(res);
    } catch (err: any) {
      setSteps(prev => [...prev, {
        stage: 'evaluate',
        status: 'error',
        message: `${err.message || 'AI pipeline unavailable'}. Activating direct GitHub Search fallback...`
      }]);

      try {
        // Fallback: Direct GitHub keyword search
        const fallbackQuery = `${q.trim()} archived:false`;
        const fallbackRes = await searchRepos(fallbackQuery, 'stars', 'desc', 15);
        setIsFallback(true);
        setResult({
          explanation: `> **Direct GitHub Fallback Mode**: AI ranking was unavailable (${err.message || 'API quota or configuration issue'}). Showing top open-source repositories matching \`${fallbackQuery}\` sorted by star count.`,
          repos: fallbackRes.items || []
        });
      } catch (fallbackErr: any) {
        setSteps(prev => [...prev, {
          stage: 'evaluate',
          status: 'error',
          message: fallbackErr.message || 'Direct GitHub search fallback also failed.'
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const displayedRepos = (result?.repos || []).filter(repo => {
    if (filterLanguage === 'all') return true;
    return repo.language?.toLowerCase() === filterLanguage.toLowerCase();
  });

  const availableLanguages = Array.from(
    new Set((result?.repos || []).map(r => r.language).filter(Boolean) as string[])
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Search Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Multi-Stage Natural Language Search
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Ask RepoRadar AI
        </h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Describe what software or library you need in plain English. Gemini expands your prompt into optimal GitHub query strategies, fetches repositories, and ranks them.
        </p>
      </div>

      {/* Input Box */}
      <div className="relative max-w-2xl mx-auto space-y-3">
        <div className="flex items-center bg-zinc-900 border border-zinc-800 focus-within:border-cyan-500/50 rounded-2xl p-2 shadow-2xl transition-all">
          <Search className="w-5 h-5 text-zinc-500 ml-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="e.g. 'Fast C++ graphics engine for game development'..."
            className="w-full bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            onClick={() => handleAsk()}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {loading ? 'Searching...' : 'Search AI'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent Searches Bar */}
        {recentSearches.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1 mr-1">
              <History className="w-3 h-3 text-zinc-400" /> Recent:
            </span>
            {recentSearches.map((item, idx) => (
              <button
                key={idx}
                onClick={() => { setQuery(item); handleAsk(item); }}
                className="px-2.5 py-0.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md text-[11px] font-mono transition-all cursor-pointer"
              >
                {item}
              </button>
            ))}
            <button
              onClick={clearHistory}
              className="text-[10px] text-zinc-500 hover:text-red-400 p-1 transition-colors flex items-center gap-0.5 cursor-pointer"
              title="Clear search history"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Sample Prompt Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-500" /> Try:
          </span>
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => { setQuery(prompt); handleAsk(prompt); }}
              className="px-2.5 py-1 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800/80 hover:border-cyan-500/30 rounded-lg text-[11px] transition-all cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-stage Execution Steps Log */}
      {steps.length > 0 && (
        <div className="max-w-2xl mx-auto p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 space-y-3 font-mono text-xs">
          <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Execution Pipeline
          </div>
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-zinc-300">
                {step.status === 'error' ? (
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}
                <span className="capitalize text-zinc-400 font-semibold font-sans">{step.stage}:</span>
                <span className="text-zinc-200">{step.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Synthesis Summary & Recommended Repositories */}
      {result && (
        <div className="space-y-8 animate-in fade-in duration-300 pt-4">
          
          {/* AI Explanation Card */}
          <div className={`p-6 rounded-2xl border space-y-3 ${
            isFallback 
              ? 'border-amber-500/30 bg-amber-950/20' 
              : 'border-cyan-500/20 bg-zinc-900/80'
          }`}>
            <div className={`flex items-center gap-2 font-bold text-sm ${isFallback ? 'text-amber-400' : 'text-cyan-400'}`}>
              {isFallback ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              {isFallback ? 'Direct GitHub Keyword Search' : 'AI Evaluation & Recommendation'}
            </div>
            <div className="text-sm text-zinc-200 prose prose-invert max-w-none leading-relaxed">
              <ReactMarkdown>{result.explanation}</ReactMarkdown>
            </div>
          </div>

          {/* Repositories Header & Language Filter */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Matched Repositories ({displayedRepos.length})
              </h3>

              {availableLanguages.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                    <Filter className="w-3 h-3 text-cyan-400" /> Language:
                  </span>
                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 cursor-pointer"
                  >
                    <option value="all">All ({result.repos.length})</option>
                    {availableLanguages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedRepos.map(repo => (
                <RepoCard key={repo.id} repo={repo} onClick={onOpenRepo} />
              ))}
              {displayedRepos.length === 0 && (
                <div className="col-span-full py-12 text-center text-zinc-500 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                  <p>No repositories match the selected language filter.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
