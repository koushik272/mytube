// server/src/utils/cache.ts - In-Memory High-Performance TTL Cache
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export class TTLCache {
  private store = new Map<string, CacheEntry<any>>();

  constructor() {
    // Periodically sweep expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.expiry) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000).unref();
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const youtubeCache = new TTLCache();
