import { useEffect, useState, useRef } from 'react';
import { subscribeToRateLimit, getGitHubToken, searchRepos, getRepo } from '../services/github';
import { getGeminiApiKey, getSelectedGeminiModel } from '../services/gemini';
import { RateLimitState, GitHubRepo } from '../types';
import { Settings, Radar, Sparkles, KeyRound, CheckCircle2, Search, Star, Loader2, X, Command } from 'lucide-react';
import { cn, formatStars } from '../lib/utils';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenRepo?: (repo: GitHubRepo) => void;
}

export function Header({ onOpenSettings, onOpenRepo }: HeaderProps) {
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');

  // Global Quick Search State
  const [quickQuery, setQuickQuery] = useState('');
  const [quickResults, setQuickResults] = useState<GitHubRepo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Global keyboard shortcut: Ctrl+K or Cmd+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsOpenDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = quickQuery.trim();
    if (!trimmed) {
      setQuickResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (trimmed.includes('/') && !trimmed.includes(' ')) {
          const [owner, name] = trimmed.split('/');
          if (owner && name) {
            try {
              const exact = await getRepo(owner, name);
              if (exact && exact.id) {
                setQuickResults([exact]);
                setIsOpenDropdown(true);
                setIsSearching(false);
                return;
              }
            } catch {
              // Fallback to keyword search
            }
          }
        }
        const res = await searchRepos(`${trimmed} in:name,description archived:false`, 'stars', 'desc', 6);
        setQuickResults(res.items || []);
        setIsOpenDropdown(true);
      } catch (err) {
        console.warn("Global quick search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [quickQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpenDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRepo = (repo: GitHubRepo) => {
    setIsOpenDropdown(false);
    setQuickQuery('');
    if (onOpenRepo) {
      onOpenRepo(repo);
    }
  };

  const limitWarn = rateLimit && rateLimit.limit > 0 && rateLimit.remaining / rateLimit.limit < 0.2;

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-800/80 bg-zinc-950/80 sticky top-0 z-30 backdrop-blur-md gap-4">
      <div className="flex items-center gap-3 shrink-0">
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
          <p className="text-[11px] text-zinc-500 hidden xl:block">AI-Powered GitHub Intelligence & Star Velocity Engine</p>
        </div>
      </div>

      {/* Global Quick Search Bar */}
      <div className="relative flex-1 max-w-md hidden md:block" ref={dropdownRef}>
        <div className="flex items-center bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 focus-within:border-cyan-500/50 rounded-xl px-3 py-1.5 text-xs transition-all">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0 mr-2" />
          <input
            ref={searchInputRef}
            type="text"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            onFocus={() => { if (quickResults.length > 0) setIsOpenDropdown(true); }}
            placeholder="Quick search repo or owner/name (e.g. facebook/react)..."
            className="w-full bg-transparent text-zinc-200 placeholder-zinc-500 focus:outline-none"
          />
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0 ml-1" />
          ) : quickQuery ? (
            <button onClick={() => { setQuickQuery(''); setQuickResults([]); }} className="text-zinc-500 hover:text-white p-0.5">
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800 rounded">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          )}
        </div>

        {/* Quick Search Dropdown */}
        {isOpenDropdown && quickResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-50 max-h-80 overflow-y-auto divide-y divide-zinc-800/50 animate-in fade-in duration-150">
            {quickResults.map(repo => (
              <button
                key={repo.id}
                onClick={() => handleSelectRepo(repo)}
                className="w-full text-left px-3.5 py-2 hover:bg-zinc-800/80 transition-colors flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <img src={repo.owner.avatar_url} alt={repo.owner.login} className="w-6 h-6 rounded-md bg-zinc-800 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-200 truncate">{repo.full_name}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{repo.description || 'No description'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-zinc-400">
                  {repo.language && <span className="text-[10px] text-cyan-400 font-medium">{repo.language}</span>}
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400/20" /> {formatStars(repo.stargazers_count)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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

