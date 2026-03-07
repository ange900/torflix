import { Router } from 'express';
import { searchMulti, searchMovies, searchTV, discoverMovies, discoverTV, getGenres } from '../services/tmdb.service.js';
import { searchTorrents } from '../services/torrent.service.js';

const router = Router();

// Multi-search TMDB (films + séries + personnes)
router.get('/multi', async (req, res) => {
  try {
    const { q, page = 1, type } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });

    let data;
    if (type === 'movie') {
      data = await searchMovies(q, page);
      data.results = data.results.map(r => ({ ...r, media_type: 'movie' }));
    } else if (type === 'tv') {
      data = await searchTV(q, page);
      data.results = data.results.map(r => ({ ...r, media_type: 'tv' }));
    } else {
      data = await searchMulti(q, page);
      // Filter out persons unless specifically wanted
      data.results = data.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv');
    }

    res.json(data);
  } catch (err) {
    console.error('[Search Multi]', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Discover with filters (genre, year, rating, sort)
router.get('/discover', async (req, res) => {
  try {
    const { type = 'movie', genre, year, min_rating, sort = 'popularity.desc', page = 1 } = req.query;
    const params = { page, sort_by: sort };
    if (genre) params.with_genres = genre;
    if (year) {
      if (type === 'movie') params.primary_release_year = year;
      else params.first_air_date_year = year;
    }
    if (min_rating) params['vote_average.gte'] = min_rating;
    params['vote_count.gte'] = 50; // avoid obscure entries

    const data = type === 'tv' ? await discoverTV(params) : await discoverMovies(params);
    data.results = data.results.map(r => ({ ...r, media_type: type }));
    res.json(data);
  } catch (err) {
    console.error('[Search Discover]', err.message);
    res.status(500).json({ error: 'Discover failed' });
  }
});

// Get genres list
router.get('/genres', async (req, res) => {
  try {
    const [movieGenres, tvGenres] = await Promise.all([getGenres('movie'), getGenres('tv')]);
    // Merge and deduplicate
    const map = new Map();
    [...movieGenres.genres, ...tvGenres.genres].forEach(g => map.set(g.id, g));
    res.json({ genres: Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

// Torrent availability check for a title
router.get('/torrents', async (req, res) => {
  try {
    const { q, language, quality, category = 'Movies' } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const results = await searchTorrents(q, { category, language, quality, minSeeders: 0 });
    res.json({ total: results.length, results });
  } catch (err) {
    console.error('[Search Torrents]', err.message);
    res.status(500).json({ error: 'Torrent search failed', results: [] });
  }
});

export default router;
