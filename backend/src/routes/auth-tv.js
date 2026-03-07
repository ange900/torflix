import { Router } from 'express';
import { authenticateToken as authMiddleware } from '../auth/auth.middleware.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import { v4 as uuidv4 } from 'uuid';
import { login } from '../auth/auth.service.js';

const router = Router();
const pendingSessions = new Map();
const TTL_MS = 5 * 60 * 1000;

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

setInterval(() => {
  const now = Date.now();
  for (const [sid, sess] of pendingSessions)
    if (sess.expiresAt < now) pendingSessions.delete(sid);
}, 60_000);

router.post('/qr', (req, res) => {
  const sessionId = uuidv4();
  const code = generateCode();
  pendingSessions.set(sessionId, { code, expiresAt: Date.now() + TTL_MS, token: null });
  res.json({ sessionId, code, activationUrl: `https://torflix.xyz/tv?code=${code}` });
});

router.get('/verify', (req, res) => {
  const sess = pendingSessions.get(req.query.session);
  if (!sess) return res.json({ status: 'not_found' });
  if (Date.now() > sess.expiresAt) { pendingSessions.delete(req.query.session); return res.json({ status: 'expired' }); }
  if (sess.token) { const token = sess.token; pendingSessions.delete(req.query.session); return res.json({ status: 'ok', token }); }
  res.json({ status: 'pending' });
});

router.post('/validate', async (req, res) => {
  const { code, username, password } = req.body;
  if (!code || !username || !password)
    return res.status(400).json({ error: 'Code, identifiant et mot de passe requis' });

  const clean = code.toUpperCase().replace('-', '');
  let targetSid = null;
  for (const [sid, sess] of pendingSessions) {
    if (sess.code === clean && Date.now() < sess.expiresAt) { targetSid = sid; break; }
  }
  if (!targetSid) return res.status(404).json({ error: 'Code invalide ou expiré' });

  try {
    const result = await login({ emailOrUsername: username, password }, '127.0.0.1');
    if (result.requires2FA)
      return res.status(403).json({ error: '2FA non supporté pour la connexion TV' });
    pendingSessions.get(targetSid).token = result.tokens.accessToken;
    res.json({ status: 'ok', message: 'Appareil autorisé' });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.statusCode === 401 ? 'Identifiants incorrects' : 'Erreur serveur' });
  }
});

export default router;

// ADMIN: Autoriser un user via device code
router.post('/admin/authorize-device', authMiddleware, adminMiddleware, async (req, res) => {
  const { deviceCode, userId } = req.body;

  if (!deviceCode) {
    return res.status(400).json({ error: 'Device code requis' });
  }

  try {
    // Chercher la session en attente avec ce code
    const session = await redis.get(`tv:device:${deviceCode.toUpperCase()}`);
    if (!session) {
      return res.status(404).json({ error: 'Code invalide ou expiré' });
    }

    const sessionData = JSON.parse(session);

    // Associer le userId à la session (soit celui fourni, soit auto-créer)
    let targetUserId = userId;

    if (!targetUserId) {
      // Créer un compte invité automatiquement
      const guestUser = await pool.query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, 'user') RETURNING id`,
        [
          `guest_${deviceCode.toLowerCase()}`,
          `guest_${deviceCode.toLowerCase()}@torflix.local`,
          'guest_no_password'
        ]
      );
      targetUserId = guestUser.rows[0].id;
    }

    // Générer un token JWT pour cet user
    const token = jwt.sign(
      { userId: targetUserId, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Stocker le token pour que la TV le récupère
    await redis.setex(`tv:token:${deviceCode.toUpperCase()}`, 300, JSON.stringify({
      token,
      userId: targetUserId,
      authorized: true
    }));

    // Supprimer la session d'attente
    await redis.del(`tv:device:${deviceCode.toUpperCase()}`);

    res.json({ success: true, message: 'Appareil autorisé', userId: targetUserId });
  } catch (err) {
    console.error('Admin authorize device error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ADMIN: Lister les devices en attente d'autorisation
router.get('/admin/pending-devices', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const keys = await redis.keys('tv:device:*');
    const devices = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.get(key);
        const code = key.replace('tv:device:', '');
        const ttl = await redis.ttl(key);
        return { code, ttl, ...(data ? JSON.parse(data) : {}) };
      })
    );
    res.json({ devices });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// ADMIN: Autoriser un user via device code
router.post('/admin/authorize-device', authMiddleware, adminMiddleware, async (req, res) => {
  const { deviceCode, userId } = req.body;

  if (!deviceCode) {
    return res.status(400).json({ error: 'Device code requis' });
  }

  try {
    // Chercher la session en attente avec ce code
    const session = await redis.get(`tv:device:${deviceCode.toUpperCase()}`);
    if (!session) {
      return res.status(404).json({ error: 'Code invalide ou expiré' });
    }

    const sessionData = JSON.parse(session);

    // Associer le userId à la session (soit celui fourni, soit auto-créer)
    let targetUserId = userId;

    if (!targetUserId) {
      // Créer un compte invité automatiquement
      const guestUser = await pool.query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, 'user') RETURNING id`,
        [
          `guest_${deviceCode.toLowerCase()}`,
          `guest_${deviceCode.toLowerCase()}@torflix.local`,
          'guest_no_password'
        ]
      );
      targetUserId = guestUser.rows[0].id;
    }

    // Générer un token JWT pour cet user
    const token = jwt.sign(
      { userId: targetUserId, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Stocker le token pour que la TV le récupère
    await redis.setex(`tv:token:${deviceCode.toUpperCase()}`, 300, JSON.stringify({
      token,
      userId: targetUserId,
      authorized: true
    }));

    // Supprimer la session d'attente
    await redis.del(`tv:device:${deviceCode.toUpperCase()}`);

    res.json({ success: true, message: 'Appareil autorisé', userId: targetUserId });
  } catch (err) {
    console.error('Admin authorize device error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ADMIN: Lister les devices en attente d'autorisation
router.get('/admin/pending-devices', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const keys = await redis.keys('tv:device:*');
    const devices = await Promise.all(
      keys.map(async (key) => {
        const data = await redis.get(key);
        const code = key.replace('tv:device:', '');
        const ttl = await redis.ttl(key);
        return { code, ttl, ...(data ? JSON.parse(data) : {}) };
      })
    );
    res.json({ devices });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

