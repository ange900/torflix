const router = require('express').Router();
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');
const { getCache, setCache } = require('../utils/redis');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;

async function tmdbGet(path, params = {}) {
  const cacheKey = `tmdb:${path}:${JSON.stringify(params)}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(`${TMDB_BASE}${path}`, {
    params: { api_key: TMDB_KEY, language: 'fr-FR', ...params },
  });

  await setCache(cacheKey, data, 3600); // cache 1h
  return data;
}

// ── GET /api/movies/trending ──
router.get('/trending', requireAuth, async (req, res, next) => {
  try {
    const data = await tmdbGet('/trending/movie/week');
    res.json(data.results);
  } catch (err) { next(err); }
});

// ── GET /api/movies/new ──
router.get('/new', requireAuth, async (req, res, next) => {
  try {
    const data = await tmdbGet('/movie/now_playing', { region: 'FR' });
    res.json(data.results);
  } catch (err) { next(err); }
});

// ── GET /api/movies/popular ──
router.get('/popular', requireAuth, async (req, res, next) => {
  try {
    const data = await tmdbGet('/movie/popular', { region: 'FR' });
    res.json(data.results);
  } catch (err) { next(err); }
});

// ── GET /api/movies/:id ── (détail film)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const data = await tmdbGet(`/movie/${req.params.id}`, {
      append_to_response: 'credits,videos,similar',
    });
    res.json(data);
  } catch (err) { next(err); }
});

// ── GET /api/movies/tv/trending ──
router.get('/tv/trending', requireAuth, async (req, res, next) => {
  try {
    const data = await tmdbGet('/trending/tv/week');
    res.json(data.results);
  } catch (err) { next(err); }
});

// ── GET /api/movies/tv/:id ──
router.get('/tv/:id', requireAuth, async (req, res, next) => {
  try {
    const data = await tmdbGet(`/tv/${req.params.id}`, {
      append_to_response: 'credits,videos,similar',
    });
    res.json(data);
  } catch (err) { next(err); }
});

// ── GET /api/movies/tv/:id/season/:season ──
router.get('/tv/:id/season/:season', requireAuth, async (req, res, next) => {
  try {
    const data = await tmdbGet(`/tv/${req.params.id}/season/${req.params.season}`);
    res.json(data);
  } catch (err) { next(err); }
});

module.exports = router;
