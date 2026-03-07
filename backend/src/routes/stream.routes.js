import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { startStream, startStreamFromTorrentFile, createVideoStream, getSessionInfo, stopStream, getActiveSessions, getSubtitleFiles, getSubtitleStream } from '../services/stream.service.js';
import axios from 'axios';
import http from 'http';
import https from 'https';

const router = Router();

router.post('/start', async (req, res) => {
  try {
    const { magnet, downloadUrl, torrentBase64 } = req.body;
    const sessionId = uuidv4();
    let session;

    if (torrentBase64) {
      // Direct torrent file from frontend resolve
      const buf = Buffer.from(torrentBase64, 'base64');
      session = await startStreamFromTorrentFile(buf, sessionId);
    } else if (magnet && (magnet.trim().startsWith('magnet:') || magnet.includes('xt=urn:btih'))) {
      // Direct magnet
      session = await startStream(magnet, sessionId);
    } else if (downloadUrl && (downloadUrl.trim().startsWith('magnet:') || downloadUrl.includes('xt=urn:btih'))) {
      // downloadUrl is actually a magnet link
      session = await startStream(downloadUrl.trim(), sessionId);
    } else if (downloadUrl) {
      // Download .torrent file from Jackett and add to WebTorrent
      console.log('[Stream] Resolving downloadUrl:', downloadUrl.slice(0, 80));
      try {
        // Résoudre redirection magnet via http natif
        let resolvedMagnet = null;
        await new Promise((resolve) => {
          const mod = downloadUrl.startsWith('https') ? https : http;
          const req = mod.get(downloadUrl, (res) => {
            const loc = res.headers['location'] || '';
            if (loc.startsWith('magnet:') || loc.includes('xt=urn:btih')) resolvedMagnet = loc;
            res.resume();
            resolve();
          });
          req.on('error', () => resolve());
          req.setTimeout(8000, () => { req.destroy(); resolve(); });
        });
        if (resolvedMagnet) {
          console.log('[Stream] Magnet redirect OK:', resolvedMagnet.slice(0, 60));
          session = await startStream(resolvedMagnet.trim(), sessionId);
        } else {
          const response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 15000, maxRedirects: 10 });
          const torrentBuf = Buffer.from(response.data);
          const text = torrentBuf.toString('utf-8', 0, 200);
          if (text.trim().startsWith('magnet:') || text.includes('xt=urn:btih')) {
            session = await startStream(text.trim().split('\n')[0], sessionId);
          } else {
            session = await startStreamFromTorrentFile(torrentBuf, sessionId);
          }
        }
      } catch (dlErr) {
        console.error('[Stream] Download URL failed:', dlErr.message);
        return res.status(500).json({ error: 'Failed to download torrent file: ' + dlErr.message });
      }
    } else {
      return res.status(400).json({ error: 'magnet or downloadUrl required' });
    }

    res.json({
      sessionId,
      filename: session.filename,
      fileSize: session.fileSize,
      needsTranscoding: session.needsTranscoding,
      streamUrl: `/api/stream/${sessionId}/video`,
      statusUrl: `/api/stream/${sessionId}/status`,
    });
  } catch (err) {
    console.error('[Stream Start]', err.message);
    res.status(500).json({ error: err.message || 'Failed to start stream' });
  }
});

router.get('/:sessionId/video', (req, res) => {
  try {
    const result = createVideoStream(req.params.sessionId, req.headers.range);
    if (!result) return res.status(404).json({ error: 'Session not found' });
    res.writeHead(result.statusCode, result.headers);
    result.stream.on('error', (err) => {
      console.error('[Stream Video] Error:', err.message);
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    res.on('close', () => { try { result.stream.unpipe(res); } catch {} });
    result.stream.pipe(res, { end: true });
  } catch (err) {
    console.error('[Stream Video]', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Stream error' });
  }
});

router.get('/:sessionId/status', (req, res) => {
  const info = getSessionInfo(req.params.sessionId);
  if (!info) return res.status(404).json({ error: 'Not found' });
  res.json(info);
});

router.delete('/:sessionId', (req, res) => {
  stopStream(req.params.sessionId);
  res.json({ success: true });
});

router.get('/sessions/active', (req, res) => {
  res.json({ sessions: getActiveSessions() });
});

export default router;

// Get available subtitles for a session
router.get('/:sessionId/subtitles', (req, res) => {
  try {
    const info = getSessionInfo(req.params.sessionId);
    if (!info) return res.status(404).json({ error: 'Session not found' });
    // Get subtitle files from the torrent
    const subs = getSubtitleFiles(req.params.sessionId);
    res.json({ subtitles: subs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get subtitles' });
  }
});

// Stream a subtitle file as VTT
router.get('/:sessionId/subtitle/:index', async (req, res) => {
  try {
    const subStream = await getSubtitleStream(req.params.sessionId, parseInt(req.params.index));
    if (!subStream) return res.status(404).json({ error: 'Subtitle not found' });
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    subStream.pipe(res);
  } catch (err) {
    console.error('[Subtitle]', err);
    res.status(500).json({ error: 'Failed' });
  }
});
