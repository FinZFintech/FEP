const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = CACHE_TTL_MS
): Promise<T> {
  const now = Date.now();

  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > now) {
    return mem.data as T;
  }

  try {
    const data = await fetcher();
    memoryCache.set(key, { data, expiresAt: now + ttlMs });
    return data;
  } catch (error) {
    if (mem) return mem.data as T;
    throw error;
  }
}

export function clearCache(keyPrefix?: string) {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) memoryCache.delete(key);
  }
}
