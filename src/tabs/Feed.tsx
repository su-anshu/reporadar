import { useState, useEffect } from 'react';
import { Loader2, Newspaper, ExternalLink, RefreshCw, Flame, Sparkles } from 'lucide-react';
import { getClient, getSelectedGeminiModel } from '../services/gemini';
import { Type } from '@google/genai';

function cleanJsonText(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return cleaned.trim();
}

import { GitHubRepo } from '../types';

export function FeedTab({ onOpenRepo }: { onOpenRepo?: (r: GitHubRepo) => void }) {
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchFeed = async () => {
    setLoading(true);
    setError('');
    try {
      const ai = getClient();

      const prompt = `Search the web for the latest developer news from the last 7 days.
      Focus on Hacker News, Reddit (r/programming, r/webdev, r/LocalLLaMA), dev.to, and major framework blogs.
      Return a JSON array of news items.
      Each item MUST have:
      - title: string
      - summary: string (2-3 sentences)
      - category: "Trending Discussions" | "Dev Blogs & Releases" | "AI Ecosystem"
      - citation: string (the URL)
      Ensure you output exactly 9 distinct high-quality items.`;

      const response = await ai.models.generateContent({
        model: getSelectedGeminiModel(),
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                category: { type: Type.STRING },
                citation: { type: Type.STRING }
              },
              required: ["title", "summary", "category", "citation"]
            }
          }
        }
      });

      const text = cleanJsonText(response.text || '');
      const parsed = JSON.parse(text || "[]");
      setFeed(Array.isArray(parsed) ? parsed : []);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to fetch developer feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (feed.length === 0 && !loading && !error) {
      fetchFeed();
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">Developer Intelligence Feed</h1>
          </div>
          <p className="text-zinc-400 text-sm">Real-time grounded news distilled from Hacker News, Reddit, GitHub releases, and engineering blogs.</p>
        </div>
        <button 
          onClick={fetchFeed}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/10 disabled:opacity-50 cursor-pointer shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {feed.length ? 'Refresh Feed' : 'Load News Feed'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 text-red-300 border border-red-800/50 rounded-2xl text-sm flex flex-col gap-2">
          <p className="font-semibold text-red-200">Unable to generate live search feed:</p>
          <p className="text-xs text-red-400 font-mono">{error}</p>
          <button 
            onClick={fetchFeed} 
            className="self-start mt-2 px-3 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-200 rounded text-xs border border-red-700/50 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="py-24 text-center text-zinc-400 flex flex-col items-center justify-center bg-zinc-900/30 border border-zinc-800/60 rounded-2xl">
           <div className="relative mb-4">
             <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
             <Flame className="w-5 h-5 text-cyan-400 absolute inset-0 m-auto" />
           </div>
           <p className="font-medium text-zinc-200 text-base">Sweeping the developer web...</p>
           <p className="text-xs text-zinc-500 mt-1">Grounding search results via Gemini Google Search</p>
        </div>
      )}

      {!loading && feed.length > 0 && (
        <div className="space-y-10">
           {['Trending Discussions', 'Dev Blogs & Releases', 'AI Ecosystem'].map(cat => {
             const items = feed.filter(f => f.category === cat);
             if (!items.length) return null;
             return (
               <div key={cat} className="space-y-4">
                 <div className="flex items-center gap-3">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">{cat}</h3>
                   <div className="h-px bg-zinc-800 flex-1" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                   {items.map((item, i) => (
                     <div key={i} className="group p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-900 hover:border-cyan-500/40 transition-all flex flex-col justify-between shadow-sm hover:shadow-md hover:shadow-cyan-500/5">
                       <div className="space-y-2.5">
                         <h4 className="font-semibold text-base text-zinc-100 group-hover:text-cyan-300 transition-colors leading-snug">{item.title}</h4>
                         <p className="text-xs text-zinc-400 leading-relaxed line-clamp-4">{item.summary}</p>
                       </div>
                       <div className="pt-4 mt-4 border-t border-zinc-800/60 flex items-center justify-between">
                         <a 
                           href={item.citation} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                         >
                           <ExternalLink className="w-3.5 h-3.5" /> Read Source
                         </a>
                         <span className="text-[10px] text-zinc-500 font-mono">Live Grounded</span>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             );
           })}
        </div>
      )}
    </div>
  );
}
