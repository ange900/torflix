import { Router } from 'express';
import { getTrending, getPopular, searchMovies, getMovieDetails, getNowPlaying, getTopRated, getUpcoming } from '../services/tmdb.service.js';

const router = Router();

router.get('/trending', async (req, res) => {
  try {
    const { timeWindow = 'week' } = req.query;
    const data = await getTrending('movie', timeWindow);
    res.json(data);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch trending movies' }); }
});

router.get('/popular', async (req, res) => {
  try { res.json(await getPopular('movie', req.query.page)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || req.query.query;
    const page = req.query.page;
    if (!q) return res.status(400).json({ error: 'Query required' });
    res.json(await searchMovies(q, page));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/now-playing', async (req, res) => {
  try { res.json(await getNowPlaying(req.query.page)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/top-rated', async (req, res) => {
  try { res.json(await getTopRated('movie', req.query.page)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/upcoming', async (req, res) => {
  try { res.json(await getUpcoming(req.query.page)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});


router.get('/discover', async (req, res) => {
  try {
    const { discoverMovies } = await import('../services/tmdb.service.js');
    const { page, with_genres, sort_by, vote_average_gte, year } = req.query;
    res.json(await discoverMovies({ page, with_genres, sort_by, 'vote_average.gte': vote_average_gte, primary_release_year: year }));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/genres', async (req, res) => {
  try {
    const { getGenres } = await import('../services/tmdb.service.js');
    res.json(await getGenres('movie'));
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/:id', async (req, res) => {
  try { res.json(await getMovieDetails(req.params.id)); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
