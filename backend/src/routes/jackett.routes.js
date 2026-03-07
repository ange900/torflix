import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware.js';
import { getJackettIndexers, getAvailableJackettIndexers, addJackettIndexer, removeJackettIndexer } from '../services/jackett.service.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try { res.json({ indexers: await getJackettIndexers() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/available', async (req, res) => {
  try { res.json({ indexers: await getAvailableJackettIndexers() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/:id', async (req, res) => {
  try { res.json(await addJackettIndexer(req.params.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.delete('/:id', async (req, res) => {
  try { res.json(await removeJackettIndexer(req.params.id)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
