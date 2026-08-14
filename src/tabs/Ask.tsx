import { useState } from 'react';
import { askRadar } from '../services/gemini';
import { AskStep, AskResult } from '../types';
import { RepoCard } from '../components/RepoCard';
import { GitHubRepo } from '../types';
import { Sparkles, Search, Compass, CheckCircle2, ArrowRight, Bot, Cpu } from 'lucide-react';
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

  const handleAsk = async (userQuery?: string) => {
    const q = userQuery || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    setSteps([]);
    setResult(null);

    try {
      const res = await askRadar(q, (step) => {
        setSteps(prev => [...prev, step]);
      });
      setResult(res);
    } catch (err: any) {
      setSteps(prev => [...prev, {
        stage: 'evaluate',
        status: 'error',
        message: err.message || 'Failed to search GitHub with Gemini AI'
      }]);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="relative max-w-2xl mx-auto">
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

        {/* Sample Prompt Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
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
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> AI Execution Pipeline
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
          <div className="p-6 rounded-2xl border border-cyan-500/20 bg-zinc-900/80 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Bot className="w-4 h-4 text-cyan-400" /> AI Evaluation & Recommendation
            </div>
            <div className="text-sm text-zinc-200 prose prose-invert max-w-none leading-relaxed">
              <ReactMarkdown>{result.explanation}</ReactMarkdown>
            </div>
          </div>

          {/* Repositories Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
              Matched Repositories ({result.repos.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {result.repos.map(repo => (
                <RepoCard key={repo.id} repo={repo} onClick={onOpenRepo} />
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
