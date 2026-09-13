import { SearchResult, GitHubRepo, RateLimitState } from '../types';
import { getCached, setCached } from './cache';

let rateLimitState: RateLimitState | null = null;
let subscribers: ((state: RateLimitState | null) => void)[] = [];

export function subscribeToRateLimit(cb: (state: RateLimitState | null) => void) {
  subscribers.push(cb);
  cb(rateLimitState);
  return () => {
    subscribers = subscribers.filter(s => s !== cb);
  };
}

function updateRateLimit(headers: Headers) {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  if (limit && remaining && reset) {
    rateLimitState = {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10)
    };
    subscribers.forEach(cb => cb(rateLimitState));
  }
}

export function getGitHubToken(): string {
  return localStorage.getItem('githubToken') || '';
}

export function setGitHubToken(token: string) {
  localStorage.setItem('githubToken', token);
}

const queue: (() => Promise<void>)[] = [];
let activeRequests = 0;
const MAX_CONCURRENCY = 4;

async function processQueue() {
  if (activeRequests >= MAX_CONCURRENCY || queue.length === 0) return;
  const task = queue.shift();
  if (task) {
    activeRequests++;
    try {
      await task();
    } finally {
      activeRequests--;
      processQueue();
    }
  }
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  return new Promise((resolve, reject) => {
    const task = async () => {
      let attempt = 0;
      while (attempt <= retries) {
        try {
          if (rateLimitState && rateLimitState.remaining === 0 && rateLimitState.reset * 1000 > Date.now()) {
            throw new Error(`Rate limit exceeded. Resets at ${new Date(rateLimitState.reset * 1000).toLocaleTimeString()}`);
          }

          const token = getGitHubToken();
          const headers = new Headers(options.headers);
          headers.set('Accept', 'application/vnd.github.v3+json');
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }

          const res = await fetch(url, { ...options, headers });
          updateRateLimit(res.headers);

          if (res.status === 403 || res.status === 429) {
            const retryAfter = res.headers.get('retry-after');
            let waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
            if (res.headers.get('x-ratelimit-remaining') === '0') {
               const reset = res.headers.get('x-ratelimit-reset');
               if (reset) {
                 waitTime = (parseInt(reset, 10) * 1000) - Date.now();
               }
            }
            if (attempt < retries) {
              await new Promise(r => setTimeout(r, waitTime > 0 ? waitTime : 1000));
              attempt++;
              continue;
            } else {
               if (res.status === 403) throw new Error('GitHub Rate Limit Exceeded (403)');
               throw new Error(`GitHub API Error: ${res.status}`);
            }
          }

          if (!res.ok) {
            throw new Error(`GitHub API Error: ${res.status} ${await res.text()}`);
          }

          resolve(res);
          return;
        } catch (error) {
          if (attempt >= retries) {
            reject(error);
            return;
          }
          attempt++;
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
    };
    queue.push(task);
    processQueue();
  });
}

export async function searchRepos(
  query: string,
  sort: 'stars' | 'updated' | '' = '',
  order: 'desc' | 'asc' = 'desc',
  perPage = 30,
  page = 1
): Promise<SearchResult> {
  const cacheKey = `search_${query}_${sort}_${order}_${perPage}_${page}`;
  const cached = await getCached<SearchResult>(cacheKey, 30 * 60 * 1000); // 30 min
  if (cached) return cached;

  let url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`;
  if (sort) url += `&sort=${sort}&order=${order}`;

  const res = await fetchWithRetry(url);
  const data = await res.json();
  await setCached(cacheKey, data);
  return data;
}

export async function getRepo(owner: string, name: string): Promise<GitHubRepo> {
  const cacheKey = `repo_${owner}_${name}`;
  const cached = await getCached<GitHubRepo>(cacheKey, 6 * 60 * 60 * 1000); // 6 hours
  if (cached) return cached;

  const res = await fetchWithRetry(`https://api.github.com/repos/${owner}/${name}`);
  const data = await res.json();
  await setCached(cacheKey, data);
  return data;
}

export async function getReadme(owner: string, name: string): Promise<string> {
  const cacheKey = `readme_${owner}_${name}`;
  const cached = await getCached<string>(cacheKey, 24 * 60 * 60 * 1000); // 24 hours
  if (cached) return cached;

  try {
    const res = await fetchWithRetry(`https://api.github.com/repos/${owner}/${name}/readme`);
    const data = await res.json();
    if (data.content && data.encoding === 'base64') {
      // Decode base64, handling UTF-8 properly
      const binaryStr = atob(data.content);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const text = new TextDecoder('utf-8').decode(bytes);
      await setCached(cacheKey, text);
      return text;
    }
    return '';
  } catch (e) {
    return '';
  }
}
