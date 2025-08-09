/**
 * Global Rate Limiting Middleware
 * 
 * This middleware implements a global rate limit to prevent overwhelming the API
 * even with API key rotation.
 */

// Simple in-memory rate limiter
class GlobalRateLimiter {
  constructor() {
    this.requests = new Map(); // IP -> [timestamps]
    this.globalRequests = []; // Global request timestamps
    
    // Clean up old requests every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }
  
  cleanup() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean per-IP tracking
    for (const [ip, timestamps] of this.requests.entries()) {
      const recentRequests = timestamps.filter(ts => ts > oneMinuteAgo);
      if (recentRequests.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, recentRequests);
      }
    }
    
    // Clean global tracking
    this.globalRequests = this.globalRequests.filter(ts => ts > oneMinuteAgo);
  }
  
  isAllowed(ip, maxPerMinute = 30, globalMaxPerMinute = 100) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Check per-IP limit
    const ipRequests = this.requests.get(ip) || [];
    const recentIpRequests = ipRequests.filter(ts => ts > oneMinuteAgo);
    
    if (recentIpRequests.length >= maxPerMinute) {
      return false;
    }
    
    // Check global limit
    const recentGlobalRequests = this.globalRequests.filter(ts => ts > oneMinuteAgo);
    if (recentGlobalRequests.length >= globalMaxPerMinute) {
      return false;
    }
    
    // Record this request
    recentIpRequests.push(now);
    this.requests.set(ip, recentIpRequests);
    this.globalRequests.push(now);
    
    return true;
  }
  
  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const totalIPs = this.requests.size;
    const recentGlobalRequests = this.globalRequests.filter(ts => ts > oneMinuteAgo);
    
    return {
      totalActiveIPs: totalIPs,
      globalRequestsInLastMinute: recentGlobalRequests.length,
      timestamp: new Date().toISOString()
    };
  }
}

const rateLimiter = new GlobalRateLimiter();

function rateLimitMiddleware(req, res, next) {
  // Skip rate limiting for health checks, admin endpoints, and live logs
  if (req.path === '/health' || req.path.startsWith('/admin/') || req.path.startsWith('/live-logs')) {
    return next();
  }
  
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Check if request is allowed
  if (!rateLimiter.isAllowed(ip)) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests. Please try again later.',
        code: 'ERR_RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        retryAfter: 60,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // Add rate limit headers
  res.set({
    'X-RateLimit-Limit': '30',
    'X-RateLimit-Window': '60',
    'X-RateLimit-Remaining': Math.max(0, 30 - (rateLimiter.requests.get(ip) || []).length)
  });
  
  next();
}

// Export both the middleware and rate limiter for stats
module.exports = {
  rateLimitMiddleware,
  getRateLimiterStats: () => rateLimiter.getStats()
};
