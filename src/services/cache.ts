import { get, set } from 'idb-keyval';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_PREFIX = 'rr_cache_';

export async function getCached<T>(key: string, ttlMs: number): Promise<T | null> {
  const entry = await get<CacheEntry<T>>(`${CACHE_PREFIX}${key}`);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > ttlMs) {
    return null; // Expired
  }
  return entry.data;
}

export async function setCached<T>(key: string, data: T): Promise<void> {
  await set(`${CACHE_PREFIX}${key}`, {
    data,
    timestamp: Date.now()
  });
}

export async function clearCachePrefix(prefix: string = ''): Promise<void> {
  // idb-keyval doesn't easily let us list keys without a custom store or iterating, 
  // but we can implement a basic tracking if needed, or rely on expiration.
  // For simplicity, we just won't clear by prefix aggressively, rely on TTL.
}
