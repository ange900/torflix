import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware.js';
import pool from '../config/database.js';
const router = Router();
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT content_mode, language_pref FROM users WHERE id=$1`, [req.user.userId]);
    res.json(rows[0] || { content_mode: 'all', language_pref: 'fr' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { content_mode, language_pref } = req.body;
    const updates = []; const values = []; let i = 1;
    if (content_mode) { updates.push(`content_mode=$${i++}`); values.push(content_mode); }
    if (language_pref) { updates.push(`language_pref=$${i++}`); values.push(language_pref); }
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(req.user.userId);
    const { rows } = await pool.query(`UPDATE users SET ${updates.join(',')} WHERE id=$${i} RETURNING content_mode,language_pref`, values);
    res.json({ success: true, prefs: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});
export default router;
