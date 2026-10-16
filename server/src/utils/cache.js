// server/src/utils/cache.js
import { logger } from '../config/logger.js';

class MemoryCacheAdapter {
  constructor() {
    this.store = new Map();
  }

  /**
   * Retrieves a value from the cache if not expired.
   * @param {string} key
   * @returns {any | null}
   */
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Stores a value in the cache with a Time-To-Live in seconds.
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds
   */
  set(key, value, ttlSeconds = 60) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Deletes a specific cache entry.
   * @param {string} key
   */
  del(key) {
    this.store.delete(key);
  }

  /**
   * Clears keys matching a prefix or all keys.
   * @param {string} [prefix]
   */
  flush(prefix) {
    if (!prefix) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Returns current cache size.
   */
  size() {
    return this.store.size;
  }
}

// Global cache instance (adapter design allows drop-in RedisCacheAdapter later)
export const cache = new MemoryCacheAdapter();

/**
 * Express middleware for hot read endpoints.
 * Emits HTTP caching headers (Cache-Control, Stale-While-Revalidate, X-Cache).
 *
 * @param {number} [ttlSeconds=60] - Cache validity duration in seconds
 * @param {string} [prefix='catalog'] - Cache key namespace
 */
export const cacheMiddleware = (ttlSeconds = 60, prefix = 'catalog') => {
  return (req, res, next) => {
    // Only cache safe idempotent GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${prefix}:${req.originalUrl}`;
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=30`);
      return res.status(200).json(cachedResponse);
    }

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=30`);

    // Intercept res.json to store the response in cache upon 200 OK
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200 && body && body.success !== false) {
        try {
          cache.set(cacheKey, body, ttlSeconds);
        } catch (err) {
          logger.warn({ err, cacheKey }, 'Failed to write to cache store');
        }
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Invalidate all catalog-related cached items (e.g. after product or category mutation).
 */
export const invalidateCatalogCache = () => {
  cache.flush('catalog');
};
