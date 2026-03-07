import pool from '../config/database.js';
import { nanoid } from 'nanoid';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password.util.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../config/jwt.js';
import {
  storeSession,
  getSession,
  deleteSession,
  deleteAllUserSessions,
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  checkRateLimit,
  resetRateLimit,
} from '../config/redis.js';
import { validate } from './auth.validator.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validator.js';

/**
 * User registration service
 * @param {object} userData - User registration data
 * @param {string} userData.username - Username
 * @param {string} userData.email - Email address
 * @param {string} userData.password - Password
 * @returns {Promise<object>} Created user without password
 */
export async function register(userData) {
  // Validate input
  const validation = validate(registerSchema, userData);
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  const { username, email, password } = validation.data;

  // Check if user already exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email, username]
  );

  if (existingUser.rows.length > 0) {
    const error = new Error('User already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash password
  const password_hash = await hashPassword(password);

  // Create user
  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email, role, avatar_url, is_active, created_at`,
    [username, email, password_hash]
  );

  const user = result.rows[0];

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url,
    is_active: user.is_active,
    created_at: user.created_at,
  };
}

/**
 * User login service
 * @param {object} loginData - Login data
 * @param {string} loginData.emailOrUsername - Email or username
 * @param {string} loginData.password - Password
 * @param {string} ip - Client IP address for rate limiting
 * @returns {Promise<object>} Tokens and user data
 */
export async function login(loginData, ip) {
  // Validate input
  const validation = validate(loginSchema, loginData);
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  // Check rate limit
  // rate limit disabled
  const rateLimitResult = { allowed: true };
  if (!rateLimitResult.allowed) {
    const error = new Error('Too many login attempts');
    error.statusCode = 429;
    error.retryAfter = rateLimitResult.retryAfter;
    throw error;
  }

  const { emailOrUsername, password } = validation.data;

  // Find user by email or username
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1 OR username = $1',
    [emailOrUsername]
  );

  if (result.rows.length === 0) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  const user = result.rows[0];

  // Check if user is active
  if (!user.is_active) {
    const error = new Error('Account is disabled');
    error.statusCode = 403;
    throw error;
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    throw error;
  }

  // Reset rate limit on successful login
  await resetRateLimit(ip);

  // Generate session ID
  const sessionId = nanoid();

  // Generate tokens
  // Check if 2FA is enabled
  if (user.two_factor_enabled) {
    return {
      requires2FA: true,
      userId: user.id,
      message: 'Vérification 2FA requise',
    };
  }

  const tokenPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    sessionId,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ userId: user.id });

  // Calculate access token expiry (15 minutes)
  const accessTokenExpiry = Math.floor(Date.now() / 1000) + (15 * 60);

  // Store session
  await storeSession(user.id, sessionId, {
    tokenPayload,
    accessTokenExpiry,
  });

  // Store refresh token
  await storeRefreshToken(refreshToken, user.id);

  // Update last login
  await pool.query(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    },
  };
}

/**
 * Refresh access token service
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<object>} New tokens
 */
export async function refreshTokens(refreshToken) {
  // Validate input
  const validation = validate(refreshTokenSchema, { refreshToken });
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  // Check if refresh token exists in Redis
  const tokenData = await getRefreshToken(refreshToken);
  if (!tokenData) {
    const error = new Error('Invalid refresh token');
    error.statusCode = 401;
    throw error;
  }

  // Verify refresh token
  try {
    verifyRefreshToken(refreshToken);
  } catch (err) {
    // Delete invalid token from Redis
    await deleteRefreshToken(refreshToken);
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  // Get user data
  const result = await pool.query(
    'SELECT id, username, email, role FROM users WHERE id = $1',
    [tokenData.userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const user = result.rows[0];

  // Generate new tokens
  const sessionId = nanoid();
  const tokenPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    sessionId,
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken({ userId: user.id });

  // Store new session
  const accessTokenExpiry = Math.floor(Date.now() / 1000) + (15 * 60);
  await storeSession(user.id, sessionId, {
    tokenPayload,
    accessTokenExpiry,
  });

  // Store new refresh token
  await storeRefreshToken(newRefreshToken, user.id);

  // Delete old refresh token
  await deleteRefreshToken(refreshToken);

  return {
    tokens: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    },
  };
}

/**
 * Logout service (current session)
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<void>}
 */
export async function logout(userId, sessionId, refreshToken) {
  if (sessionId) {
    await deleteSession(userId, sessionId);
  }
  if (refreshToken) {
    await deleteRefreshToken(refreshToken);
  }
}

/**
 * Logout from all sessions service
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of sessions deleted
 */
export async function logoutAll(userId) {
  const deletedCount = await deleteAllUserSessions(userId);
  return deletedCount;
}

/**
 * Get current user service
 * @param {string} userId - User ID
 * @returns {Promise<object>} User data
 */
export async function getCurrentUser(userId) {
  const result = await pool.query(
    `SELECT id, username, email, role, avatar_url, is_active, two_factor_enabled, created_at, last_login
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

/**
 * Forgot password service
 * @param {string} email - User email
 * @returns {Promise<string>} Reset token
 */
export async function forgotPassword(email) {
  // Validate input
  const validation = validate(forgotPasswordSchema, { email });
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  // Find user by email
  const result = await pool.query(
    'SELECT id, email FROM users WHERE email = $1',
    [validation.data.email]
  );

  if (result.rows.length === 0) {
    // Don't reveal if email exists or not
    return {
      message: 'If the email exists, a password reset link will be sent',
    };
  }

  const user = result.rows[0];

  // Generate reset token (in production, this should be sent via email)
  const resetToken = nanoid(32);

  // Store reset token in Redis with 1 hour expiry
  const { redisClient } = await import('../config/redis.js');
  await redisClient.setEx(
    `password_reset:${resetToken}`,
    3600,
    JSON.stringify({ userId: user.id })
  );

  // In production, send email with reset link
  console.log(`Password reset token for ${user.email}: ${resetToken}`);

  return {
    message: 'If the email exists, a password reset link will be sent',
    // Dev only: return token for testing
    ...(process.env.NODE_ENV === 'development' && { resetToken }),
  };
}

/**
 * Reset password service
 * @param {string} token - Reset token
 * @param {string} password - New password
 * @returns {Promise<object>} Result message
 */
export async function resetPassword(token, password) {
  // Validate input
  const validation = validate(resetPasswordSchema, { token, password, confirmPassword: password });
  if (!validation.valid) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  // Check if reset token exists
  const { redisClient } = await import('../config/redis.js');
  const resetData = await redisClient.get(`password_reset:${token}`);

  if (!resetData) {
    const error = new Error('Invalid or expired reset token');
    error.statusCode = 401;
    throw error;
  }

  const { userId } = JSON.parse(resetData);

  // Hash new password
  const password_hash = await hashPassword(password);

  // Update password
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [password_hash, userId]
  );

  // Delete reset token
  await redisClient.del(`password_reset:${token}`);

  // Invalidate all user sessions for security
  await deleteAllUserSessions(userId);

  return {
    message: 'Password reset successfully',
  };
}

export default {
  register,
  login,
  refreshTokens,
  logout,
  logoutAll,
  getCurrentUser,
  forgotPassword,
  resetPassword,
};
