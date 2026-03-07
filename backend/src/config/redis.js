import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Create Redis client
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Redis connection events
redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

// Connect to Redis
export async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

// Session management functions
export const sessionKeys = {
  session: (userId, sessionId) => `session:${userId}:${sessionId}`,
  refresh: (refreshToken) => `refresh:${refreshToken}`,
  rateLimit: (ip) => `rate_limit:login:${ip}`,
};

// Store session data
export async function storeSession(userId, sessionId, tokenData, expiresIn = 7 * 24 * 60 * 60) {
  const key = sessionKeys.session(userId, sessionId);
  await redisClient.setEx(key, expiresIn, JSON.stringify(tokenData));
}

// Get session data
export async function getSession(userId, sessionId) {
  const key = sessionKeys.session(userId, sessionId);
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

// Delete session
export async function deleteSession(userId, sessionId) {
  const key = sessionKeys.session(userId, sessionId);
  await redisClient.del(key);
}

// Delete all user sessions
export async function deleteAllUserSessions(userId) {
  const pattern = `session:${userId}:*`;
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
  return keys.length;
}

// Store refresh token
export async function storeRefreshToken(refreshToken, userId, expiresIn = 7 * 24 * 60 * 60) {
  const key = sessionKeys.refresh(refreshToken);
  await redisClient.setEx(key, expiresIn, JSON.stringify({ userId }));
}

// Get refresh token data
export async function getRefreshToken(refreshToken) {
  const key = sessionKeys.refresh(refreshToken);
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
}

// Delete refresh token
export async function deleteRefreshToken(refreshToken) {
  const key = sessionKeys.refresh(refreshToken);
  await redisClient.del(key);
}

// Rate limiting functions
export async function checkRateLimit(ip, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const key = sessionKeys.rateLimit(ip);
  const data = await redisClient.get(key);

  if (!data) {
    // First attempt
    await redisClient.setEx(key, Math.floor(windowMs / 1000), JSON.stringify({ count: 1, resetAt: Date.now() + windowMs }));
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  const { count, resetAt } = JSON.parse(data);

  if (count >= maxAttempts) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment counter
  await redisClient.setEx(key, Math.floor(windowMs / 1000), JSON.stringify({ count: count + 1, resetAt }));
  return { allowed: true, remaining: maxAttempts - count - 1 };
}

// Reset rate limit
export async function resetRateLimit(ip) {
  const key = sessionKeys.rateLimit(ip);
  await redisClient.del(key);
}

export default redisClient;
