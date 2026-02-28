const router = require('express').Router();
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');
const { query } = require('../models/db');
const { getCache, setCache } = require('../utils/redis');

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;

// ── GET /api/search?q=&lang=&genre=&quality=&year=&sort= ──
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { q, lang, genre, quality, year, sort, page = 1 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'La requête doit contenir au moins 2 caractères.' });
    }

    // Save search history
    query(
      'INSERT INTO search_history (user_id, query, filters) VALUES ($1, $2, $3)',
      [req.user.id, q, JSON.stringify({ lang, genre, quality, year, sort })]
    ).catch(() => {}); // non-blocking

    // Search TMDB
    const cacheKey = `search:${q}:${page}`;
    let tmdbResults = await getCache(cacheKey);

    if (!tmdbResults) {
      const { data } = await axios.get(`${TMDB_BASE}/search/multi`, {
        params: { api_key: TMDB_KEY, language: 'fr-FR', query: q, page },
      });
      tmdbResults = data.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv');
      await setCache(cacheKey, tmdbResults, 1800);
    }

    // Apply filters (genre, year)
    let filtered = tmdbResults;
    if (year) {
      filtered = filtered.filter(r => {
        const releaseYear = (r.release_date || r.first_air_date || '').substring(0, 4);
        return releaseYear === year;
      });
    }

    // Sort
    if (sort === 'rating') {
      filtered.sort((a, b) => b.vote_average - a.vote_average);
    } else if (sort === 'date') {
      filtered.sort((a, b) => new Date(b.release_date || b.first_air_date) - new Date(a.release_date || a.first_air_date));
    } else if (sort === 'popularity') {
      filtered.sort((a, b) => b.popularity - a.popularity);
    }

    res.json({
      results: filtered,
      total: filtered.length,
      filters: { lang, genre, quality, year, sort },
    });
  } catch (err) { next(err); }
});

// ── GET /api/search/suggestions ── (autocomplete)
router.get('/suggestions', requireAuth, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const { data } = await axios.get(`${TMDB_BASE}/search/multi`, {
      params: { api_key: TMDB_KEY, language: 'fr-FR', query: q, page: 1 },
    });

    const suggestions = data.results.slice(0, 6).map(r => ({
      id: r.id,
      title: r.title || r.name,
      year: (r.release_date || r.first_air_date || '').substring(0, 4),
      type: r.media_type,
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : null,
    }));

    res.json(suggestions);
  } catch (err) { next(err); }
});

// ── GET /api/search/history ──
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT DISTINCT ON (query) query, searched_at FROM search_history WHERE user_id = $1 ORDER BY query, searched_at DESC LIMIT 10',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
