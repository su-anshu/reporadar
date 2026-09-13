import { useState, useEffect, useRef } from 'react';
import { categories } from '../data/categories';
import { searchRepos } from '../services/github';
import { GitHubRepo } from '../types';
import { RepoCard } from '../components/RepoCard';
import { Search, Layers, Filter, Check, Loader2, RefreshCw } from 'lucide-react';

const POPULAR_LANGUAGES = [
  { label: 'All Languages', value: 'all' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Python', value: 'python' },
  { label: 'Rust', value: 'rust' },
  { label: 'Go', value: 'go' },
  { label: 'C++', value: 'c++' },
  { label: 'Java', value: 'java' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'Swift', value: 'swift' },
  { label: 'Zig', value: 'zig' }
];

const STAR_THRESHOLDS = [
  { label: 'Any Stars', value: '0' },
  { label: '> 100 Stars', value: '100' },
  { label: '> 500 Stars', value: '500' },
  { label: '> 1,000 Stars', value: '1000' },
  { label: '> 5,000 Stars', value: '5000' },
  { label: '> 10,000 Stars', value: '10000' }
];

export function CategoriesTab({ onOpenRepo }: { onOpenRepo: (r: GitHubRepo) => void }) {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [categorySearch, setCategorySearch] = useState('');
  const [repoSearch, setRepoSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [language, setLanguage] = useState('all');
  const [minStars, setMinStars] = useState('0');
  const [excludeArchived, setExcludeArchived] = useState(true);
  const [sort, setSort] = useState<'stars'|'updated'>('stars');
  
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Debounce repo search input to prevent rapid rate limit exhaustion
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(repoSearch.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [repoSearch]);

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase()) || 
    c.queries.some(q => q.toLowerCase().includes(categorySearch.toLowerCase()))
  );

  const buildQuery = () => {
    const cat = categories.find(c => c.id === activeCategory);
    if (!cat) return '';

    const topicNames = cat.queries.map(q => q.replace(/^topic:/, ''));
    let query = `(${topicNames.join(' OR ')}) in:topic`;

    if (debouncedSearch) {
      query = `(${query}) ${debouncedSearch}`;
    }
    if (language !== 'all') {
      query += ` language:${language}`;
    }
    if (parseInt(minStars, 10) > 0) {
      query += ` stars:>=${minStars}`;
    }
    if (excludeArchived) {
      query += ` archived:false`;
    }

    return query;
  };

  // Reset page and fetch whenever filters or category change
  useEffect(() => {
    let mounted = true;
    async function fetchInitial() {
      setLoading(true);
      setPage(1);
      const query = buildQuery();
      if (!query) return;

      try {
        const res = await searchRepos(query, sort, 'desc', 30, 1);
        if (mounted) {
          setRepos(res.items || []);
          setHasMore((res.items || []).length >= 30);
        }
      } catch (e) {
        console.error("Categories fetch error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchInitial();
    return () => { mounted = false; };
  }, [activeCategory, sort, debouncedSearch, language, minStars, excludeArchived]);

  // Load more pages
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const query = buildQuery();

    try {
      const res = await searchRepos(query, sort, 'desc', 30, nextPage);
      const newItems = res.items || [];
      setRepos(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const filteredNew = newItems.filter(r => !existingIds.has(r.id));
        return [...prev, ...filteredNew];
      });
      setPage(nextPage);
      setHasMore(newItems.length >= 30);
    } catch (e) {
      console.error("Load more error:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  const activeCatObj = categories.find(c => c.id === activeCategory);

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500 pb-12">
      
      {/* Category Sidebar */}
      <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-3 bg-zinc-900/40 border border-zinc-800/80 p-4 rounded-2xl h-fit">
        <div className="flex items-center justify-between px-1 mb-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" /> Categories ({categories.length})
          </h3>
        </div>

        {/* Category Quick Filter Input */}
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            value={categorySearch}
            onChange={e => setCategorySearch(e.target.value)}
            placeholder="Filter categories..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="max-h-[500px] overflow-y-auto space-y-1 pr-1">
          {filteredCategories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                activeCategory === c.id 
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <span>{c.name}</span>
            </button>
          ))}
          {filteredCategories.length === 0 && (
            <div className="text-xs text-zinc-500 p-3 text-center">No matching categories.</div>
          )}
        </div>
      </div>

      {/* Main Repos Grid */}
      <div className="flex-1 space-y-6">
        
        {/* Header Controls */}
        <div className="space-y-4 border-b border-zinc-800/80 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{activeCatObj?.name}</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Top open source projects tagged with {activeCatObj?.queries.map(q => `#${q.replace('topic:', '')}`).join(', ')}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Repo Keyword Search */}
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-500" />
                <input
                  type="text"
                  value={repoSearch}
                  onChange={e => setRepoSearch(e.target.value)}
                  placeholder="Search in category..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Sort Dropdown */}
              <select 
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-cyan-500/50 text-zinc-300 cursor-pointer"
              >
                <option value="stars">Most Stars</option>
                <option value="updated">Recently Updated</option>
              </select>
            </div>
          </div>

          {/* Faceted Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            <span className="text-zinc-500 flex items-center gap-1 font-mono text-[11px]">
              <Filter className="w-3 h-3 text-cyan-400" /> Filters:
            </span>

            {/* Language Filter */}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              {POPULAR_LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>

            {/* Stars Filter */}
            <select
              value={minStars}
              onChange={(e) => setMinStars(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              {STAR_THRESHOLDS.map(th => (
                <option key={th.value} value={th.value}>{th.label}</option>
              ))}
            </select>

            {/* Exclude Archived Toggle */}
            <button
              onClick={() => setExcludeArchived(!excludeArchived)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                excludeArchived
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300'
              }`}
            >
              {excludeArchived && <Check className="w-3 h-3 text-cyan-400" />}
              <span>Hide Archived</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
             {[1,2,3,4,5,6].map(i => (
               <div key={i} className="h-48 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 animate-pulse"></div>
             ))}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {repos.map(repo => (
                <RepoCard key={repo.id} repo={repo} onClick={onOpenRepo} />
              ))}
              {repos.length === 0 && (
                <div className="col-span-full py-16 text-center text-zinc-500 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                  <p>No repositories found for this category or filter criteria.</p>
                </div>
              )}
            </div>

            {/* Load More Pagination */}
            {hasMore && repos.length > 0 && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/30 rounded-xl text-xs font-semibold text-zinc-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      Loading more repositories...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                      Load More Repositories
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
