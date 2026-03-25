export interface FileCacheConfig {
  /** Directory to store cache files. Default: '.cache' */
  location?: string;
  /** Default TTL in minutes. Default: 60 */
  ttl?: number;
  /** Isolates entries under a subdirectory of location. Default: null */
  namespace?: string | null;
  /** Evicts the oldest entry when this limit is reached. Default: null (unlimited) */
  maxEntries?: number | null;
}

export interface FileCacheStats {
  hits: number;
  misses: number;
  expired: number;
  sets: number;
  removes: number;
  errors: number;
}

declare class FileCache {
  constructor(config?: FileCacheConfig | string);

  /** Store a JSON-serializable value. Returns false on error. */
  set(key: string, value: unknown, ttl?: number): Promise<boolean>;

  /** Retrieve a cached value. Returns undefined if missing, expired, or on error. */
  get<T = unknown>(key: string): Promise<T | undefined>;

  /** Remove an entry by key. Returns false if not found or on error. */
  remove(key: string): Promise<boolean>;

  /** Remove all entries (scoped to namespace if set). */
  removeAll(): Promise<boolean>;

  /** Return a snapshot of cache statistics. */
  stats(): FileCacheStats;
}

export = FileCache;
