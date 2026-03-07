import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware.js';
import pool from '../config/database.js';

const router = Router();

// Init table
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(500) NOT NULL,
      message TEXT,
      image_url VARCHAR(500),
      link VARCHAR(500),
      tmdb_id INTEGER,
      media_type VARCHAR(10),
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at DESC);
  `);
  console.log('[Notifications] Table ready');
}
init().catch(e => console.error('[Notifications] Init:', e));

// Get notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, unread_only } = req.query;
    let q = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [req.user.userId];
    if (unread_only === 'true') q += ' AND is_read = false';
    q += ' ORDER BY created_at DESC LIMIT $2';
    params.push(parseInt(limit));
    const { rows } = await pool.query(q, params);
    const countRes = await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.userId]);
    res.json({ notifications: rows, unread_count: parseInt(countRes.rows[0].count) });
  } catch (err) { console.error('[Notifications]', err); res.status(500).json({ error: 'Failed' }); }
});

// Mark one as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Mark all as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [req.user.userId]);
    res.json({ success: true, count: result.rowCount });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Delete one
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Clear all
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM notifications WHERE user_id = $1', [req.user.userId]);
    res.json({ success: true, count: result.rowCount });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ============================================
// INTERNAL: Create notification (called by services)
// ============================================
export async function createNotification(userId, { type, title, message, imageUrl, link, tmdbId, mediaType }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, image_url, link, tmdb_id, media_type) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [userId, type, title, message, imageUrl || null, link || null, tmdbId || null, mediaType || null]
    );
    return rows[0];
  } catch (err) { console.error('[Notification Create]', err); return null; }
}

// ============================================
// RECOMMENDATION ENGINE (simple, TMDB-based)
// ============================================
router.post('/generate-recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    // Get user's watched content
    const { rows: watched } = await pool.query(
      'SELECT tmdb_id, content_type FROM playback_positions WHERE user_id = $1 GROUP BY tmdb_id, content_type ORDER BY MAX(updated_at) DESC LIMIT 10',
      [userId]
    );
    if (!watched.length) return res.json({ generated: 0, message: 'Regardez du contenu pour recevoir des recommandations' });

    const axios = (await import('axios')).default;
    const TMDB_KEY = process.env.TMDB_API_KEY || 'af8e4dcd14c8e141b9757afaa86ccd05';
    let generated = 0;

    // Get recommendations for last 3 watched items
    for (const item of watched.slice(0, 3)) {
      try {
        const type = item.content_type === 'tv' ? 'tv' : 'movie';
        const { data } = await axios.get(`https://api.themoviedb.org/3/${type}/${item.tmdb_id}/recommendations`, {
          params: { api_key: TMDB_KEY, language: 'fr-FR', page: 1 }
        });
        const recs = (data.results || []).slice(0, 2);
        for (const rec of recs) {
          // Check if already notified
          const exists = await pool.query(
            'SELECT id FROM notifications WHERE user_id=$1 AND tmdb_id=$2 AND type=$3',
            [userId, rec.id, 'recommendation']
          );
          if (exists.rows.length) continue;
          const title = rec.title || rec.name;
          const poster = rec.poster_path ? `https://image.tmdb.org/t/p/w200${rec.poster_path}` : null;
          await createNotification(userId, {
            type: 'recommendation',
            title: `💡 Recommandé pour vous`,
            message: `${title} — ${(rec.overview || '').slice(0, 100)}...`,
            imageUrl: poster,
            link: `/watch/${type}/${rec.id}`,
            tmdbId: rec.id,
            mediaType: type,
          });
          generated++;
        }
      } catch {}
    }
    res.json({ generated, message: `${generated} recommandation(s) générée(s)` });
  } catch (err) { console.error('[Recommendations]', err); res.status(500).json({ error: 'Failed' }); }
});

// ============================================
// NEW EPISODES CHECKER
// ============================================
router.post('/check-new-episodes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    // Get TV shows the user has watched
    const { rows: tvShows } = await pool.query(
      "SELECT DISTINCT tmdb_id, title, MAX(season_number) as last_season, MAX(episode_number) as last_episode FROM playback_positions WHERE user_id=$1 AND content_type='tv' GROUP BY tmdb_id, title",
      [userId]
    );
    if (!tvShows.length) return res.json({ generated: 0 });

    const axios = (await import('axios')).default;
    const TMDB_KEY = process.env.TMDB_API_KEY || 'af8e4dcd14c8e141b9757afaa86ccd05';
    let generated = 0;

    for (const show of tvShows.slice(0, 10)) {
      try {
        const { data } = await axios.get(`https://api.themoviedb.org/3/tv/${show.tmdb_id}`, {
          params: { api_key: TMDB_KEY, language: 'fr-FR' }
        });
        const lastSeason = data.seasons?.filter(s => s.season_number > 0).pop();
        if (!lastSeason) continue;

        // Check if there are new episodes
        const hasNewSeason = lastSeason.season_number > (show.last_season || 0);
        const airDate = lastSeason.air_date ? new Date(lastSeason.air_date) : null;
        const isRecent = airDate && (new Date() - airDate) < 30 * 24 * 60 * 60 * 1000; // 30 days

        if (hasNewSeason || isRecent) {
          const exists = await pool.query(
            "SELECT id FROM notifications WHERE user_id=$1 AND tmdb_id=$2 AND type='new_episode' AND created_at > NOW() - INTERVAL '7 days'",
            [userId, show.tmdb_id]
          );
          if (exists.rows.length) continue;

          const poster = data.poster_path ? `https://image.tmdb.org/t/p/w200${data.poster_path}` : null;
          await createNotification(userId, {
            type: 'new_episode',
            title: `📺 Nouvel épisode disponible`,
            message: `${data.name} — Saison ${lastSeason.season_number} (${lastSeason.episode_count} épisodes)`,
            imageUrl: poster,
            link: `/watch/tv/${show.tmdb_id}?season=${lastSeason.season_number}`,
            tmdbId: show.tmdb_id,
            mediaType: 'tv',
          });
          generated++;
        }
      } catch {}
    }
    res.json({ generated });
  } catch (err) { console.error('[NewEpisodes]', err); res.status(500).json({ error: 'Failed' }); }
});

export default router;
