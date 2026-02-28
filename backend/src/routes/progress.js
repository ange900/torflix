const router = require('express').Router();
const { query } = require('../models/db');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/progress ── (tous les contenus en cours)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM watch_progress 
       WHERE user_id = $1 AND completed = FALSE AND progress > 0.01
       ORDER BY last_watched_at DESC 
       LIMIT 20`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/progress/recent ── (récemment vus, terminés inclus)
router.get('/recent', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM watch_progress 
       WHERE user_id = $1 
       ORDER BY last_watched_at DESC 
       LIMIT 20`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── GET /api/progress/:tmdbId ── (progression d'un contenu spécifique)
router.get('/:tmdbId', requireAuth, async (req, res, next) => {
  try {
    const { season, episode } = req.query;
    let sql = 'SELECT * FROM watch_progress WHERE user_id = $1 AND tmdb_id = $2';
    const params = [req.user.id, req.params.tmdbId];

    if (season !== undefined) {
      sql += ' AND season_number = $3';
      params.push(season);
    }
    if (episode !== undefined) {
      sql += ` AND episode_number = $${params.length + 1}`;
      params.push(episode);
    }

    const result = await query(sql, params);
    res.json(result.rows[0] || null);
  } catch (err) { next(err); }
});

// ── PUT /api/progress/:tmdbId ── (sauvegarder la position — appelé toutes les 10s)
router.put('/:tmdbId', requireAuth, async (req, res, next) => {
  try {
    const { tmdbId } = req.params;
    const {
      media_type = 'movie',
      season_number = null,
      episode_number = null,
      current_time_seconds,
      total_duration_seconds,
      torrent_source,
      quality,
      lang,
    } = req.body;

    if (current_time_seconds === undefined || total_duration_seconds === undefined) {
      return res.status(400).json({ error: 'current_time_seconds et total_duration_seconds requis.' });
    }

    const progress = total_duration_seconds > 0 
      ? Math.min(current_time_seconds / total_duration_seconds, 1) 
      : 0;
    
    // Mark as completed if >90%
    const completed = progress > 0.9;

    const result = await query(
      `INSERT INTO watch_progress 
       (user_id, tmdb_id, media_type, season_number, episode_number, 
        current_time_seconds, total_duration_seconds, progress, completed, 
        torrent_source, quality, lang, last_watched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       ON CONFLICT (user_id, tmdb_id, season_number, episode_number) 
       DO UPDATE SET 
        current_time_seconds = $6,
        total_duration_seconds = $7,
        progress = $8,
        completed = $9,
        torrent_source = COALESCE($10, watch_progress.torrent_source),
        quality = COALESCE($11, watch_progress.quality),
        lang = COALESCE($12, watch_progress.lang),
        last_watched_at = NOW()
       RETURNING *`,
      [req.user.id, tmdbId, media_type, season_number, episode_number,
       current_time_seconds, total_duration_seconds, progress, completed,
       torrent_source, quality, lang]
    );

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── DELETE /api/progress/:tmdbId ── (supprimer la progression)
router.delete('/:tmdbId', requireAuth, async (req, res, next) => {
  try {
    await query(
      'DELETE FROM watch_progress WHERE user_id = $1 AND tmdb_id = $2',
      [req.user.id, req.params.tmdbId]
    );
    res.json({ message: 'Progression supprimée.' });
  } catch (err) { next(err); }
});

module.exports = router;
