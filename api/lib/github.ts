import { GitHubRepo, SearchResult } from '../../src/types';

export function getGitHubToken(): string {
  return process.env.GITHUB_TOKEN || '';
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  const token = getGitHubToken();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/vnd.github.v3+json');
  headers.set('User-Agent', 'RepoRadar-Backend');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, { ...options, headers });
      
      if (res.status === 403 || res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        let waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, waitTime > 0 ? waitTime : 1000));
          attempt++;
          continue;
        } else {
          throw new Error(`GitHub Rate Limit Exceeded: ${res.status}`);
        }
      }

      if (!res.ok) {
        throw new Error(`GitHub API Error: ${res.status} ${await res.text()}`);
      }

      return res;
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      attempt++;
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error('Fetch failed after retries');
}

export async function searchRepos(
  query: string,
  sort: 'stars' | 'updated' | '' = '',
  order: 'desc' | 'asc' = 'desc',
  perPage = 30,
  page = 1
): Promise<SearchResult> {
  let url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`;
  if (sort) url += `&sort=${sort}&order=${order}`;

  const res = await fetchWithRetry(url);
  return res.json() as Promise<SearchResult>;
}

export async function getRepo(owner: string, name: string): Promise<GitHubRepo> {
  const res = await fetchWithRetry(`https://api.github.com/repos/${owner}/${name}`);
  return res.json() as Promise<GitHubRepo>;
}

export async function getReadme(owner: string, name: string): Promise<string> {
  try {
    const res = await fetchWithRetry(`https://api.github.com/repos/${owner}/${name}/readme`);
    const data = await res.json();
    if (data.content && data.encoding === 'base64') {
      // Decode base64, handling UTF-8 properly in Node.js
      return Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString('utf8');
    }
    return '';
  } catch (error) {
    console.warn(`Failed to fetch README for ${owner}/${name}:`, error);
    return '';
  }
}
