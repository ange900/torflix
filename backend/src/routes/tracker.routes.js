import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware.js';
import { getJackettIndexers, getAvailableJackettIndexers, addJackettIndexer, removeJackettIndexer } from '../services/jackett.service.js';
import {
  addAccount, getAccounts, removeAccount,
  loginYGG, searchAllTrackers, downloadYGGTorrent, TRACKERS,
  
  
} from '../services/tracker.service.js';

const router = Router();
router.use(authenticateToken);

// ── Comptes tracker (YGG, Sharewood...) ──────────────────────────
router.get('/supported', (req, res) => {
  res.json({ trackers: Object.entries(TRACKERS).map(([key, val]) => ({ key, name: val.name, domain: val.domain, needsAccount: !!val.loginUrl })) });
});
router.get('/accounts', async (req, res) => {
  try { res.json({ accounts: await getAccounts(req.user.userId) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/accounts', async (req, res) => {
  try {
    const { trackerType, username, password } = req.body;
    if (!trackerType || !username || !password) return res.status(400).json({ error: 'Champs manquants' });
    if (!TRACKERS[trackerType]) return res.status(400).json({ error: 'Tracker inconnu' });
    res.json({ account: await addAccount(req.user.userId, trackerType, username, password), message: 'Compte ajouté' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.delete('/accounts/:id', async (req, res) => {
  try { await removeAccount(req.user.userId, req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/accounts/:type/login', async (req, res) => {
  try {
    if (req.params.type === 'ygg') res.json({ success: true, ...await loginYGG(req.user.userId) });
    else res.json({ success: true, message: 'Pas de login requis' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Recherche ─────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q, category } = req.query;
    if (!q) return res.status(400).json({ error: 'Query requise' });
    res.json(await searchAllTrackers(req.user.userId, q, category || 'all'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── YGG download ──────────────────────────────────────────────────
router.get('/ygg/download', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL requise' });
    const buffer = await downloadYGGTorrent(req.user.userId, url);
    res.set({ 'Content-Type': 'application/x-bittorrent', 'Content-Disposition': 'attachment; filename=torrent.torrent' });
    res.send(Buffer.from(buffer));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Jackett indexers ──────────────────────────────────────────────
router.get('/jackett', async (req, res) => {
  try { res.json({ indexers: await getJackettIndexers() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/jackett/available', async (req, res) => {
  try { res.json({ indexers: await getAvailableJackettIndexers() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/jackett/:id', async (req, res) => {
  try { res.json(await addJackettIndexer(req.params.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.delete('/jackett/:id', async (req, res) => {
  try { res.json(await removeJackettIndexer(req.params.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
// Ces imports sont maintenant dans jackett.service.js
