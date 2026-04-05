/**
 * Cache Manager Utility - Enhanced Version
 * 
 * This utility provides in-memory caching for API responses to improve performance
 * and reduce the number of requests to the external API.
 */

const { API_CONFIG } = require('../config');
const { logger } = require('./liveLogger');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const CACHE_REDIS_ENABLED = String(process.env.CACHE_REDIS_ENABLED || 'false').toLowerCase() === 'true';
const REDIS_URL = process.env.REDIS_URL || '';
const CACHE_REDIS_NAMESPACE = process.env.CACHE_REDIS_NAMESPACE || 'stock_sense_backend';
const REDIS_CONNECT_TIMEOUT_MS = toPositiveInt(process.env.REDIS_CONNECT_TIMEOUT_MS, 3000);

let createRedisClient = null;
try {
  ({ createClient: createRedisClient } = require('redis'));
} catch (error) {
  createRedisClient = null;
}

// In-memory cache store with enhanced capabilities
const cacheStore = new Map();

// Cache hit/miss statistics
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  clears: 0
};

/**
 * Enhanced Cache Manager Class
 */
class CacheManager {
  constructor(defaultTtl = API_CONFIG.CACHE_DURATION) {
    this.defaultTtl = defaultTtl;
    this.maxSize = toPositiveInt(process.env.CACHE_MAX_SIZE, 10000); // Maximum number of items
    this.warningThreshold = 0.8; // Warn when cache is 80% full

    this.redisEnabled = CACHE_REDIS_ENABLED;
    this.redisUrl = REDIS_URL;
    this.redisNamespace = CACHE_REDIS_NAMESPACE;
    this.redisClient = null;
    this.redisConnectPromise = null;
    this.redisState = {
      enabled: this.redisEnabled,
      connected: false,
      available: Boolean(createRedisClient),
      lastError: null,
    };

    if (this.redisEnabled) {
      this._startRedisConnect();
    }
  }

  /**
   * Generate a cache key from the endpoint and params
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {string} Cache key
   */
  generateKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    return `${endpoint}:${JSON.stringify(sortedParams)}`;
  }

  _redisDataKey(key) {
    return `${this.redisNamespace}:data:${key}`;
  }

  _redisMetaKey(key) {
    return `${this.redisNamespace}:meta:${key}`;
  }

  _redisTagKey(tag) {
    return `${this.redisNamespace}:tag:${tag}`;
  }

  _normalizeTags(tags = []) {
    if (!Array.isArray(tags)) {
      return [];
    }

    return [...new Set(tags.map((tag) => String(tag || '').trim()).filter(Boolean))];
  }

  _withTimeout(promise, timeoutMs) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Redis connect timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  _rememberRedisError(error, message = 'Redis cache operation failed, using in-memory fallback') {
    this.redisState.connected = false;
    this.redisState.lastError = error?.message || String(error);
    logger.warn(`${message}: ${this.redisState.lastError}`);
  }

  _startRedisConnect() {
    if (!this.redisEnabled) {
      return Promise.resolve(null);
    }

    if (!createRedisClient) {
      this.redisState.available = false;
      this.redisState.lastError = 'redis package is not installed';
      logger.warn('CACHE_REDIS_ENABLED=true but redis package not found; using in-memory cache fallback');
      return Promise.resolve(null);
    }

    if (!this.redisUrl) {
      this.redisState.lastError = 'REDIS_URL is not configured';
      logger.warn('CACHE_REDIS_ENABLED=true but REDIS_URL is empty; using in-memory cache fallback');
      return Promise.resolve(null);
    }

    if (this.redisClient && this.redisClient.isOpen) {
      this.redisState.connected = true;
      this.redisState.lastError = null;
      return Promise.resolve(this.redisClient);
    }

    if (this.redisConnectPromise) {
      return this.redisConnectPromise;
    }

    try {
      this.redisClient = createRedisClient({
        url: this.redisUrl,
        socket: {
          connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
        },
      });

      this.redisClient.on('error', (error) => {
        this._rememberRedisError(error, 'Redis client emitted an error');
      });

      this.redisConnectPromise = this._withTimeout(
        this.redisClient.connect(),
        REDIS_CONNECT_TIMEOUT_MS + 500
      )
        .then(() => {
          this.redisState.connected = true;
          this.redisState.lastError = null;
          logger.info('Redis cache connected');
          return this.redisClient;
        })
        .catch((error) => {
          this._rememberRedisError(error, 'Unable to connect to Redis');
          return null;
        })
        .finally(() => {
          this.redisConnectPromise = null;
        });

      return this.redisConnectPromise;
    } catch (error) {
      this._rememberRedisError(error, 'Unable to initialize Redis client');
      return Promise.resolve(null);
    }
  }

  async _ensureRedisClient() {
    if (!this.redisEnabled) {
      return null;
    }

    if (this.redisClient && this.redisClient.isOpen) {
      this.redisState.connected = true;
      return this.redisClient;
    }

    const client = await this._startRedisConnect();
    return client && client.isOpen ? client : null;
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached data or null if not found/expired
   */
  get(key) {
    if (!cacheStore.has(key)) {
      stats.misses++;
      return null;
    }

    const cachedItem = cacheStore.get(key);
    const now = Date.now();

    // Check if cache has expired
    if (cachedItem.expiry < now) {
      this.delete(key);
      stats.misses++;
      return null;
    }

    // Update access information for LRU
    cachedItem.lastAccessed = now;
    cachedItem.accessCount = (cachedItem.accessCount || 0) + 1;
    
    stats.hits++;
    return cachedItem.data;
  }

  /**
   * Get item with Redis fallback support.
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached data or null
   */
  async getAsync(key) {
    const localHit = this.get(key);
    if (localHit !== null) {
      return localHit;
    }

    const client = await this._ensureRedisClient();
    if (!client) {
      return null;
    }

    try {
      const serialized = await client.get(this._redisDataKey(key));
      if (!serialized) {
        return null;
      }

      const payload = JSON.parse(serialized);
      const ttlMs = toPositiveInt(payload?.ttlMs, this.defaultTtl);
      this.set(key, payload?.data, ttlMs, {
        tags: this._normalizeTags(payload?.tags),
        priority: payload?.priority || 'normal',
      });

      // Local miss was already counted by get(); offset it and count as a hit.
      stats.misses = Math.max(0, stats.misses - 1);
      stats.hits++;

      return payload?.data ?? null;
    } catch (error) {
      this._rememberRedisError(error);
      return null;
    }
  }

  /**
   * Set item in cache with enhanced features
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   * @param {Object} options - Additional options
   */
  set(key, data, ttl = this.defaultTtl, options = {}) {
    const now = Date.now();
    const expiry = now + ttl;
    
    // Check cache size and perform cleanup if needed
    if (cacheStore.size >= this.maxSize) {
      this._evictLRU();
    }
    
    // Calculate data size for monitoring
    const dataSize = this._calculateSize(data);
    
    const cacheItem = {
      data,
      expiry,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      size: dataSize,
      ttl,
      tags: options.tags || [],
      priority: options.priority || 'normal' // low, normal, high
    };
    
    cacheStore.set(key, cacheItem);
    stats.sets++;
    
    // Warn if cache is getting full
    if (cacheStore.size > this.maxSize * this.warningThreshold) {
      logger.warn(`Cache is ${Math.round((cacheStore.size / this.maxSize) * 100)}% full`);
    }
  }

  /**
   * Set item with Redis write-through support.
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   * @param {Object} options - Additional options
   */
  async setAsync(key, data, ttl = this.defaultTtl, options = {}) {
    const normalizedTags = this._normalizeTags(options.tags);
    this.set(key, data, ttl, {
      ...options,
      tags: normalizedTags,
    });

    const client = await this._ensureRedisClient();
    if (!client) {
      return;
    }

    const ttlMs = toPositiveInt(ttl, this.defaultTtl);
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));

    try {
      const payload = JSON.stringify({
        data,
        ttlMs,
        tags: normalizedTags,
        priority: options.priority || 'normal',
      });

      await client.setEx(this._redisDataKey(key), ttlSeconds, payload);
      await client.setEx(this._redisMetaKey(key), ttlSeconds, JSON.stringify({ tags: normalizedTags }));

      if (normalizedTags.length > 0) {
        for (const tag of normalizedTags) {
          const tagKey = this._redisTagKey(tag);
          await client.sAdd(tagKey, key);
          await client.expire(tagKey, ttlSeconds);
        }
      }
    } catch (error) {
      this._rememberRedisError(error);
    }
  }

  /**
   * Delete item from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    const deleted = cacheStore.delete(key);
    if (deleted) {
      stats.deletes++;
    }
    return deleted;
  }

  /**
   * Delete cache entry from both local cache and Redis.
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} true when local delete succeeds
   */
  async deleteAsync(key) {
    const localDeleted = this.delete(key);
    const client = await this._ensureRedisClient();

    if (!client) {
      return localDeleted;
    }

    try {
      const metaRaw = await client.get(this._redisMetaKey(key));
      const tags = this._normalizeTags(JSON.parse(metaRaw || '{}')?.tags || []);

      await client.del(this._redisDataKey(key), this._redisMetaKey(key));

      if (tags.length > 0) {
        for (const tag of tags) {
          await client.sRem(this._redisTagKey(tag), key);
        }
      }
    } catch (error) {
      this._rememberRedisError(error);
    }

    return localDeleted;
  }

  /**
   * Clear all items from cache
   * @param {string} pattern - Optional pattern to match keys
   */
  clear(pattern = null) {
    if (pattern) {
      // Clear items matching pattern
      const regex = new RegExp(pattern);
      let deletedCount = 0;
      
      cacheStore.forEach((value, key) => {
        if (regex.test(key)) {
          cacheStore.delete(key);
          deletedCount++;
        }
      });
      
      console.log(`Cleared ${deletedCount} cache items matching pattern: ${pattern}`);
    } else {
      // Clear all items
      cacheStore.clear();
      stats.clears++;
    }
  }

  /**
   * Clear local cache and matching Redis cache keys.
   * @param {string|null} pattern - Optional regex pattern
   */
  async clearAsync(pattern = null) {
    this.clear(pattern);

    const client = await this._ensureRedisClient();
    if (!client) {
      return;
    }

    try {
      if (!pattern) {
        const keysToDelete = [];
        for await (const key of client.scanIterator({
          MATCH: `${this.redisNamespace}:*`,
          COUNT: 200,
        })) {
          keysToDelete.push(key);
        }

        if (keysToDelete.length > 0) {
          await client.del(...keysToDelete);
        }
        return;
      }

      const regex = new RegExp(pattern);
      const keysToDelete = [];

      for await (const redisKey of client.scanIterator({
        MATCH: `${this.redisNamespace}:data:*`,
        COUNT: 200,
      })) {
        const cacheKey = redisKey.replace(`${this.redisNamespace}:data:`, '');
        if (regex.test(cacheKey)) {
          keysToDelete.push(cacheKey);
        }
      }

      for (const key of keysToDelete) {
        await this.deleteAsync(key);
      }
    } catch (error) {
      this._rememberRedisError(error);
    }
  }

  /**
   * Clear items by tags
   * @param {string|Array} tags - Tags to clear
   */
  clearByTags(tags) {
    const targetTags = Array.isArray(tags) ? tags : [tags];
    let deletedCount = 0;
    
    cacheStore.forEach((value, key) => {
      if (value.tags && value.tags.some(tag => targetTags.includes(tag))) {
        cacheStore.delete(key);
        deletedCount++;
      }
    });
    
    console.log(`Cleared ${deletedCount} cache items with tags: ${targetTags.join(', ')}`);
  }

  /**
   * Clear cache entries by tags in local memory and Redis.
   * @param {string|Array<string>} tags - Tags to clear
   */
  async clearByTagsAsync(tags) {
    const targetTags = this._normalizeTags(Array.isArray(tags) ? tags : [tags]);
    if (targetTags.length === 0) {
      return;
    }

    this.clearByTags(targetTags);

    const client = await this._ensureRedisClient();
    if (!client) {
      return;
    }

    try {
      const keysToDelete = new Set();

      for (const tag of targetTags) {
        const members = await client.sMembers(this._redisTagKey(tag));
        for (const key of members) {
          keysToDelete.add(key);
        }
      }

      for (const key of keysToDelete) {
        await this.deleteAsync(key);
      }

      if (targetTags.length > 0) {
        const tagKeys = targetTags.map((tag) => this._redisTagKey(tag));
        await client.del(...tagKeys);
      }
    } catch (error) {
      this._rememberRedisError(error);
    }
  }

  /**
   * Get enhanced cache stats
   * @returns {Object} Cache statistics
   */
  getStats() {
    const now = Date.now();
    let totalItems = 0;
    let expiredItems = 0;
    let validItems = 0;
    let totalSize = 0;
    let avgAccessCount = 0;
    let priorityCount = { low: 0, normal: 0, high: 0 };

    cacheStore.forEach((value) => {
      totalItems++;
      totalSize += value.size || 0;
      avgAccessCount += value.accessCount || 0;
      priorityCount[value.priority] = (priorityCount[value.priority] || 0) + 1;
      
      if (value.expiry < now) {
        expiredItems++;
      } else {
        validItems++;
      }
    });

    return {
      totalItems,
      expiredItems,
      validItems,
      maxSize: this.maxSize,
      utilizationPercent: Math.round((totalItems / this.maxSize) * 100),
      totalSizeBytes: totalSize,
      averageSizeBytesPerItem: totalItems > 0 ? Math.round(totalSize / totalItems) : 0,
      averageAccessCount: totalItems > 0 ? Math.round(avgAccessCount / totalItems) : 0,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      hitRate: stats.hits + stats.misses > 0 ? 
        Math.round((stats.hits / (stats.hits + stats.misses)) * 100) : 0,
      operations: stats,
      priorityDistribution: priorityCount,
      redis: {
        enabled: this.redisEnabled,
        connected: this.redisState.connected,
        available: this.redisState.available,
        namespace: this.redisNamespace,
        lastError: this.redisState.lastError,
      },
    };
  }

  /**
   * Clean expired items from cache
   */
  cleanExpired() {
    const now = Date.now();
    let cleanedCount = 0;
    
    cacheStore.forEach((value, key) => {
      if (value.expiry < now) {
        this.delete(key);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} expired cache items`);
    }
    
    return cleanedCount;
  }

  /**
   * Evict least recently used items
   * @private
   */
  _evictLRU() {
    // Sort by last accessed time and priority
    const entries = Array.from(cacheStore.entries())
      .sort((a, b) => {
        // First sort by priority (high priority stays longer)
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b[1].priority] - priorityOrder[a[1].priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by last accessed time
        return a[1].lastAccessed - b[1].lastAccessed;
      });
    
    // Remove the least recently used 10% of items
    const itemsToRemove = Math.ceil(this.maxSize * 0.1);
    for (let i = 0; i < itemsToRemove && entries.length > 0; i++) {
      const [key] = entries[i];
      this.delete(key);
    }
    
    console.log(`Evicted ${itemsToRemove} LRU cache items`);
  }

  /**
   * Calculate approximate size of data
   * @private
   */
  _calculateSize(data) {
    try {
      return JSON.stringify(data).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Refresh cache item (extend TTL)
   * @param {string} key - Cache key
   * @param {number} additionalTtl - Additional TTL in milliseconds
   */
  refresh(key, additionalTtl = null) {
    if (cacheStore.has(key)) {
      const item = cacheStore.get(key);
      const ttlToAdd = additionalTtl || item.ttl;
      item.expiry = Date.now() + ttlToAdd;
      item.lastAccessed = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Check if key exists in cache (without affecting access time)
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    if (!cacheStore.has(key)) return false;
    
    const cachedItem = cacheStore.get(key);
    return cachedItem.expiry > Date.now();
  }

  /**
   * Check if key exists in local cache or Redis.
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async hasAsync(key) {
    if (this.has(key)) {
      return true;
    }

    const client = await this._ensureRedisClient();
    if (!client) {
      return false;
    }

    try {
      const exists = await client.exists(this._redisDataKey(key));
      return exists === 1;
    } catch (error) {
      this._rememberRedisError(error);
      return false;
    }
  }

  /**
   * Get all cache keys matching pattern
   * @param {string} pattern - Regex pattern
   * @returns {Array} Matching keys
   */
  getKeys(pattern = null) {
    if (!pattern) {
      return Array.from(cacheStore.keys());
    }
    
    const regex = new RegExp(pattern);
    return Array.from(cacheStore.keys()).filter(key => regex.test(key));
  }

  /**
   * Middleware to wrap API calls with caching and enhanced features
   * @param {Function} apiCall - The API call function to wrap
   * @param {number} ttl - Time to live in milliseconds
   * @param {Object} options - Caching options
   * @returns {Function} Wrapped function with caching
   */
  withCache(apiCall, ttl = this.defaultTtl, options = {}) {
    return async (...args) => {
      const key = options.customKey || this.generateKey(apiCall.name, args);
      
      // Try to get from cache first
      const cachedData = await this.getAsync(key);
      if (cachedData) {
        return cachedData;
      }
      
      // If not in cache, call API
      try {
        const data = await apiCall(...args);
        
        // Store in cache with options
        await this.setAsync(key, data, ttl, options);
        
        return data;
      } catch (error) {
        // Optionally cache errors for a short time to prevent repeated failures
        if (options.cacheErrors) {
          await this.setAsync(key, { error: error.message }, 60000, { ...options, priority: 'low' }); // 1 minute
        }
        throw error;
      }
    };
  }
}

// Create and export a singleton instance
const cacheManager = new CacheManager();

// Set up periodic cache cleanup with enhanced scheduling
let cleanupInterval = null;

const startCleanup = () => {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(() => {
    cacheManager.cleanExpired();
  }, 60000); // Clean expired items every minute
};

const stopCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

// Start cleanup automatically
startCleanup();

// ============================================================
// FIX: export the instance directly.
// Using spread (`...cacheManager`) only copies OWN enumerable
// properties and strips all prototype methods (generateKey,
// get, set, delete, etc), causing:
//   "cacheManager.generateKey is not a function"
// Instead we attach the extra helpers onto the instance itself
// so the full class interface is preserved.
// ============================================================
cacheManager.startCleanup = startCleanup;
cacheManager.stopCleanup = stopCleanup;

module.exports = cacheManager;