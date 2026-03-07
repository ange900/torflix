import { checkRateLimit } from '../config/redis.js';

/**
 * Rate limiting middleware for login attempts
 * Uses Redis to track attempts per IP
 */
export async function loginRateLimit(req, res, next) {
  try {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

    const result = await checkRateLimit(ip);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many login attempts. Please try again later.',
        retryAfter: result.retryAfter,
      });
    }

    // Add rate limit info to response headers
    res.setHeader('X-RateLimit-Limit', 5);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    // Continue on error to not break functionality
    next();
  }
}

/**
 * General rate limiting middleware
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} keyPrefix - Redis key prefix
 */
export function createRateLimiter(maxRequests = 100, windowMs = 60000, keyPrefix = 'rate_limit') {
  return async (req, res, next) => {
    try {
      const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      const key = `${keyPrefix}:${ip}`;

      const { redisClient } = await import('../config/redis.js');
      const current = await redisClient.get(key);

      if (!current) {
        await redisClient.setEx(key, Math.floor(windowMs / 1000), '1');
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
        return next();
      }

      const count = parseInt(current);

      if (count >= maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
        });
      }

      await redisClient.incr(key);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - count - 1);

      next();
    } catch (error) {
      console.error('Rate limit error:', error);
      next();
    }
  };
}

export default {
  loginRateLimit,
  createRateLimiter,
};
