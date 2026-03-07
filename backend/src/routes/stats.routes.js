import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware.js';
import pool from '../config/database.js';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const uid = req.user.userId;
    const [totalWatch, genres, monthly, favorites] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total_items, COALESCE(SUM(duration_seconds),0) as total_seconds, COALESCE(SUM(position_seconds),0) as watched_seconds, COUNT(CASE WHEN completed THEN 1 END) as completed FROM playback_positions WHERE user_id=$1`, [uid]),
      pool.query(`SELECT content_type, COUNT(*) as count FROM playback_positions WHERE user_id=$1 GROUP BY content_type`, [uid]),
      pool.query(`SELECT DATE_TRUNC('month', updated_at) as month, COUNT(*) as count, COALESCE(SUM(position_seconds),0) as seconds FROM playback_positions WHERE user_id=$1 AND updated_at > NOW() - INTERVAL '6 months' GROUP BY month ORDER BY month DESC`, [uid]),
      pool.query(`SELECT COUNT(*) as count FROM favorites WHERE user_id=$1`, [uid]),
    ]);
    const s = totalWatch.rows[0];
    const totalHours = Math.round(parseFloat(s.watched_seconds) / 3600);
    const typeBreakdown = {};
    genres.rows.forEach(r => { typeBreakdown[r.content_type] = parseInt(r.count); });
    res.json({
      totalItems: parseInt(s.total_items),
      totalHoursWatched: totalHours,
      totalMinutesWatched: Math.round(parseFloat(s.watched_seconds) / 60),
      completed: parseInt(s.completed),
      favorites: parseInt(favorites.rows[0].count),
      typeBreakdown,
      monthly: monthly.rows.map(r => ({
        month: r.month, count: parseInt(r.count),
        hours: Math.round(parseFloat(r.seconds) / 3600),
      })),
    });
  } catch (err) { console.error('[Stats]', err); res.status(500).json({ error: 'Failed' }); }
});

export default router;
