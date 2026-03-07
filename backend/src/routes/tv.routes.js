import { Router } from 'express';
import { getTrending, getPopular, searchTV, getTVDetails, getTVSeasonDetails, getTopRated, getAiringToday, getOnTheAir } from '../services/tmdb.service.js';

const router = Router();

router.get('/trending', async (req, res) => {
  try { res.json(await getTrending('tv', req.query.timeWindow || 'week')); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/popular', async (req, res) => {
  try { res.json(await getPopular('tv', req.query.page)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/search', async (req, res) => {
  try {
    const { q, page } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    res.json(await searchTV(q, page));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/airing-today', async (req, res) => {
  try { res.json(await getAiringToday(req.query.page)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/on-the-air', async (req, res) => {
  try { res.json(await getOnTheAir(req.query.page)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/top-rated', async (req, res) => {
  try { res.json(await getTopRated('tv', req.query.page)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});


router.get('/discover', async (req, res) => {
  try {
    const { discoverTV } = await import('../services/tmdb.service.js');
    const { page, with_genres, sort_by, vote_average_gte, first_air_date_year } = req.query;
    res.json(await discoverTV({ page, with_genres, sort_by, 'vote_average.gte': vote_average_gte, first_air_date_year }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/genres', async (req, res) => {
  try {
    const { getGenres } = await import('../services/tmdb.service.js');
    res.json(await getGenres('tv'));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', async (req, res) => {
  try { res.json(await getTVDetails(req.params.id)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id/season/:seasonNumber', async (req, res) => {
  try { res.json(await getTVSeasonDetails(req.params.id, req.params.seasonNumber)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});



// === TV PAIRING ===
const tvPairCodes = new Map();

router.post('/pair-code', (req, res) => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  tvPairCodes.set(code, { created: Date.now(), token: null, user: null });
  for (const [k, v] of tvPairCodes) {
    if (Date.now() - v.created > 600000) tvPairCodes.delete(k);
  }
  res.json({ code });
});

router.get('/pair-check/:code', (req, res) => {
  const entry = tvPairCodes.get(req.params.code);
  if (!entry) return res.json({ status: 'expired' });
  if (entry.token) {
    tvPairCodes.delete(req.params.code);
    return res.json({ status: 'paired', token: entry.token, user: entry.user });
  }
  res.json({ status: 'waiting' });
});

router.post('/pair-validate', (req, res) => {
  const { code, token, user } = req.body;
  const entry = tvPairCodes.get(code);
  if (!entry) return res.status(400).json({ error: 'Code expiré' });
  entry.token = token;
  entry.user = user;
  res.json({ ok: true });
});

export default router;
