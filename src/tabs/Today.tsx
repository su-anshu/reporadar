import { useEffect, useState } from 'react';
import { searchRepos } from '../services/github';
import { GitHubRepo } from '../types';
import { Carousel } from '../components/Carousel';
import { RepoCard } from '../components/RepoCard';
import { saveSnapshot, getRepoVelocity } from '../services/snapshots';
import { summarizeDaily } from '../services/gemini';
import { Sparkles, TrendingUp, Flame, Calendar, RefreshCw } from 'lucide-react';

export function TodayTab({ onOpenRepo }: { onOpenRepo?: (r: GitHubRepo) => void }) {
  const [newRepos, setNewRepos] = useState<GitHubRepo[]>([]);
  const [hotRepos, setHotRepos] = useState<GitHubRepo[]>([]);
  const [movers, setMovers] = useState<(GitHubRepo & { velocity: number })[]>([]);
  const [timeframe, setTimeframe] = useState<'24h'|'7d'|'30d'>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchToday() {
      setLoading(true);
      setError('');
      try {
        const now = new Date();
        const pastDate = new Date(now);
        if (timeframe === '24h') pastDate.setDate(now.getDate() - 1);
        if (timeframe === '7d') pastDate.setDate(now.getDate() - 7);
        if (timeframe === '30d') pastDate.setDate(now.getDate() - 30);
        
        const dateStr = pastDate.toISOString().split('T')[0];
        const newRes = await searchRepos(`created:>${dateStr}`, 'stars', 'desc', 15);
        
        const hotPast = new Date(now);
        hotPast.setDate(now.getDate() - 1);
        const hotStr = hotPast.toISOString().split('T')[0];
        const hotRes = await searchRepos(`pushed:>${hotStr} stars:>500`, 'stars', 'desc', 15);

        if (mounted) {
          setNewRepos(newRes.items);
          setHotRepos(hotRes.items);
          
          // Save snapshot for future velocity tracking
          await saveSnapshot([...newRes.items, ...hotRes.items]);
          
          // Compute velocity for hot repos
          const moversList = [];
          for (const repo of hotRes.items) {
             const v = await getRepoVelocity(repo.full_name);
             if (v && v.velocity > 0) {
               moversList.push({ ...repo, velocity: v.velocity });
             }
          }
          moversList.sort((a, b) => b.velocity - a.velocity);
          setMovers(moversList.slice(0, 15));

          // Generate AI Daily Summary asynchronously
          if (newRes.items.length > 0) {
            setSummarizing(true);
            summarizeDaily(newRes.items.slice(0, 8))
              .then(summary => { if (mounted) setAiSummary(summary); })
              .catch(err => console.error("Summary error:", err))
              .finally(() => { if (mounted) setSummarizing(false); });
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch repositories.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchToday();
    return () => { mounted = false; };
  }, [timeframe]);

  const handleRepoClick = (repo: GitHubRepo) => {
    if (onOpenRepo) onOpenRepo(repo);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Daily GitHub Radar <Flame className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Real-time open source momentum, newly created repositories, and star velocity spikes.</p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl self-start sm:self-auto">
           {(['24h', '7d', '30d'] as const).map(t => (
             <button
               key={t}
               onClick={() => setTimeframe(t)}
               className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                 timeframe === t 
                   ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm' 
                   : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
               }`}
             >
               {t === '24h' ? 'Past 24 Hours' : t === '7d' ? 'Past 7 Days' : 'Past 30 Days'}
             </button>
           ))}
        </div>
      </div>

      {/* AI Daily Open Source Briefing */}
      {(summarizing || aiSummary) && (
        <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 via-zinc-900 to-zinc-900 shadow-xl shadow-cyan-500/5 relative overflow-hidden">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-3">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>AI Open Source Briefing</span>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700/50 ml-auto">
              {summarizing ? 'Generating...' : 'Live Summary'}
            </span>
          </div>

          {summarizing && !aiSummary ? (
            <div className="text-xs text-zinc-500 animate-pulse py-2">Synthesizing trends from trending repositories...</div>
          ) : (
            <div className="text-xs text-zinc-300 space-y-2 leading-relaxed font-sans prose prose-invert max-w-none">
              {aiSummary.split('\n').map((line, idx) => (
                line.trim() ? <p key={idx} className="m-0">{line}</p> : null
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/40 text-red-300 border border-red-800/50 rounded-2xl text-sm">{error}</div>
      )}

      {loading && !newRepos.length ? (
        <div className="py-20 text-center text-zinc-500 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Scanning GitHub repositories for {timeframe} trends...</p>
        </div>
      ) : (
        <div className="space-y-10">
          <Carousel title={`New & Notable Repositories (${timeframe})`}>
            {newRepos.map(repo => (
              <div key={repo.id} className="snap-start flex">
                <RepoCard repo={repo} onClick={handleRepoClick} />
              </div>
            ))}
            {newRepos.length === 0 && <p className="text-zinc-500 text-sm">No new repositories found for this timeframe.</p>}
          </Carousel>

          <Carousel title="Trending Activity & High Star Velocity">
            {hotRepos.map(repo => (
              <div key={repo.id} className="snap-start flex">
                <RepoCard repo={repo} onClick={handleRepoClick} />
              </div>
            ))}
            {hotRepos.length === 0 && <p className="text-zinc-500 text-sm">No trending repos found.</p>}
          </Carousel>

          {movers.length > 0 && (
            <Carousel title="Star Spikes & Velocity Movers">
              {movers.map(repo => (
                <div key={repo.id} className="snap-start flex">
                  <RepoCard 
                    repo={repo} 
                    onClick={handleRepoClick} 
                    velocityMsg={`+${repo.velocity.toFixed(1)} stars/day`} 
                  />
                </div>
              ))}
            </Carousel>
          )}
        </div>
      )}
    </div>
  );
}
