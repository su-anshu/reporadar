import { useState, useEffect } from 'react';
import { categories } from '../data/categories';
import { searchRepos } from '../services/github';
import { GitHubRepo } from '../types';
import { RepoCard } from '../components/RepoCard';
import { Search, Filter, Layers, SlidersHorizontal } from 'lucide-react';

export function CategoriesTab({ onOpenRepo }: { onOpenRepo: (r: GitHubRepo) => void }) {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [categorySearch, setCategorySearch] = useState('');
  const [repoSearch, setRepoSearch] = useState('');
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<'stars'|'updated'>('stars');

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(categorySearch.toLowerCase()) || 
    c.queries.some(q => q.toLowerCase().includes(categorySearch.toLowerCase()))
  );

  useEffect(() => {
    let mounted = true;
    async function fetchCat() {
      setLoading(true);
      const cat = categories.find(c => c.id === activeCategory);
      if (!cat) return;
      
      try {
        const topicNames = cat.queries.map(q => q.replace(/^topic:/, ''));
        let query = `(${topicNames.join(' OR ')}) in:topic`;
        if (repoSearch.trim()) {
          query = `(${query}) ${repoSearch.trim()}`;
        }
        const res = await searchRepos(query, sort, 'desc', 30);
        if (mounted) setRepos(res.items);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchCat();
    return () => { mounted = false; };
  }, [activeCategory, sort, repoSearch]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
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

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
             {[1,2,3,4,5,6].map(i => (
               <div key={i} className="h-48 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 animate-pulse"></div>
             ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {repos.map(repo => (
              <RepoCard key={repo.id} repo={repo} onClick={onOpenRepo} />
            ))}
            {repos.length === 0 && (
              <div className="col-span-full py-16 text-center text-zinc-500 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                <p>No repositories found for this category or search filter.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
