import { useEffect, useState } from 'react';
import { subscribeToRateLimit, getGitHubToken } from '../services/github';
import { getGeminiApiKey, getSelectedGeminiModel } from '../services/gemini';
import { RateLimitState } from '../types';
import { Settings, Radar, Sparkles, KeyRound, CheckCircle2, Bot } from 'lucide-react';
import { cn } from '../lib/utils';

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');

  useEffect(() => {
    setHasToken(!!getGitHubToken());
    setHasGeminiKey(!!getGeminiApiKey());
    setSelectedModel(getSelectedGeminiModel());

    return subscribeToRateLimit((state) => {
      setRateLimit(state);
      setHasToken(!!getGitHubToken());
      setHasGeminiKey(!!getGeminiApiKey());
      setSelectedModel(getSelectedGeminiModel());
    });
  }, []);

  const limitWarn = rateLimit && rateLimit.limit > 0 && rateLimit.remaining / rateLimit.limit < 0.2;

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800/80 bg-zinc-950/80 sticky top-0 z-30 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Radar className="w-4 h-4 text-zinc-950 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              RepoRadar
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded font-mono">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 hidden sm:block">AI-Powered GitHub Intelligence & Star Velocity Engine</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Gemini Active Badge */}
        <button
          onClick={onOpenSettings}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/90 hover:bg-zinc-800 rounded-lg border border-zinc-800 text-[11px] font-mono transition-colors cursor-pointer"
          title="Click to configure Gemini API Key and Model"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-zinc-300 font-medium truncate max-w-[130px]">{selectedModel}</span>
          {hasGeminiKey ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
          )}
        </button>

        {rateLimit && rateLimit.limit > 0 && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-zinc-900/80 rounded-full border border-zinc-800 text-xs font-mono">
            <div className={cn("w-2 h-2 rounded-full", limitWarn ? "bg-red-500 animate-pulse" : "bg-emerald-500")}></div>
            <span className={cn(limitWarn ? "text-red-400" : "text-zinc-400")}>
              GH Rate: <strong className="text-zinc-200">{rateLimit.remaining}</strong>/{rateLimit.limit}
            </span>
          </div>
        )}

        <button 
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all text-xs text-zinc-300 hover:text-white cursor-pointer"
        >
          {hasToken ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> PAT Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-zinc-400">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" /> API Settings
            </span>
          )}
          <Settings className="w-3.5 h-3.5 text-zinc-400 ml-1" />
        </button>
      </div>
    </header>
  );
}

