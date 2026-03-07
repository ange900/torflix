import { Router } from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { authenticator } = require('otplib');
import * as authService from './auth.service.js';
import { authenticateToken } from './auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { loginRateLimit } from '../middleware/rateLimit.middleware.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);

  res.status(201).json({
    message: 'User registered successfully',
    user,
  });
}));

/**
 * POST /api/auth/login
 * Login user
 */
router.post("/login", asyncHandler(async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const result = await authService.login(req.body, ip);

  // Set HttpOnly cookie with access token
  // Handle 2FA required
    if (result.requires2FA) {
      return res.json({ requires2FA: true, userId: result.userId, message: result.message });
    }

    res.cookie('token', result.tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 15 minutes
    path: '/',
  });

  res.json({
    message: 'Login successful',
    user: result.user,
    tokens: {
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    },
  });
}));

/**
 * POST /api/auth/logout
 * Logout from current session
 */
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  const { userId, sessionId } = req.user;
  const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

  await authService.logout(userId, sessionId, refreshToken);

  // Clear cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.json({
    message: 'Logout successful',
  });
}));

/**
 * POST /api/auth/logout-all
 * Logout from all sessions
 */
router.post('/logout-all', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const deletedCount = await authService.logoutAll(userId);

  // Clear cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.json({
    message: `Logged out from ${deletedCount} session(s)`,
  });
}));

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Refresh token is required',
    });
  }

  const result = await authService.refreshTokens(refreshToken);

  // Set new HttpOnly cookie with access token
  // Handle 2FA required
    if (result.requires2FA) {
      return res.json({ requires2FA: true, userId: result.userId, message: result.message });
    }

    res.cookie('token', result.tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 15 minutes
    path: '/',
  });

  res.json({
    message: 'Token refreshed successfully',
    tokens: {
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    },
  });
}));

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const user = await authService.getCurrentUser(userId);

  res.json({
    user,
  });
}));

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);

  res.json(result);
}));

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const result = await authService.resetPassword(token, password);

  res.json(result);
}));


// ==================== QR CODE TV LOGIN ====================
const qrSessions = new Map();

router.post('/qr/generate', (req, res) => {
  
  const token = require('crypto').randomBytes(32).toString('hex');
  qrSessions.set(token, { status: 'pending', createdAt: Date.now(), accessToken: null });
  setTimeout(() => qrSessions.delete(token), 5 * 60 * 1000);
  res.json({ token, url: `https://torfix.xyz/qr-login?token=${token}` });
});

router.get('/qr/poll/:token', (req, res) => {
  const session = qrSessions.get(req.params.token);
  if (!session) return res.json({ status: 'expired' });
  if (session.status === 'authenticated') {
    res.cookie('token', session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
  res.json({ status: session.status, accessToken: session.accessToken || null });
});

router.post('/qr/confirm/:token', authenticateToken, (req, res) => {
  const session = qrSessions.get(req.params.token);
  if (!session) return res.status(404).json({ error: 'Token expiré' });
  session.status = 'authenticated';
  session.accessToken = req.cookies?.token;
  res.json({ success: true });
});

export default router;
