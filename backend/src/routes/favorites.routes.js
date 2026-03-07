import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware.js';
import pool from '../config/database.js';

const router = Router();

// Get user favorites
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM favorites WHERE user_id = $1 ORDER BY added_at DESC',
      [req.user.userId]
    );
    res.json({ favorites: rows, total: rows.length });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Check if item is favorited
router.get('/check/:tmdbId/:mediaType', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM favorites WHERE user_id=$1 AND tmdb_id=$2 AND media_type=$3',
      [req.user.userId, req.params.tmdbId, req.params.mediaType]
    );
    res.json({ isFavorite: rows.length > 0 });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Add to favorites
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { tmdbId, mediaType, title, posterPath } = req.body;
    if (!tmdbId || !mediaType) return res.status(400).json({ error: 'Missing tmdbId/mediaType' });
    const { rows } = await pool.query(
      `INSERT INTO favorites (user_id, tmdb_id, media_type, title, poster_path)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id, tmdb_id, media_type) DO NOTHING RETURNING *`,
      [req.user.userId, tmdbId, mediaType, title || null, posterPath || null]
    );
    res.json({ success: true, favorite: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Remove from favorites
router.delete('/:tmdbId/:mediaType', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM favorites WHERE user_id=$1 AND tmdb_id=$2 AND media_type=$3',
      [req.user.userId, req.params.tmdbId, req.params.mediaType]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
