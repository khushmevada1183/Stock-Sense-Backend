/**
 * Global Rate Limiting Middleware
 *
 * This middleware implements a global rate limit to prevent overwhelming the API
 * even with API key rotation.
 */

const WINDOW_MS = 60 * 1000;
const MAX_PER_MINUTE = 30;
const GLOBAL_MAX_PER_MINUTE = 100;

class GlobalRateLimiter {
  constructor() {
    this.requests = new Map(); // IP -> [timestamps]
    this.globalRequests = []; // Global request timestamps

    // Clean up old requests every minute
    setInterval(() => {
      this.cleanup();
    }, WINDOW_MS);
  }

  cleanup() {
    const now = Date.now();
    const oneMinuteAgo = now - WINDOW_MS;

    // Clean per-IP tracking
    for (const [ip, timestamps] of this.requests.entries()) {
      const recentRequests = timestamps.filter((ts) => ts > oneMinuteAgo);
      if (recentRequests.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, recentRequests);
      }
    }

    // Clean global tracking
    this.globalRequests = this.globalRequests.filter((ts) => ts > oneMinuteAgo);
  }

  evaluateRequest(ip, maxPerMinute = MAX_PER_MINUTE, globalMaxPerMinute = GLOBAL_MAX_PER_MINUTE) {
    const now = Date.now();
    const oneMinuteAgo = now - WINDOW_MS;

    // Per-IP state
    const ipRequests = this.requests.get(ip) || [];
    const recentIpRequests = ipRequests.filter((ts) => ts > oneMinuteAgo);

    // Global state
    const recentGlobalRequests = this.globalRequests.filter((ts) => ts > oneMinuteAgo);

    const getResetAtMs = (timestamps) => {
      if (!timestamps || timestamps.length === 0) {
        return now + WINDOW_MS;
      }

      return Math.min(...timestamps) + WINDOW_MS;
    };

    if (recentIpRequests.length >= maxPerMinute) {
      const resetAtMs = getResetAtMs(recentIpRequests);
      return {
        allowed: false,
        reason: 'ip',
        remaining: 0,
        resetAtMs,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - now) / 1000)),
      };
    }

    if (recentGlobalRequests.length >= globalMaxPerMinute) {
      const resetAtMs = getResetAtMs(recentGlobalRequests);
      return {
        allowed: false,
        reason: 'global',
        remaining: 0,
        resetAtMs,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - now) / 1000)),
      };
    }

    // Record this request
    recentIpRequests.push(now);
    this.requests.set(ip, recentIpRequests);
    recentGlobalRequests.push(now);
    this.globalRequests = recentGlobalRequests;

    const resetAtMs = getResetAtMs(recentIpRequests);

    return {
      allowed: true,
      reason: null,
      remaining: Math.max(0, maxPerMinute - recentIpRequests.length),
      resetAtMs,
      retryAfterSeconds: null,
    };
  }

  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - WINDOW_MS;

    const totalIPs = this.requests.size;
    const recentGlobalRequests = this.globalRequests.filter((ts) => ts > oneMinuteAgo);

    return {
      totalActiveIPs: totalIPs,
      globalRequestsInLastMinute: recentGlobalRequests.length,
      timestamp: new Date().toISOString(),
    };
  }
}

const rateLimiter = new GlobalRateLimiter();

function rateLimitMiddleware(req, res, next) {
  // Skip rate limiting for health checks, admin endpoints, and live logs
  if (
    req.path === '/health' ||
    req.path === '/api/v1/health' ||
    req.path === '/api/v1/health/db' ||
    req.path.startsWith('/admin/') ||
    req.path.startsWith('/live-logs')
  ) {
    return next();
  }

  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const result = rateLimiter.evaluateRequest(ip);

  const resetAtUnixSeconds = Math.floor(result.resetAtMs / 1000);
  res.set({
    'X-RateLimit-Limit': String(MAX_PER_MINUTE),
    'X-RateLimit-Window': '60',
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(resetAtUnixSeconds),
  });

  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterSeconds));

    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests. Please try again later.',
        code: 'ERR_RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        retryAfter: result.retryAfterSeconds,
        reason: result.reason,
        timestamp: new Date().toISOString(),
      },
    });
  }

  next();
}

// Export both the middleware and rate limiter for stats
module.exports = {
  rateLimitMiddleware,
  getRateLimiterStats: () => rateLimiter.getStats(),
};
