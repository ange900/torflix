const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { query } = require('../models/db');
const { requireAuth, requireAdmin, generateTokens } = require('../middleware/auth');

// Rate limit: 5 tentatives / 15 min
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

// ── POST /api/auth/register ──
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    // Check if user exists
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email ou pseudo déjà utilisé.' });
    }

    // Hash password & create user
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role',
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('token', accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax',
    });

    res.status(201).json({ user, token: accessToken });
  } catch (err) { next(err); }
});

// ── POST /api/auth/login ──
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, username, email, password_hash, role, is_active FROM users WHERE email = $1 OR username = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Compte désactivé. Contactez l\'administrateur.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('token', accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax',
    });

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token: accessToken });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ──
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.json({ message: 'Déconnecté.' });
});

// ── GET /api/auth/me ──
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, username, email, role, avatar_url, preferred_lang, preferred_quality, totp_enabled, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── PUT /api/auth/preferences ──
router.put('/preferences', requireAuth, async (req, res, next) => {
  try {
    const { preferred_lang, preferred_quality } = req.body;
    await query(
      'UPDATE users SET preferred_lang = COALESCE($1, preferred_lang), preferred_quality = COALESCE($2, preferred_quality), updated_at = NOW() WHERE id = $3',
      [preferred_lang, preferred_quality, req.user.id]
    );
    res.json({ message: 'Préférences mises à jour.' });
  } catch (err) { next(err); }
});

// ── Admin: GET /api/auth/users ──
router.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
