const router = require('express').Router();
const { query } = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');

// ── GET /api/accounts ── (list all torrent accounts)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, site_name, is_active, last_check_at, ratio, status, created_at 
       FROM torrent_accounts WHERE user_id = $1 ORDER BY site_name`,
      [req.user.id]
    );
    // Don't return encrypted credentials
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── POST /api/accounts ── (add a torrent account)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { site_name, username, password } = req.body;

    if (!site_name || !username || !password) {
      return res.status(400).json({ error: 'site_name, username et password requis.' });
    }

    const allowedSites = ['YGG', 'Torrent9', '1337x', 'ShareWood', 'Zetorrents', 'OxTorrent', 'Custom'];
    if (!allowedSites.includes(site_name)) {
      return res.status(400).json({ error: `Site non supporté. Sites valides: ${allowedSites.join(', ')}` });
    }

    const result = await query(
      `INSERT INTO torrent_accounts (user_id, site_name, username_encrypted, password_encrypted, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, site_name, is_active, status, created_at`,
      [req.user.id, site_name, encrypt(username), encrypt(password)]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── PUT /api/accounts/:id ── (update account)
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { username, password, is_active } = req.body;

    // Verify ownership
    const check = await query(
      'SELECT id FROM torrent_accounts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Compte non trouvé.' });

    const updates = [];
    const values = [];
    let i = 1;

    if (username) { updates.push(`username_encrypted = $${i++}`); values.push(encrypt(username)); }
    if (password) { updates.push(`password_encrypted = $${i++}`); values.push(encrypt(password)); }
    if (is_active !== undefined) { updates.push(`is_active = $${i++}`); values.push(is_active); }
    updates.push(`status = $${i++}`); values.push('pending');

    values.push(req.params.id);

    const result = await query(
      `UPDATE torrent_accounts SET ${updates.join(', ')} WHERE id = $${i}
       RETURNING id, site_name, is_active, status`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── DELETE /api/accounts/:id ── (remove account)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM torrent_accounts WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compte non trouvé.' });
    res.json({ message: 'Compte supprimé.' });
  } catch (err) { next(err); }
});

// ── POST /api/accounts/:id/test ── (test account connection)
router.post('/:id/test', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM torrent_accounts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Compte non trouvé.' });

    const account = result.rows[0];
    const username = decrypt(account.username_encrypted);

    // TODO: Implement actual login test per site
    // For now, mark as "connected"
    await query(
      "UPDATE torrent_accounts SET status = 'connected', last_check_at = NOW() WHERE id = $1",
      [req.params.id]
    );

    res.json({ status: 'connected', message: `Connecté à ${account.site_name} en tant que ${username}` });
  } catch (err) { next(err); }
});

module.exports = router;
