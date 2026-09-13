import { useState, useEffect } from 'react';
import { skillsList, Skill } from '../data/skills';
import { searchRepos } from '../services/github';
import { convertReposToMCPs } from '../services/gemini';
import { Search, Terminal, Cpu, Check, ExternalLink, Sparkles, RefreshCw, Loader2, Zap } from 'lucide-react';

export function SkillsTab() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live fetching states
  const [mode, setMode] = useState<'curated' | 'live'>('curated');
  const [liveSkills, setLiveSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLiveSkills = async (force = false) => {
    if (!force && liveSkills.length > 0) return;
    setLoading(true);
    setError('');
    try {
      // Fetch top 24 repositories tagged with 'mcp'
      const res = await searchRepos('topic:mcp archived:false', 'stars', 'desc', 24);
      if (res.items && res.items.length > 0) {
        try {
          const parsedSkills = await convertReposToMCPs(res.items);
          setLiveSkills(parsedSkills);
        } catch (geminiErr) {
          // Graceful fallback: convert raw GitHub repos into Skill objects if Gemini key is missing
          const fallbackSkills: Skill[] = res.items.map(r => ({
            id: `mcp-${r.id}`,
            name: r.name,
            category: 'MCP Servers',
            description: r.description || 'Model Context Protocol tool on GitHub.',
            tags: r.topics?.length ? r.topics.slice(0, 4) : ['mcp', 'agent'],
            installCmd: `npx -y ${r.name.toLowerCase()}`,
            repoUrl: r.html_url
          }));
          setLiveSkills(fallbackSkills);
        }
      } else {
        throw new Error('No MCP repositories found on GitHub.');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch live trending MCP servers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'live') {
      fetchLiveSkills();
    }
  }, [mode]);

  const activeSkills = mode === 'curated' ? skillsList : liveSkills;

  const categories = ['all', ...Array.from(new Set(activeSkills.map(s => s.category)))];

  const filtered = activeSkills.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.description.toLowerCase().includes(search.toLowerCase()) ||
                          s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = activeCategory === 'all' || s.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const handleCopyInstall = (skill: Skill) => {
    const cmd = skill.installCmd || `npx -y @modelcontextprotocol/server-${skill.name.toLowerCase().replace(/\s+/g, '-')}`;
    navigator.clipboard.writeText(cmd);
    setCopiedId(skill.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleModeChange = (newMode: 'curated' | 'live') => {
    setMode(newMode);
    setActiveCategory('all');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Agent Skills & MCP Servers <Cpu className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Discover Model Context Protocol (MCP) tools, AI extensions, and agent integration packages.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search MCP servers & skills..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/80">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => handleModeChange('curated')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'curated' 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> Curated Showcase
          </button>
          <button
            onClick={() => handleModeChange('live')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'live' 
                ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Live Trending (GitHub + Gemini)
          </button>
        </div>

        {mode === 'live' && (
          <button
            onClick={() => fetchLiveSkills(true)}
            disabled={loading}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-zinc-800 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh Online Trends
          </button>
        )}
      </div>

      {/* Category Pills */}
      {!loading && !error && (
        <div className="flex flex-wrap items-center gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                activeCategory === cat 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Main Content View */}
      {loading ? (
        <div className="py-24 text-center text-zinc-500 flex flex-col items-center justify-center bg-zinc-900/10 rounded-2xl border border-zinc-900 border-dashed">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
          <p className="text-sm font-semibold text-zinc-300">Scanning GitHub for trending #mcp repositories...</p>
          <p className="text-xs text-zinc-500 mt-1.5 max-w-md px-4">Gemini is analyzing README documents, inferring installation packages, and organizing servers into categories in real-time.</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-950/20 text-red-300 border border-red-800/30 rounded-2xl text-xs flex flex-col gap-2 max-w-2xl mx-auto">
          <p className="font-bold text-sm text-red-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4" /> Failed to Compile Live Trends
          </p>
          <p className="text-zinc-400">{error}</p>
          <p className="text-[10px] text-zinc-500 mt-3 border-t border-zinc-900 pt-3">Please ensure your Gemini API Key is configured correctly in the Settings modal (top-right gear icon) and has search capabilities enabled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(skill => (
            <div 
              key={skill.id}
              className="bg-zinc-900/80 border border-zinc-800/80 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-cyan-500/5"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-white text-base line-clamp-1">{skill.name}</h3>
                  <span className="px-2 py-0.5 bg-zinc-800 text-cyan-400 text-[10px] font-mono rounded border border-zinc-700/50 shrink-0">
                    {skill.category}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed mb-4 h-16 line-clamp-3">{skill.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {skill.tags.slice(0, 4).map(t => (
                    <span key={t} className="px-2 py-0.5 bg-zinc-950 text-zinc-400 text-[10px] font-mono rounded border border-zinc-800">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleCopyInstall(skill)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-mono border border-zinc-800 transition-colors cursor-pointer"
                >
                  {copiedId === skill.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5 text-cyan-400" />}
                  {copiedId === skill.id ? 'Copied Cmd' : 'Copy Install'}
                </button>

                <a
                  href={skill.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                  title="View GitHub Repo"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-zinc-500 bg-zinc-900/20 rounded-2xl border border-zinc-800/50">
              No MCP servers found for your current search filter or category.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
