import { useState, useEffect } from 'react';
import { X, ExternalLink, Activity, Star, GitFork, Copy, Check, ShieldAlert, Code2, LineChart as ChartIcon, FileText } from 'lucide-react';
import { GitHubRepo } from '../types';
import { getReadme } from '../services/github';
import { getSnapshots } from '../services/snapshots';
import { analyzeRepoDeep } from '../services/gemini';
import { formatStars, timeAgo } from '../lib/utils';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface Props {
  repo: GitHubRepo;
  onClose: () => void;
}

export function RepoDetail({ repo, onClose }: Props) {
  const [readme, setReadme] = useState('');
  const [loadingReadme, setLoadingReadme] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [history, setHistory] = useState<{date: string, stars: number}[]>([]);
  const [copiedClone, setCopiedClone] = useState(false);
  const [activeTab, setActiveTab] = useState<'readme' | 'analysis' | 'history'>('readme');

  useEffect(() => {
    setLoadingReadme(true);
    getReadme(repo.owner.login, repo.name)
      .then(res => setReadme(res))
      .finally(() => setLoadingReadme(false));

    getSnapshots().then(snaps => {
      const data = snaps.filter(s => s.repos[repo.full_name]).map(s => ({
        date: s.date,
        stars: s.repos[repo.full_name].stars
      }));
      setHistory(data);
    });
  }, [repo]);

  const handleDeepAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const summary = JSON.stringify({
         name: repo.full_name,
         description: repo.description,
         topics: repo.topics,
         stars: repo.stargazers_count,
         created: repo.created_at,
         updated: repo.pushed_at
      });
      const res = await analyzeRepoDeep(summary, readme);
      setAnalysis(res);
      setActiveTab('analysis');
    } catch (e: any) {
      console.error(e);
      setAnalysisError(e.message || 'Failed to analyze repository with Gemini');
    } finally {
      setAnalyzing(false);
    }
  };

  const copyCloneCmd = () => {
    navigator.clipboard.writeText(`git clone ${repo.html_url}.git`);
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-zinc-950 h-full overflow-y-auto shadow-2xl border-l border-zinc-800 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 p-6 z-20 flex items-start justify-between">
          <div className="flex gap-4 min-w-0">
            <img src={repo.owner.avatar_url} className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 shrink-0" alt={repo.owner.login} />
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-white truncate">{repo.full_name}</h2>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{repo.description}</p>
              
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-400 font-mono">
                 <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20"/> {formatStars(repo.stargazers_count)}</div>
                 <div className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5 text-zinc-400"/> {formatStars(repo.forks_count)}</div>
                 {repo.license && <div className="px-2 py-0.5 bg-zinc-900 rounded border border-zinc-800 text-[10px] text-zinc-300">{repo.license.spdx_id || repo.license.name}</div>}
                 {repo.language && <div className="text-[10px] uppercase text-cyan-400 font-semibold">{repo.language}</div>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800/80 rounded-xl transition-colors text-zinc-400 hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation & Action Bar */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('readme')}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === 'readme' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "text-zinc-400 hover:bg-zinc-800")}
            >
              <FileText className="w-3.5 h-3.5" /> README
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === 'analysis' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "text-zinc-400 hover:bg-zinc-800")}
            >
              <Activity className="w-3.5 h-3.5" /> AI Assessment {analysis && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block ml-1" />}
            </button>
            {history.length >= 2 && (
              <button
                onClick={() => setActiveTab('history')}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeTab === 'history' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "text-zinc-400 hover:bg-zinc-800")}
              >
                <ChartIcon className="w-3.5 h-3.5" /> Velocity
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyCloneCmd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono font-medium border border-zinc-700 transition-colors cursor-pointer"
            >
              {copiedClone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedClone ? 'Copied Clone Cmd' : 'Clone'}
            </button>
            <a 
              href={repo.html_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-lg font-bold text-xs transition-all shadow-md shadow-cyan-500/10"
            >
              <ExternalLink className="w-3.5 h-3.5" /> GitHub
            </a>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">

          {/* AI Trigger Banner if not yet analyzed */}
          {!analysis && (
            <div className="p-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-zinc-900 to-zinc-900 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-400" /> Gemini Deep Analysis
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">Evaluate architecture maturity, audience fit, integration effort, and alternatives.</p>
              </div>
              <button 
                onClick={handleDeepAnalysis}
                disabled={analyzing}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold rounded-xl text-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {analyzing ? "Analyzing..." : "Analyze Repo"}
              </button>
            </div>
          )}

          {analysisError && (
            <div className="p-4 bg-red-950/40 text-red-300 border border-red-800/50 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{analysisError}</span>
            </div>
          )}

          {/* AI Analysis Tab View */}
          {activeTab === 'analysis' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {analysis ? (
                <div className="p-6 rounded-2xl border border-cyan-500/20 bg-zinc-900/80 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> AI Architectural Summary
                    </span>
                    <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-[10px] font-mono">
                      Gemini 2.5 Flash
                    </span>
                  </div>

                  <p className="text-sm text-zinc-200 leading-relaxed">{analysis.whatItDoes}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Target Audience</div>
                      <div className="text-xs text-zinc-300 leading-relaxed">{analysis.targetAudience}</div>
                    </div>
                    <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800">
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Non-Target / Avoid If</div>
                      <div className="text-xs text-zinc-300 leading-relaxed">{analysis.nonTargetAudience}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block">Maturity</span>
                      <span className="font-semibold text-sm text-white capitalize">{analysis.maturity}</span>
                    </div>
                    <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block">Integration Effort</span>
                      <span className="font-semibold text-sm text-cyan-400 capitalize">{analysis.integrationEffort}</span>
                    </div>
                    <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest block">Alternatives</span>
                      <span className="font-semibold text-xs text-zinc-300 line-clamp-1">{analysis.alternatives?.join(', ') || 'None listed'}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Integration Reasoning</div>
                    <p className="text-xs text-zinc-400 font-mono bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">{analysis.integrationReasoning}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <p>No analysis generated yet. Click "Analyze Repo" to trigger AI assessment.</p>
                </div>
              )}
            </div>
          )}

          {/* Star History Tab View */}
          {activeTab === 'history' && history.length >= 2 && (
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-4 animate-in fade-in duration-300">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Star History (Local Snapshots)</h3>
              <div className="h-48 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                    <YAxis domain={['dataMin', 'dataMax']} stroke="#71717a" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} />
                    <Line type="monotone" dataKey="stars" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* README Tab View */}
          {activeTab === 'readme' && (
            <div className="animate-in fade-in duration-300">
              {loadingReadme ? (
                <div className="py-16 text-center text-zinc-500 animate-pulse">Loading README...</div>
              ) : readme ? (
                <div className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-cyan-400 prose-code:text-emerald-400 prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800/80 p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 text-zinc-300 text-sm leading-relaxed overflow-hidden">
                  <ReactMarkdown>{readme}</ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                  <p>No README content available for this repository.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
