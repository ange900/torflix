import { Router } from 'express';
import pg from 'pg';
import { authenticateToken as authenticate } from '../auth/auth.middleware.js';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

// Protect all routes
router.use(authenticate);

function fmtTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}

// Save position (accepts both /position and /progress)
async function savePosition(req, res) {
  try {
    const uid = req.user.userId;
    const {
      contentType, content_type, media_type,
      tmdbId, tmdb_id,
      seasonNumber, season_number,
      episodeNumber, episode_number,
      position, watch_position,
      duration, duration_seconds,
      title, posterPath, poster_path,
      backdropPath, backdrop_path,
      magnet, progress
    } = req.body;

    const ct = contentType || content_type || media_type || 'movie';
    const tid = tmdbId || tmdb_id;
    const sn = seasonNumber || season_number || null;
    const en = episodeNumber || episode_number || null;
    const pos = position ?? watch_position ?? 0;
    const dur = duration ?? duration_seconds ?? 0;
    const pp = posterPath || poster_path || null;
    const bp = backdropPath || backdrop_path || null;

    if (!ct || !tid) return res.status(400).json({ error: 'Missing contentType/tmdbId' });

    const completed = dur > 0 && (pos / dur) > 0.9;

    await pool.query(`
      INSERT INTO playback_positions 
        (user_id, content_type, tmdb_id, season_number, episode_number, 
         position_seconds, duration_seconds, completed, title, poster_path, backdrop_path, magnet, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
      ON CONFLICT (user_id, content_type, tmdb_id, season_number, episode_number) 
      DO UPDATE SET 
        position_seconds=$6, duration_seconds=$7, completed=$8,
        title=COALESCE($9, playback_positions.title),
        poster_path=COALESCE($10, playback_positions.poster_path),
        backdrop_path=COALESCE($11, playback_positions.backdrop_path),
        magnet=COALESCE($12, playback_positions.magnet),
        updated_at=NOW()
    `, [uid, ct, tid, sn, en, pos, dur, completed, title||null, pp, bp, magnet||null]);

    res.json({ success: true, completed });
  } catch (err) {
    console.error('[Playback Save]', err.message);
    res.status(500).json({ error: 'Failed to save position' });
  }
}

router.post('/position', savePosition);
router.post('/progress', savePosition); // alias for frontend compatibility

// Get position for specific content
router.get('/position/:contentType/:tmdbId', async (req, res) => {
  try {
    const { contentType, tmdbId } = req.params;
    const { season, episode } = req.query;
    let q = `SELECT * FROM playback_positions WHERE user_id=$1 AND content_type=$2 AND tmdb_id=$3`;
    const p = [req.user.userId, contentType, tmdbId];
    if (season) { q += ` AND season_number=$${p.length+1}`; p.push(season); }
    if (episode) { q += ` AND episode_number=$${p.length+1}`; p.push(episode); }
    q += ` ORDER BY updated_at DESC LIMIT 1`;
    const { rows } = await pool.query(q, p);
    if (rows[0]) {
      rows[0].progress = rows[0].duration_seconds > 0 ? (rows[0].position_seconds / rows[0].duration_seconds) * 100 : 0;
      rows[0].formattedPosition = fmtTime(rows[0].position_seconds);
      rows[0].remainingMinutes = rows[0].duration_seconds > 0 ? Math.ceil((rows[0].duration_seconds - rows[0].position_seconds) / 60) : null;
    }
    res.json(rows[0] || null);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Continue watching (non-completed, >30s watched)
router.get('/continue', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM playback_positions WHERE user_id=$1 AND completed=false AND position_seconds > 30 ORDER BY updated_at DESC LIMIT $2`,
      [req.user.userId, parseInt(req.query.limit) || 20]
    );
    const results = rows.map(r => ({
      ...r,
      progress: r.duration_seconds > 0 ? (r.position_seconds / r.duration_seconds) * 100 : 0,
      remainingMinutes: r.duration_seconds > 0 ? Math.ceil((r.duration_seconds - r.position_seconds) / 60) : null,
      formattedPosition: fmtTime(r.position_seconds)
    }));
    res.json({ results, total: results.length });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// Full history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const { rows } = await pool.query(
      `SELECT * FROM playback_positions WHERE user_id=$1 AND position_seconds > 0 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );
    res.json({
      results: rows.map(r => ({
        ...r,
        progress: r.duration_seconds > 0 ? (r.position_seconds / r.duration_seconds) * 100 : 0,
        formattedPosition: fmtTime(r.position_seconds)
      }))
    });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
