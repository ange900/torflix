import { Router } from 'express';
import { searchTorrents, selectBestTorrent, get1337xMagnet } from '../services/torrent.service.js';
import axios from 'axios';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const { q, category = 'Movies', language, quality, minSeeders } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ error: 'Query too short' });
    const results = await searchTorrents(q, { category, language, quality, minSeeders: parseInt(minSeeders) || 0 });
    const best = selectBestTorrent(results, language || 'all');
    res.json({ query: q, total: results.length, best: best ? { ...best, isBest: true } : null, results });
  } catch (err) { console.error('[Torrent Search]', err); res.status(500).json({ error: 'Search failed' }); }
});

// Resolve a download URL to magnet link
router.post('/resolve', async (req, res) => {
  try {
    const { downloadUrl } = req.body;
    if (!downloadUrl) return res.status(400).json({ error: 'downloadUrl required' });

    console.log('[Torrent] Resolving:', downloadUrl);

    // Intercepter redirect vers magnet:
    let magnetUrl = null;
    try {
      await axios.get(downloadUrl, { maxRedirects: 0, validateStatus: s => s >= 200 && s < 400, timeout: 5000 });
    } catch(e) {
      const loc = e.response?.headers?.location;
      if (loc?.startsWith('magnet:')) magnetUrl = loc;
    }
    if (magnetUrl) {
      console.log('[Torrent Resolve] Magnet intercepted from redirect');
      return res.json({ magnet: magnetUrl });
    }

    // Download the .torrent file from Jackett
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxRedirects: 5,
    });

    const buf = Buffer.from(response.data);

    // Try to parse with parse-torrent
    try {
      const parseTorrent = (await import('parse-torrent')).default;
      const parsed = parseTorrent(buf);
      if (parsed.infoHash) {
        const magnet = parseTorrent.toMagnetURI(parsed);
        console.log('[Torrent] Resolved magnet for hash:', parsed.infoHash);
        return res.json({ magnet, infoHash: parsed.infoHash });
      }
    } catch (parseErr) {
      console.log('[Torrent] parse-torrent failed, trying manual extraction');
    }

    // Fallback: extract infoHash manually from bencode
    // Look for infohash in the response or construct from torrent data
    // Many Jackett download links redirect to magnet links
    const text = buf.toString('utf-8', 0, Math.min(buf.length, 200));
    if (text.startsWith('magnet:')) {
      return res.json({ magnet: text.trim() });
    }

    // If we got a torrent file, pass it as base64 for WebTorrent
    const base64 = buf.toString('base64');
    return res.json({ torrentBase64: base64, message: 'Torrent file resolved (no magnet)' });

  } catch (err) {
    console.error('[Torrent Resolve]', err.message);
    res.status(500).json({ error: 'Failed to resolve: ' + err.message });
  }
});

router.post('/magnet', async (req, res) => {
  try {
    const { detailUrl, source } = req.body;
    if (!detailUrl) return res.status(400).json({ error: 'detailUrl required' });
    let magnet = null;
    if (source === '1337x') magnet = await get1337xMagnet(detailUrl);
    if (!magnet) return res.status(404).json({ error: 'Magnet not found' });
    res.json({ magnet });
  } catch (err) { console.error('[Magnet]', err); res.status(500).json({ error: 'Failed' }); }
});

export default router;
