import { useState } from 'react';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { RepoDetail } from './components/RepoDetail';
import { TodayTab } from './tabs/Today';
import { CategoriesTab } from './tabs/Categories';
import { RisingTab } from './tabs/Rising';
import { AskTab } from './tabs/Ask';
import { SkillsTab } from './tabs/Skills';
import { FeedTab } from './tabs/Feed';
import { GitHubRepo } from './types';
import { Flame, Layers, TrendingUp, Sparkles, Cpu, Newspaper, Radar } from 'lucide-react';
import { cn } from './lib/utils';

export function App() {
  const [activeTab, setActiveTab] = useState<'today' | 'categories' | 'rising' | 'ask' | 'skills' | 'feed'>('today');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const tabs = [
    { id: 'today', label: 'Today', icon: Flame },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'rising', label: 'Rising Velocity', icon: TrendingUp },
    { id: 'ask', label: 'Ask AI', icon: Sparkles },
    { id: 'skills', label: 'MCP & Skills', icon: Cpu },
    { id: 'feed', label: 'Tech Feed', icon: Newspaper },
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-zinc-950">
      
      {/* Top Header */}
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Tab Navigation */}
      <nav className="border-b border-zinc-800/80 bg-zinc-950/60 sticky top-[57px] z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto scrollbar-none py-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-cyan-400" : "text-zinc-500")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-12">
        {activeTab === 'today' && <TodayTab onOpenRepo={setSelectedRepo} />}
        {activeTab === 'categories' && <CategoriesTab onOpenRepo={setSelectedRepo} />}
        {activeTab === 'rising' && <RisingTab onOpenRepo={setSelectedRepo} />}
        {activeTab === 'ask' && <AskTab onOpenRepo={setSelectedRepo} />}
        {activeTab === 'skills' && <SkillsTab />}
        {activeTab === 'feed' && <FeedTab onOpenRepo={setSelectedRepo} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 px-6 bg-zinc-950 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-zinc-400">
            <Radar className="w-4 h-4 text-cyan-400" /> RepoRadar — AI-Powered GitHub Intelligence
          </div>
          <p>© {new Date().getFullYear()} RepoRadar. Built with React, Vite, Tailwind CSS, & Google Gemini 2.5.</p>
        </div>
      </footer>

      {/* Modals & Drawers */}
      {selectedRepo && <RepoDetail repo={selectedRepo} onClose={() => setSelectedRepo(null)} />}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

    </div>
  );
}

export default App;
