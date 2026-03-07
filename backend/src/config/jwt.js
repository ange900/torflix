import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// JWT configuration
export const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key-change-in-production-min-64-chars',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production-min-64-chars',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};

/**
 * Generate access token
 * @param {object} payload - User data to encode
 * @returns {string} JWT access token
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiry,
  });
}

/**
 * Generate refresh token
 * @param {object} payload - User data to encode
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiry,
  });
}

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {object} Decoded token payload
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, jwtConfig.accessSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    throw new Error('Invalid access token');
  }
}

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {object} Decoded token payload
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    throw new Error('Invalid refresh token');
  }
}

/**
 * Decode token without verification (for getting expiry)
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
export function decodeToken(token) {
  return jwt.decode(token);
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
