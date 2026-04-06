interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > entry.ttl) {
    store.delete(key)
    return null
  }
  return entry.data as T
}

export function setCached<T>(key: string, data: T, ttlMs = 60_000): void {
  store.set(key, { data, timestamp: Date.now(), ttl: ttlMs })
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) { store.clear(); return }
  for (const key of store.keys()) {
    if (key.includes(pattern)) store.delete(key)
  }
}

export async function cachedGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 60_000
): Promise<T> {
  const hit = getCached<T>(key)
  if (hit !== null) return hit
  const data = await fetcher()
  setCached(key, data, ttlMs)
  return data
}
