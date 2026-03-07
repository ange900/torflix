import WebTorrent from 'webtorrent';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const CACHE_DIR = process.env.TORRENT_CACHE_DIR || '/tmp/streampanel-cache';
const MAX_CACHE_SIZE = parseInt(process.env.MAX_CACHE_GB || '10') * 1024 * 1024 * 1024;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity

// Video file extensions
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.webm', '.m4v', '.mov', '.wmv', '.flv', '.ts'];
const SUBTITLE_EXTENSIONS = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];

class StreamingEngine extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.sessions = new Map(); // sessionId -> session data
    this.cleanupInterval = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    this.client = new WebTorrent({
      maxConns: 100,
      uploadLimit: 1024 * 100, // 100 KB/s upload limit
      downloadLimit: -1, // Unlimited download
      path: CACHE_DIR,
    });

    this.client.on('error', (err) => {
      console.error('[StreamEngine] Client error:', err.message);
    });

    // Cleanup inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupSessions(), 5 * 60 * 1000);

    this.initialized = true;
    console.log('[StreamEngine] Initialized with cache at', CACHE_DIR);
  }

  // Start a new streaming session
  async startSession(magnetUri, options = {}) {
    await this.initialize();

    const { fileIndex = -1, userId = null } = options;
    const sessionId = uuidv4();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Torrent metadata timeout (30s)'));
      }, 120000);

      // Check if torrent already exists
      const existingTorrent = this.client.torrents.find(t => t.magnetURI === magnetUri);

      const handleTorrent = (torrent) => {
        clearTimeout(timeout);

        // Find the video file
        const videoFiles = torrent.files.filter(f =>
          VIDEO_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext))
        );

        if (videoFiles.length === 0) {
          this.client.remove(torrent.infoHash);
          reject(new Error('No video files found in torrent'));
          return;
        }

        // Select file (by index or largest video)
        let selectedFile;
        if (fileIndex >= 0 && fileIndex < torrent.files.length) {
          selectedFile = torrent.files[fileIndex];
        } else {
          // Pick the largest video file
          selectedFile = videoFiles.reduce((a, b) => a.length > b.length ? a : b);
        }

        // Prioritize sequential download for selected file
        selectedFile.select();

        // Deselect other files
        torrent.files.forEach(f => {
          if (f !== selectedFile) f.deselect();
        });

        // Find subtitles
        const subtitleFiles = torrent.files.filter(f =>
          SUBTITLE_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext))
        );

        const session = {
          id: sessionId,
          torrent,
          file: selectedFile,
          subtitleFiles,
          userId,
          magnetUri,
          infoHash: torrent.infoHash,
          fileName: selectedFile.name,
          fileSize: selectedFile.length,
          fileIndex: torrent.files.indexOf(selectedFile),
          mimeType: getMimeType(selectedFile.name),
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          status: 'buffering',
          allFiles: torrent.files.map((f, i) => ({
            index: i,
            name: f.name,
            size: f.length,
            sizeFormatted: formatBytes(f.length),
            isVideo: VIDEO_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext)),
            isSubtitle: SUBTITLE_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext)),
          })),
        };

        this.sessions.set(sessionId, session);

        // Monitor progress
        const progressInterval = setInterval(() => {
          if (!this.sessions.has(sessionId)) {
            clearInterval(progressInterval);
            return;
          }
          session.status = torrent.progress > 0.01 ? 'streaming' : 'buffering';
          session.lastActiveAt = Date.now();
        }, 2000);

        session._progressInterval = progressInterval;

        resolve({
          sessionId,
          infoHash: torrent.infoHash,
          fileName: selectedFile.name,
          fileSize: selectedFile.length,
          fileSizeFormatted: formatBytes(selectedFile.length),
          mimeType: session.mimeType,
          streamUrl: `/api/stream/${sessionId}`,
          subtitles: subtitleFiles.map((sf, i) => ({
            index: i,
            name: sf.name,
            url: `/api/stream/${sessionId}/subtitle/${i}`,
            language: detectSubtitleLanguage(sf.name),
          })),
          files: session.allFiles,
        });
      };

      if (existingTorrent && existingTorrent.ready) {
        handleTorrent(existingTorrent);
      } else if (existingTorrent) {
        existingTorrent.once('ready', () => handleTorrent(existingTorrent));
      } else {
        try {
          this.client.add(magnetUri, { path: CACHE_DIR }, handleTorrent);
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      }
    });
  }

  // Get stream for HTTP range requests
  getStream(sessionId, range = null) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.lastActiveAt = Date.now();
    const file = session.file;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
      const chunkSize = end - start + 1;

      return {
        stream: file.createReadStream({ start, end }),
        start,
        end,
        chunkSize,
        fileSize: file.length,
        mimeType: session.mimeType,
      };
    }

    return {
      stream: file.createReadStream(),
      fileSize: file.length,
      mimeType: session.mimeType,
    };
  }

  // Get subtitle stream
  getSubtitleStream(sessionId, subtitleIndex) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const subFile = session.subtitleFiles[subtitleIndex];
    if (!subFile) return null;

    session.lastActiveAt = Date.now();

    return {
      stream: subFile.createReadStream(),
      name: subFile.name,
      mimeType: subFile.name.endsWith('.vtt') ? 'text/vtt' : 'application/x-subrip',
    };
  }

  // Get session status
  getSessionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const torrent = session.torrent;
    return {
      sessionId,
      status: session.status,
      fileName: session.fileName,
      fileSize: session.fileSize,
      fileSizeFormatted: formatBytes(session.fileSize),
      mimeType: session.mimeType,
      progress: Math.round(torrent.progress * 10000) / 100,
      downloadSpeed: torrent.downloadSpeed,
      downloadSpeedFormatted: formatSpeed(torrent.downloadSpeed),
      uploadSpeed: torrent.uploadSpeed,
      uploadSpeedFormatted: formatSpeed(torrent.uploadSpeed),
      peers: torrent.numPeers,
      ratio: torrent.ratio,
      timeRemaining: torrent.timeRemaining,
      downloaded: torrent.downloaded,
      downloadedFormatted: formatBytes(torrent.downloaded),
    };
  }

  // Stop a session
  stopSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session._progressInterval) {
      clearInterval(session._progressInterval);
    }

    this.sessions.delete(sessionId);

    // Remove torrent if no other sessions use it
    const torrentInUse = Array.from(this.sessions.values())
      .some(s => s.infoHash === session.infoHash);

    if (!torrentInUse && session.torrent) {
      try {
        this.client.remove(session.torrent.infoHash);
        console.log(`[StreamEngine] Removed torrent ${session.infoHash}`);
      } catch (err) {
        console.error('[StreamEngine] Error removing torrent:', err.message);
      }
    }
  }

  // Cleanup inactive sessions
  cleanupSessions() {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActiveAt > SESSION_TIMEOUT) {
        console.log(`[StreamEngine] Cleaning up inactive session ${id}`);
        this.stopSession(id);
      }
    }

    // Cleanup cache if too large
    this.cleanupCache();
  }

  async cleanupCache() {
    try {
      const stats = await getDirSize(CACHE_DIR);
      if (stats > MAX_CACHE_SIZE) {
        console.log(`[StreamEngine] Cache size ${formatBytes(stats)} exceeds limit ${formatBytes(MAX_CACHE_SIZE)}, cleaning...`);
        // Remove oldest files
        const files = fs.readdirSync(CACHE_DIR);
        const fileStats = files.map(f => {
          const fp = path.join(CACHE_DIR, f);
          const stat = fs.statSync(fp);
          return { path: fp, mtime: stat.mtime, size: stat.size };
        }).sort((a, b) => a.mtime - b.mtime);

        let freed = 0;
        const target = stats - MAX_CACHE_SIZE * 0.7; // Free to 70%
        for (const f of fileStats) {
          if (freed >= target) break;
          try {
            fs.rmSync(f.path, { recursive: true });
            freed += f.size;
          } catch (e) { /* ignore */ }
        }
        console.log(`[StreamEngine] Freed ${formatBytes(freed)}`);
      }
    } catch (err) {
      // Cache dir might not exist yet
    }
  }

  // Get all active sessions
  getActiveSessions() {
    return Array.from(this.sessions.values()).map(s => ({
      sessionId: s.id,
      fileName: s.fileName,
      fileSize: formatBytes(s.fileSize),
      userId: s.userId,
      status: s.status,
      peers: s.torrent?.numPeers || 0,
      progress: Math.round((s.torrent?.progress || 0) * 100),
      createdAt: s.createdAt,
    }));
  }

  async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Stop all sessions
    for (const [id] of this.sessions) {
      this.stopSession(id);
    }

    if (this.client) {
      return new Promise(resolve => {
        this.client.destroy(resolve);
      });
    }
  }
}

// Utility functions
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.webm': 'video/webm',
    '.m4v': 'video/mp4',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.ts': 'video/mp2t',
  };
  return types[ext] || 'video/mp4';
}

function detectSubtitleLanguage(filename) {
  const lower = filename.toLowerCase();
  if (/\bfre?n?ch?\b|\.fr\.|_fr_|\bfra?\b/.test(lower)) return 'fr';
  if (/\beng?\b|\.en\.|_en_/.test(lower)) return 'en';
  if (/\bita?\b|\.it\.|_it_/.test(lower)) return 'it';
  if (/\bspa?\b|\.es\.|_es_/.test(lower)) return 'es';
  if (/\bger?\b|\.de\.|_de_|deutsch/.test(lower)) return 'de';
  return 'unknown';
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatSpeed(bytesPerSec) {
  if (!bytesPerSec) return '0 KB/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

async function getDirSize(dir) {
  let size = 0;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fp = path.join(dir, file);
      const stat = fs.statSync(fp);
      size += stat.isDirectory() ? await getDirSize(fp) : stat.size;
    }
  } catch (e) { /* ignore */ }
  return size;
}

// Singleton instance
const streamingEngine = new StreamingEngine();
export default streamingEngine;
