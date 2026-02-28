const router = require('express').Router();
const WebTorrent = require('webtorrent');
const { requireAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// ── WebTorrent client singleton ──
let client = null;
const activeTorrents = new Map(); // torrentId -> { torrent, timeout }

function getClient() {
  if (!client) {
    client = new WebTorrent({
      maxConns: 100,
      uploadLimit: 0, // No upload
    });
    client.on('error', (err) => console.error('[WebTorrent] Error:', err.message));
  }
  return client;
}

// ── Cleanup old torrents after 2h of inactivity ──
function scheduleCleanup(torrentId) {
  const existing = activeTorrents.get(torrentId);
  if (existing?.timeout) clearTimeout(existing.timeout);

  const timeout = setTimeout(() => {
    const entry = activeTorrents.get(torrentId);
    if (entry?.torrent) {
      console.log(`[Stream] Cleaning up inactive torrent: ${torrentId.substring(0, 8)}...`);
      entry.torrent.destroy();
      activeTorrents.delete(torrentId);
    }
  }, 2 * 60 * 60 * 1000); // 2 hours

  if (existing) {
    existing.timeout = timeout;
  }
}

// ── Find the largest video file in torrent ──
function findVideoFile(torrent) {
  const videoExts = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v', '.wmv', '.flv', '.ts', '.mpg', '.mpeg', '.3gp', '.ogv'];
  const files = torrent.files.filter(f => {
    const ext = path.extname(f.name).toLowerCase();
    return videoExts.includes(ext);
  });
  // Return largest video file
  return files.sort((a, b) => b.length - a.length)[0] || null;
}

// ── GET /api/stream/start ── (start torrent & get stream info)
router.get('/start', requireAuth, async (req, res, next) => {
  try {
    const { magnet } = req.query;
    if (!magnet) return res.status(400).json({ error: 'Magnet link manquant.' });

    const wt = getClient();

    // Check if already downloading
    const existingTorrent = wt.torrents.find(t => t.magnetURI === magnet);
    if (existingTorrent) {
      const videoFile = findVideoFile(existingTorrent);
      if (videoFile) {
        scheduleCleanup(existingTorrent.infoHash);
        return res.json({
          infoHash: existingTorrent.infoHash,
          name: existingTorrent.name,
          videoFile: videoFile.name,
          size: videoFile.length,
          progress: existingTorrent.progress,
          downloadSpeed: existingTorrent.downloadSpeed,
          numPeers: existingTorrent.numPeers,
          streamUrl: `/api/stream/video/${existingTorrent.infoHash}`,
        });
      }
    }

    // Add new torrent
    const torrent = await new Promise((resolve, reject) => {
      const t = wt.add(magnet, {
        path: '/tmp/torflix-cache',
        strategy: 'sequential', // Sequential download for streaming
      });

      t.on('ready', () => resolve(t));
      t.on('error', reject);

      // Timeout after 30s
      setTimeout(() => reject(new Error('Timeout: impossible de charger le torrent')), 30000);
    });

    const videoFile = findVideoFile(torrent);
    if (!videoFile) {
      torrent.destroy();
      return res.status(404).json({ error: 'Aucun fichier vidéo trouvé dans ce torrent.' });
    }

    // Prioritize sequential download
    videoFile.select();

    activeTorrents.set(torrent.infoHash, { torrent, timeout: null });
    scheduleCleanup(torrent.infoHash);

    res.json({
      infoHash: torrent.infoHash,
      name: torrent.name,
      videoFile: videoFile.name,
      size: videoFile.length,
      progress: torrent.progress,
      downloadSpeed: torrent.downloadSpeed,
      numPeers: torrent.numPeers,
      streamUrl: `/api/stream/video/${torrent.infoHash}`,
    });
  } catch (err) { next(err); }
});

// ── GET /api/stream/video/:infoHash ── (HTTP range streaming)
router.get('/video/:infoHash', requireAuth, (req, res) => {
  const wt = getClient();
  const torrent = wt.torrents.find(t => t.infoHash === req.params.infoHash);

  if (!torrent) {
    return res.status(404).json({ error: 'Torrent non trouvé. Relancez le streaming.' });
  }

  const videoFile = findVideoFile(torrent);
  if (!videoFile) {
    return res.status(404).json({ error: 'Fichier vidéo non trouvé.' });
  }

  scheduleCleanup(torrent.infoHash);

  const fileSize = videoFile.length;
  const range = req.headers.range;

  // Content type based on extension
  const ext = path.extname(videoFile.name).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
    '.webm': 'video/webm', '.mov': 'video/quicktime', '.m4v': 'video/mp4',
    '.wmv': 'video/x-ms-wmv', '.flv': 'video/x-flv', '.ts': 'video/mp2t',
    '.mpg': 'video/mpeg', '.mpeg': 'video/mpeg', '.3gp': 'video/3gpp', '.ogv': 'video/ogg',
  };
  const contentType = mimeTypes[ext] || 'video/mp4';

  if (range) {
    // Range request (seeking)
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    const stream = videoFile.createReadStream({ start, end });
    stream.pipe(res);
    stream.on('error', () => res.end());
  } else {
    // Full file request
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    const stream = videoFile.createReadStream();
    stream.pipe(res);
    stream.on('error', () => res.end());
  }
});

// ── GET /api/stream/status/:infoHash ── (get streaming stats)
router.get('/status/:infoHash', requireAuth, (req, res) => {
  const wt = getClient();
  const torrent = wt.torrents.find(t => t.infoHash === req.params.infoHash);

  if (!torrent) {
    return res.status(404).json({ error: 'Torrent non actif.' });
  }

  res.json({
    infoHash: torrent.infoHash,
    progress: torrent.progress,
    downloadSpeed: torrent.downloadSpeed,
    uploadSpeed: torrent.uploadSpeed,
    numPeers: torrent.numPeers,
    downloaded: torrent.downloaded,
    timeRemaining: torrent.timeRemaining,
    ready: torrent.progress > 0.02, // ~2% buffered = ready to play
  });
});

// ── DELETE /api/stream/:infoHash ── (stop streaming)
router.delete('/:infoHash', requireAuth, (req, res) => {
  const wt = getClient();
  const torrent = wt.torrents.find(t => t.infoHash === req.params.infoHash);

  if (torrent) {
    const entry = activeTorrents.get(torrent.infoHash);
    if (entry?.timeout) clearTimeout(entry.timeout);
    activeTorrents.delete(torrent.infoHash);
    torrent.destroy();
  }

  res.json({ message: 'Streaming arrêté.' });
});

module.exports = router;
