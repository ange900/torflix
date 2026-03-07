import { Router } from 'express';
import { authenticateToken, authorize } from '../auth/auth.middleware.js';
import pool from '../config/database.js';
import { getActiveSessions } from '../services/stream.service.js';
const router = Router();
router.use(authenticateToken);
router.use(authorize('admin'));
// ==================== DASHBOARD STATS ====================
router.get('/stats', async (req, res) => {
  try {
    const [usersCount, streamsActive, notifCount, playbackCount] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      Promise.resolve(getActiveSessions ? getActiveSessions() : []),
      pool.query('SELECT COUNT(*) FROM notifications').catch(() => ({ rows: [{ count: 0 }] })),
      pool.query('SELECT COUNT(*) FROM playback_positions'),
    ]);
    // Recent signups (last 7 days)
    const recentUsers = await pool.query("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'");
    // Storage usage estimate
    const dbSize = await pool.query("SELECT pg_size_pretty(pg_database_size('torflix')) as size");
    res.json({
      users: {
        total: parseInt(usersCount.rows[0].count),
        recent: parseInt(recentUsers.rows[0].count),
      },
      streams: {
        active: Array.isArray(streamsActive) ? streamsActive.length : 0,
        sessions: Array.isArray(streamsActive) ? streamsActive : [],
      },
      content: {
        playbackEntries: parseInt(playbackCount.rows[0].count),
        notifications: parseInt(notifCount.rows[0].count),
      },
      system: {
        dbSize: dbSize.rows[0].size,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    });
  } catch (err) {
    console.error('[Admin Stats]', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});
// ==================== USER MANAGEMENT ====================
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let q = 'SELECT id, username, email, role, avatar_url, created_at, last_login FROM users';
    const params = [];
    if (search) {
      q += ' WHERE username ILIKE $1 OR email ILIKE $1';
      params.push(`%${search}%`);
    }
    q += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    const { rows } = await pool.query(q, params);
    // Count total
    let countQ = 'SELECT COUNT(*) FROM users';
    const countParams = [];
    if (search) { countQ += ' WHERE username ILIKE $1 OR email ILIKE $1'; countParams.push(`%${search}%`); }
    const count = await pool.query(countQ, countParams);
    // Stats - skip if type mismatch
    for (const user of rows) {
      user.stats = { watched: 0, completed: 0 };
    }
    res.json({ users: rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[Admin Users]', err);
    res.status(500).json({ error: 'Failed' });
  }
});
// Update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (req.params.id === req.user.userId) return res.status(400).json({ error: 'Cannot change own role' });
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
    await pool.query('DELETE FROM playback_positions WHERE user_id = $1', [req.params.id]);
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [req.params.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
// Disable/Enable user (set role to 'disabled')
router.put('/users/:id/toggle', async (req, res) => {
  try {
    if (req.params.id === req.user.userId) return res.status(400).json({ error: 'Cannot disable yourself' });
    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const newRole = rows[0].role === 'disabled' ? 'user' : 'disabled';
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, req.params.id]);
    res.json({ success: true, role: newRole });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
// ==================== STREAM MANAGEMENT ====================
router.get('/streams', async (req, res) => {
  try {
    const sessions = getActiveSessions ? getActiveSessions() : [];
    res.json({ streams: sessions });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
// Kill a stream
router.delete('/streams/:sessionId', async (req, res) => {
  try {
    const { destroySession } = await import('../services/stream.service.js');
    if (destroySession) destroySession(req.params.sessionId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
// ==================== SYSTEM INFO ====================
router.get('/system', async (req, res) => {
  try {
    const os = await import('os');
    res.json({
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      loadAvg: os.loadavg(),
      nodeVersion: process.version,
      processUptime: process.uptime(),
      processMemory: process.memoryUsage(),
    });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
export default router;
