/**
 * Cache Manager Utility - Enhanced Version
 * 
 * This utility provides in-memory caching for API responses to improve performance
 * and reduce the number of requests to the external API.
 */

const { API_CONFIG } = require('../config');
const { logger } = require('./liveLogger');

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
    this.maxSize = process.env.CACHE_MAX_SIZE || 10000; // Maximum number of items
    this.warningThreshold = 0.8; // Warn when cache is 80% full
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
      priorityDistribution: priorityCount
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
      const cachedData = this.get(key);
      if (cachedData) {
        return cachedData;
      }
      
      // If not in cache, call API
      try {
        const data = await apiCall(...args);
        
        // Store in cache with options
        this.set(key, data, ttl, options);
        
        return data;
      } catch (error) {
        // Optionally cache errors for a short time to prevent repeated failures
        if (options.cacheErrors) {
          this.set(key, { error: error.message }, 60000, { ...options, priority: 'low' }); // 1 minute
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