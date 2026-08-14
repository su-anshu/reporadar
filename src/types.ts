export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  open_issues_count: number;
  license: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
  archived: boolean;
}

export interface SearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

export interface RateLimitState {
  limit: number;
  remaining: number;
  reset: number; // timestamp in seconds
}

export interface AppSettings {
  githubToken: string;
  theme: 'dark' | 'light' | 'system';
}

export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  repos: Record<string, {
    stars: number;
    forks: number;
  }>;
}

export interface AskStep {
  stage: 'intent' | 'search' | 'rank' | 'evaluate';
  status: 'pending' | 'success' | 'error';
  message: string;
}

export interface AskResult {
  explanation: string;
  repos: GitHubRepo[];
}
