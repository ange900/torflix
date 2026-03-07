import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware.js';
import pool from '../config/database.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const router = Router();
router.use(authenticateToken);

// ==================== SETUP 2FA ====================
router.post('/setup', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rows } = await pool.query('SELECT username, email, two_factor_enabled FROM users WHERE id = $1', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    if (rows[0].two_factor_enabled) return res.status(400).json({ error: '2FA déjà activé' });

    // Generate secret
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(rows[0].email, 'StreamPanel', secret);

    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(otpauth);

    // Store secret temporarily (not enabled yet)
    await pool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret, userId]);

    res.json({ secret, qrCode: qrDataUrl, otpauth });
  } catch (err) {
    console.error('[2FA Setup]', err);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// ==================== VERIFY & ENABLE 2FA ====================
router.post('/enable', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code requis' });

    const { rows } = await pool.query('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    if (rows[0].two_factor_enabled) return res.status(400).json({ error: '2FA déjà activé' });
    if (!rows[0].two_factor_secret) return res.status(400).json({ error: 'Lancez /setup d\'abord' });

    // Verify TOTP code
    const isValid = authenticator.verify({ token: code, secret: rows[0].two_factor_secret });
    if (!isValid) return res.status(400).json({ error: 'Code invalide' });

    // Enable 2FA
    await pool.query('UPDATE users SET two_factor_enabled = true WHERE id = $1', [userId]);

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );
    await pool.query("UPDATE users SET extra_data = jsonb_set(COALESCE(extra_data, '{}'), '{backup_codes}', $1::jsonb) WHERE id = $2",
      [JSON.stringify(backupCodes), userId]
    );

    res.json({ success: true, backupCodes, message: '2FA activé avec succès' });
  } catch (err) {
    console.error('[2FA Enable]', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// ==================== DISABLE 2FA ====================
router.post('/disable', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code, password } = req.body;
    if (!code) return res.status(400).json({ error: 'Code 2FA requis' });

    const { rows } = await pool.query('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    if (!rows[0].two_factor_enabled) return res.status(400).json({ error: '2FA pas activé' });

    const isValid = authenticator.verify({ token: code, secret: rows[0].two_factor_secret });
    if (!isValid) return res.status(400).json({ error: 'Code invalide' });

    await pool.query('UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1', [userId]);
    res.json({ success: true, message: '2FA désactivé' });
  } catch (err) {
    console.error('[2FA Disable]', err);
    res.status(500).json({ error: 'Failed' });
  }
});

// ==================== GET 2FA STATUS ====================
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT two_factor_enabled FROM users WHERE id = $1', [req.user.userId]);
    res.json({ enabled: rows[0]?.two_factor_enabled || false });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
