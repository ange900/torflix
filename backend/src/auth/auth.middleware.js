import { verifyAccessToken } from '../config/jwt.js';
import { getSession } from '../config/redis.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticateToken(req, res, next) {
  try {
    // Extract token from cookie
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Check if session exists in Redis
    const session = await getSession(decoded.userId, decoded.sessionId);
    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid session',
      });
    }

    // Attach user to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    if (error.message === 'Access token expired') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }
}

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - Roles that can access the route
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (token) {
      const decoded = verifyAccessToken(token);
      const session = await getSession(decoded.userId, decoded.sessionId);

      if (session) {
        req.user = {
          userId: decoded.userId,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role,
          sessionId: decoded.sessionId,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without user on error
    next();
  }
}

export default {
  authenticateToken,
  authorize,
  optionalAuth,
};
