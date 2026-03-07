import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import { PassThrough } from 'stream';

const sessions = new Map();
const CACHE_DIR = process.env.STREAM_CACHE_DIR || path.join(os.tmpdir(), 'streampanel-cache');
const SESSION_TIMEOUT = 30 * 60 * 1000;

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

let WebTorrent = null;
let client = null;

async function getClient() {
  if (!client) {
    if (!WebTorrent) {
      const mod = await import('webtorrent');
      WebTorrent = mod.default || mod;
    }
    client = new WebTorrent({ maxConns: 100, uploadLimit: 1024 * 512, torrentPort: 6881, dhtPort: 6882 });
    client.on('error', (err) => console.error('[WebTorrent] Error:', err.message));
    console.log('[WebTorrent] Client initialized');
  }
  return client;
}

const VIDEO_EXT = ['.mp4', '.mkv', '.avi', '.webm', '.m4v', '.mov'];
const NATIVE_BROWSER = ['.mp4', '.webm'];

function findVideoFile(torrent) {
  if (!torrent || !torrent.files || !Array.isArray(torrent.files)) return null;
  const vids = torrent.files.filter(f => VIDEO_EXT.includes(path.extname(f.name).toLowerCase()));
  return vids.length ? vids.sort((a, b) => b.length - a.length)[0] : null;
}

function needsTranscoding(filename) {
  return false; // Pas de transcoding - ExoPlayer gère tous les formats
}

export async function startStream(magnetUri, sessionId) {
  if (sessions.has(sessionId)) {
    const s = sessions.get(sessionId);
    s.lastActivity = Date.now();
    return s;
  }

  const wt = await getClient();

  const infoHash = magnetUri.match(/btih:([a-fA-F0-9]+)/i)?.[1]?.toLowerCase();
  if (infoHash) {
    // Réutiliser session existante si même torrent déjà actif
    const existingSession = [...sessions.values()].find(s => 
      s.torrent?.infoHash === infoHash
    );
    if (existingSession) {
      console.log('[Stream] Reusing existing session for infoHash:', infoHash);
      const reusedSession = { ...existingSession, id: sessionId };
      sessions.set(sessionId, reusedSession);
      return reusedSession;
    }
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Torrent timeout (30s)')), 120000);

    console.log('[Stream] Adding torrent for session', sessionId);

    try {
      const torrent = wt.add(magnetUri, {
        path: path.join(CACHE_DIR, sessionId),
        destroyStoreOnDestroy: true,
      });
      // Session provisoire immédiate
      const earlySession = {
        id: sessionId, torrent, videoFile: null,
        filename: 'Chargement...', fileSize: 0,
        needsTranscoding: false, ready: false,
        lastActivity: Date.now(),
        progress: 0, downloadSpeed: 0, numPeers: 0,
      };
      sessions.set(sessionId, earlySession);
      torrent.on('download', () => {
        earlySession.progress = torrent.progress;
        earlySession.downloadSpeed = torrent.downloadSpeed;
        earlySession.numPeers = torrent.numPeers;
      });
      torrent.on('ready', () => {
        clearTimeout(timeout);
        console.log('[Stream] Torrent ready:', torrent.name, '- Files:', torrent.files?.length);

        const videoFile = findVideoFile(torrent);
        if (!videoFile) {
          torrent.destroy();
          reject(new Error('No video file found'));
          return;
        }

        videoFile.select();
        torrent.files.forEach(f => { if (f !== videoFile) f.deselect(); });

        const transcode = needsTranscoding(videoFile.name);
        console.log('[Stream] File:', videoFile.name, '- Transcode:', transcode);

        const session = {
          id: sessionId, torrent, videoFile,
          filename: videoFile.name,
          fileSize: videoFile.length,
          needsTranscoding: transcode,
          lastActivity: Date.now(),
        };
        sessions.set(sessionId, session);

        torrent.on('download', () => {
          session.progress = torrent.progress;
          session.downloadSpeed = torrent.downloadSpeed;
          session.numPeers = torrent.numPeers;
        });

        resolve(session);
      });

      torrent.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

export function createVideoStream(sessionId, range) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  s.lastActivity = Date.now();

  const file = s.videoFile;
  const fileSize = file.length;
  let start = 0, end = fileSize - 1;

  if (range) {
    const p = range.replace(/bytes=/, '').split('-');
    start = parseInt(p[0], 10);
    end = p[1] ? parseInt(p[1], 10) : fileSize - 1;
  }

  if (s.needsTranscoding) {
    console.log('[Stream] Transcoding', s.filename, 'from byte', start);
    const input = file.createReadStream({ start });
    const pt = new PassThrough();

    // Transcode to browser-compatible h264/aac MP4
    const ffArgs = [
      '-i', 'pipe:0',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k',
      '-movflags', 'frag_keyframe+empty_moov+faststart',
      '-vf', 'scale=-2:720',
      '-f', 'mp4',
      '-threads', '2',
      'pipe:1'
    ];

    const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

    input.pipe(ff.stdin);
    ff.stdout.pipe(pt);

    ff.stdin.on('error', () => {});
    ff.stdout.on('error', () => {});
    ff.stderr.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('Error') || msg.includes('error')) console.error('[FFmpeg]', msg.trim());
    });
    ff.on('close', () => { try { pt.end(); } catch {} });
    pt.on('close', () => { try { input.destroy(); ff.kill('SIGTERM'); } catch {} });
    input.on('error', () => { try { ff.kill('SIGTERM'); pt.end(); } catch {} });

    return {
      stream: pt,
      headers: { 'Content-Type': 'video/x-matroska', 'Transfer-Encoding': 'chunked' },
      statusCode: 200,
    };
  }

  // Native MP4 - serve with range support
  const stream = file.createReadStream({ start, end });
  stream.on('error', (err) => console.error('[Stream] Read error:', err.message));

  return {
    stream,
    headers: {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + fileSize,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4',
    },
    statusCode: range ? 206 : 200,
  };
}

export function getSessionInfo(sid) {
  const s = sessions.get(sid);
  if (!s) return null;
  return {
    id: s.id, filename: s.filename, fileSize: s.fileSize,
    progress: s.torrent?.progress || 0,
    downloadSpeed: s.torrent?.downloadSpeed || 0,
    numPeers: s.torrent?.numPeers || 0,
    needsTranscoding: s.needsTranscoding,
    ready: s.needsTranscoding ? (s.progress > 0) : (s.progress > 0.005),
  };
}

export function stopStream(sid) {
  const s = sessions.get(sid);
  if (!s) return;
  try { s.torrent.destroy({ destroyStore: true }); } catch {}
  sessions.delete(sid);
  const d = path.join(CACHE_DIR, sid);
  if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
}

export function getActiveSessions() {
  return Array.from(sessions.values()).map(s => ({
    id: s.id, filename: s.filename,
    progress: s.torrent?.progress || 0,
    numPeers: s.torrent?.numPeers || 0,
    downloadSpeed: s.torrent?.downloadSpeed || 0,
  }));
}

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastActivity > SESSION_TIMEOUT) stopStream(id);
  }
}, 60000);

// Start stream from .torrent file buffer (for indexers without magnet)
export async function startStreamFromTorrentFile(torrentBuffer, sessionId) {
  if (sessions.has(sessionId)) {
    const s = sessions.get(sessionId);
    s.lastActivity = Date.now();
    return s;
  }

  const wt = await getClient();
  // Vérifier duplicate via wt.torrents
  try {
    const existingTorrent = wt.torrents.find(t => {
      try { return t.torrentFile && Buffer.compare(t.torrentFile.slice(0,50), torrentBuffer.slice(0,50)) === 0; } catch { return false; }
    });
    if (existingTorrent) {
      const existingSession = [...sessions.values()].find(s => s.torrent?.infoHash === existingTorrent.infoHash);
      if (existingSession) {
        console.log('[Stream] Reusing duplicate torrent session');
        const reused = { ...existingSession, id: sessionId };
        sessions.set(sessionId, reused);
        return reused;
      }
      try { existingTorrent.destroy({ destroyStore: false }); } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
  } catch {}
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Torrent timeout (30s)')), 120000);

    console.log('[Stream] Adding torrent file buffer for session', sessionId);

    try {
      const torrent = wt.add(torrentBuffer, {
        path: path.join(CACHE_DIR, sessionId),
        destroyStoreOnDestroy: true,
      });

      torrent.on('ready', () => {
        clearTimeout(timeout);
        console.log('[Stream] Torrent ready:', torrent.name, '- Files:', torrent.files?.length);

        const videoFile = findVideoFile(torrent);
        if (!videoFile) { torrent.destroy(); reject(new Error('No video file found')); return; }

        videoFile.select();
        torrent.files.forEach(f => { if (f !== videoFile) f.deselect(); });

        const transcode = needsTranscoding(videoFile.name);
        console.log('[Stream] File:', videoFile.name, '- Transcode:', transcode);

        const session = {
          id: sessionId, torrent, videoFile,
          filename: videoFile.name, fileSize: videoFile.length,
          needsTranscoding: transcode, lastActivity: Date.now(),
        };
        sessions.set(sessionId, session);

        torrent.on('download', () => {
          session.progress = torrent.progress;
          session.downloadSpeed = torrent.downloadSpeed;
          session.numPeers = torrent.numPeers;
        });

        resolve(session);
      });

      torrent.on('error', (err) => { clearTimeout(timeout); reject(err); });
    } catch (err) { clearTimeout(timeout); reject(err); }
  });
}

// Subtitle support
const SUB_EXT = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];

export function getSubtitleFiles(sessionId) {
  const s = sessions.get(sessionId);
  if (!s || !s.torrent) return [];
  return s.torrent.files
    .filter(f => SUB_EXT.includes(path.extname(f.name).toLowerCase()))
    .map((f, i) => {
      const name = path.basename(f.name, path.extname(f.name));
      let lang = 'Unknown';
      const n = name.toLowerCase();
      if (n.includes('french') || n.includes('fre') || n.includes('.fr')) lang = 'Français';
      else if (n.includes('english') || n.includes('eng') || n.includes('.en')) lang = 'English';
      else if (n.includes('spanish') || n.includes('spa') || n.includes('.es')) lang = 'Español';
      else if (n.includes('forced')) lang = 'Forcés';
      return { index: i, filename: f.name, lang, size: f.length };
    });
}

export async function getSubtitleStream(sessionId, index) {
  const s = sessions.get(sessionId);
  if (!s || !s.torrent) return null;
  const subFiles = s.torrent.files.filter(f => SUB_EXT.includes(path.extname(f.name).toLowerCase()));
  if (index < 0 || index >= subFiles.length) return null;
  const file = subFiles[index];
  const ext = path.extname(file.name).toLowerCase();
  const stream = file.createReadStream();

  if (ext === '.vtt') return stream;

  // Convert SRT to VTT on the fly
  if (ext === '.srt') {
    const { PassThrough } = await import('stream');
    const pt = new PassThrough();
    let data = '';
    stream.on('data', chunk => data += chunk.toString());
    stream.on('end', () => {
      // Simple SRT to VTT conversion
      let vtt = 'WEBVTT\n\n' + data
        .replace(/\r\n/g, '\n')
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
      pt.end(vtt);
    });
    stream.on('error', err => pt.destroy(err));
    return pt;
  }

  return stream;
}

// Pré-charger un torrent en arrière-plan
export function preloadTorrent(magnetUri) {
  if (!magnetUri) return;
  const existing = [...sessions.values()].find(s => s.torrent?.magnetURI === magnetUri);
  if (existing) return; // déjà en cache

  const sessionId = 'preload_' + Date.now();
  wt.add(magnetUri, {
    path: path.join(CACHE_DIR, sessionId),
    destroyStoreOnDestroy: true,
  }, (torrent) => {
    const videoFile = findVideoFile(torrent);
    if (!videoFile) { torrent.destroy(); return; }
    videoFile.select();
    torrent.files.forEach(f => { if (f !== videoFile) f.deselect(); });
    sessions.set(sessionId, {
      id: sessionId, torrent, videoFile,
      filename: videoFile.name,
      fileSize: videoFile.length,
      needsTranscoding: false,
      lastActivity: Date.now(),
      preloaded: true,
    });
    console.log('[Stream] Pré-chargé:', torrent.name);
    // Nettoyer après 10 min si pas utilisé
    setTimeout(() => {
      const s = sessions.get(sessionId);
      if (s?.preloaded) { try { s.torrent.destroy(); } catch {} sessions.delete(sessionId); }
    }, 600000);
  });
}
