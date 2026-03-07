import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware.js';
import pool from '../config/database.js';
const router = Router();

// Get ratings for a content
router.get('/:tmdbId/:mediaType', async (req, res) => {
  try {
    const { tmdbId, mediaType } = req.params;
    const { rows } = await pool.query(
      `SELECT r.*, u.username FROM ratings r JOIN users u ON r.user_id = u.id WHERE r.tmdb_id=$1 AND r.media_type=$2 ORDER BY r.created_at DESC`,
      [tmdbId, mediaType]
    );
    const avg = rows.length > 0 ? rows.reduce((a, b) => a + b.rating, 0) / rows.length : 0;
    res.json({ ratings: rows, average: Math.round(avg * 10) / 10, total: rows.length });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Add/update rating
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { tmdbId, mediaType, rating, review } = req.body;
    if (!tmdbId || !mediaType || !rating) return res.status(400).json({ error: 'Missing fields' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const { rows } = await pool.query(
      `INSERT INTO ratings (user_id, tmdb_id, media_type, rating, review)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, tmdb_id, media_type)
       DO UPDATE SET rating=$4, review=$5, updated_at=NOW() RETURNING *`,
      [req.user.userId, tmdbId, mediaType, rating, review || null]
    );
    res.json({ success: true, rating: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Delete rating
router.delete('/:tmdbId/:mediaType', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM ratings WHERE user_id=$1 AND tmdb_id=$2 AND media_type=$3',
      [req.user.userId, req.params.tmdbId, req.params.mediaType]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
