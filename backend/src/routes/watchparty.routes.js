import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware.js';
import pool from '../config/database.js';
const router = Router();
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { tmdbId, mediaType, title, poster, message, maxGuests } = req.body;
    if (!tmdbId || !mediaType) return res.status(400).json({ error: 'Missing fields' });
    await pool.query(`UPDATE watch_parties SET status='closed' WHERE host_id=$1 AND status='open'`, [req.user.userId]);
    const { rows } = await pool.query(
      `INSERT INTO watch_parties (host_id,tmdb_id,media_type,title,poster,message,max_guests) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.userId, tmdbId, mediaType, title, poster, message||null, maxGuests||10]
    );
    res.json({ success: true, party: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT wp.*, u.username as host_name, COUNT(wpg.user_id) as guest_count FROM watch_parties wp JOIN users u ON wp.host_id=u.id LEFT JOIN watch_party_guests wpg ON wp.id=wpg.party_id WHERE wp.status='open' AND wp.expires_at>NOW() GROUP BY wp.id,u.username,u.avatar_url ORDER BY wp.created_at DESC LIMIT 20`
    );
    res.json({ parties: rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
router.post('/:partyId/join', authenticateToken, async (req, res) => {
  try {
    const party = await pool.query(`SELECT wp.*,COUNT(wpg.user_id) as guest_count FROM watch_parties wp LEFT JOIN watch_party_guests wpg ON wp.id=wpg.party_id WHERE wp.id=$1 AND wp.status='open' AND wp.expires_at>NOW() GROUP BY wp.id`, [req.params.partyId]);
    if (!party.rows.length) return res.status(404).json({ error: 'Not found' });
    const p = party.rows[0];
    if (p.guest_count >= p.max_guests) return res.status(400).json({ error: 'Full' });
    await pool.query(`INSERT INTO watch_party_guests (party_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.params.partyId, req.user.userId]);
    res.json({ success: true, party: p });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
router.delete('/:partyId', authenticateToken, async (req, res) => {
  try {
    await pool.query(`UPDATE watch_parties SET status='closed' WHERE id=$1 AND host_id=$2`, [req.params.partyId, req.user.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
export default router;
