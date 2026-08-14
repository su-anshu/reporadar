import { useState, memo } from 'react';
import { Star, GitFork, Copy, Check, ExternalLink, TrendingUp, AlertCircle } from 'lucide-react';
import { GitHubRepo } from '../types';
import { formatStars, timeAgo } from '../lib/utils';

interface Props {
  repo: GitHubRepo;
  onClick: (repo: GitHubRepo) => void;
  momentum?: number | null;
  velocityMsg?: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: 'bg-cyan-400',
  JavaScript: 'bg-yellow-400',
  Python: 'bg-blue-400',
  Rust: 'bg-amber-500',
  Go: 'bg-teal-400',
  'C++': 'bg-pink-500',
  C: 'bg-gray-400',
  Java: 'bg-red-400',
  HTML: 'bg-orange-500',
  CSS: 'bg-purple-400',
  Ruby: 'bg-red-500',
  PHP: 'bg-indigo-400',
  Swift: 'bg-orange-400',
  Kotlin: 'bg-purple-500',
  Dart: 'bg-sky-400',
  Zig: 'bg-amber-400',
  Shell: 'bg-emerald-400'
};

export const RepoCard = memo(function RepoCard({ repo, onClick, momentum, velocityMsg }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(repo.html_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langColor = repo.language && LANGUAGE_COLORS[repo.language] ? LANGUAGE_COLORS[repo.language] : 'bg-zinc-500';

  return (
    <div 
      onClick={() => onClick(repo)}
      className="group bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 hover:border-cyan-500/50 hover:bg-zinc-900 transition-all duration-200 cursor-pointer relative flex flex-col flex-shrink-0 w-[300px] sm:w-[350px] md:w-auto h-full shadow-lg shadow-black/20 hover:shadow-cyan-500/5 hover:-translate-y-0.5"
    >
      {/* Top row with Owner & Avatar */}
      <div className="flex items-start gap-3 mb-3">
        <img 
          src={repo.owner.avatar_url} 
          alt={repo.owner.login} 
          className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/50 object-cover shrink-0" 
          loading="lazy" 
        />
        <div className="flex-1 min-w-0 pr-6">
          <div className="text-zinc-100 font-bold text-sm truncate group-hover:text-cyan-300 transition-colors">
            {repo.name}
          </div>
          <div className="text-zinc-500 text-xs truncate font-mono">
            {repo.owner.login}
          </div>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopyLink}
          title="Copy GitHub Link"
          className="absolute top-4 right-4 p-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4 flex-1">
        {repo.description || "No description provided."}
      </p>

      {/* Topics */}
      {repo.topics && repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 overflow-hidden max-h-[24px]">
          {repo.topics.slice(0, 3).map(t => (
            <span key={t} className="px-2 py-0.5 bg-zinc-800/80 text-zinc-300 text-[10px] font-mono rounded-md border border-zinc-700/50 whitespace-nowrap">
              #{t}
            </span>
          ))}
          {repo.topics.length > 3 && (
            <span className="text-[10px] text-zinc-500 font-mono py-0.5 px-1">
              +{repo.topics.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer Metrics */}
      <div className="flex items-center justify-between pt-3.5 border-t border-zinc-800/80 mt-auto">
        <div className="flex items-center gap-3.5 text-xs font-mono">
          <span className="text-zinc-200 font-semibold flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" /> {formatStars(repo.stargazers_count)}
          </span>
          <span className="text-zinc-400 flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5 text-zinc-500" /> {formatStars(repo.forks_count)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {velocityMsg ? (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold rounded-md">
              <TrendingUp className="w-3 h-3" /> {velocityMsg}
            </span>
          ) : repo.language ? (
            <span className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-mono">
              <span className={`w-2 h-2 rounded-full ${langColor}`} />
              {repo.language}
            </span>
          ) : (
            <span className="text-zinc-500 text-[10px] font-mono">{timeAgo(repo.pushed_at)}</span>
          )}
        </div>
      </div>
    </div>
  );
});
