import { Router } from 'express';
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
