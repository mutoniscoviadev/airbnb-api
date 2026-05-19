// Simple in-memory cache
interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Get data from cache — returns null if not found or expired
export const getCache = (key: string): unknown | null => {
  const entry = cache.get(key);

  if (!entry) return null;

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data;
};

// Set data in cache with TTL in seconds
export const setCache = (key: string, data: unknown, ttlSeconds: number): void => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

// Delete a specific cache key
export const deleteCache = (key: string): void => {
  cache.delete(key);
};

// Delete all cache keys that start with a prefix
export const deleteCacheByPrefix = (prefix: string): void => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};