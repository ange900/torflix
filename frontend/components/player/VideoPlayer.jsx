'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize, SkipBack, SkipForward, Settings, Monitor, Subtitles, ArrowLeft, Loader2, Gauge } from 'lucide-react';

const BACKEND = typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':4000') : '';

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}

export default function VideoPlayer({
  streamUrl, sessionId, title, subtitle, posterUrl,
  initialPosition = 0, duration = 0,
  onPositionUpdate, onEnded, onClose,
  mediaType, tmdbId, seasonNumber, episodeNumber,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const hideTimer = useRef(null);
  const skipAnim = useRef(null);

  // Core state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(duration);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced features
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('main');
  const [streamStatus, setStreamStatus] = useState(null);
  const [showStreamInfo, setShowStreamInfo] = useState(false);
  const [showResume, setShowResume] = useState(initialPosition > 30);
  const [skipDirection, setSkipDirection] = useState(null);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Subtitles
  const [subtitles, setSubtitles] = useState([]);
  const [activeSubtitle, setActiveSubtitle] = useState(-1);
  const [showSubMenu, setShowSubMenu] = useState(false);

  // ========================
  // POSITION SAVE (every 10s)
  // ========================
  const savePosition = useCallback(() => {
    if (!videoRef.current || !onPositionUpdate) return;
    const pos = videoRef.current.currentTime;
    const dur = videoRef.current.duration || videoDuration;
    if (pos > 0) onPositionUpdate(pos, dur);
  }, [onPositionUpdate, videoDuration]);

  useEffect(() => {
    const i = setInterval(savePosition, 10000);
    return () => clearInterval(i);
  }, [savePosition]);

  useEffect(() => {
    const h = () => savePosition();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [savePosition]);

  // ========================
  // RESUME DIALOG
  // ========================
  const handleResume = (resume) => {
    setShowResume(false);
    if (resume && videoRef.current) videoRef.current.currentTime = initialPosition;
    videoRef.current?.play();
  };

  // ========================
  // STREAM STATUS POLLING
  // ========================
  useEffect(() => {
    if (!sessionId) return;
    const i = setInterval(async () => {
      try {
        const r = await fetch(`${BACKEND}/api/stream/${sessionId}/status`);
        if (r.ok) setStreamStatus(await r.json());
      } catch {}
    }, 3000);
    return () => clearInterval(i);
  }, [sessionId]);

  // ========================
  // LOAD SUBTITLES
  // ========================
  useEffect(() => {
    if (!sessionId) return;
    async function loadSubs() {
      try {
        const r = await fetch(`${BACKEND}/api/stream/${sessionId}/subtitles`);
        if (r.ok) {
          const data = await r.json();
          setSubtitles(data.subtitles || []);
        }
      } catch {}
    }
    // Delay to let torrent metadata load
    const t = setTimeout(loadSubs, 5000);
    return () => clearTimeout(t);
  }, [sessionId]);

  // ========================
  // Apply subtitle track
  // ========================
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    // Remove existing tracks
    while (video.firstChild) video.removeChild(video.firstChild);
    // Add active subtitle
    if (activeSubtitle >= 0 && subtitles[activeSubtitle]) {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = subtitles[activeSubtitle].lang;
      track.src = `${BACKEND}/api/stream/${sessionId}/subtitle/${activeSubtitle}`;
      track.default = true;
      video.appendChild(track);
      // Force show
      setTimeout(() => {
        if (video.textTracks[0]) video.textTracks[0].mode = 'showing';
      }, 100);
    }
  }, [activeSubtitle, subtitles, sessionId]);

  // ========================
  // KEYBOARD SHORTCUTS
  // ========================
  useEffect(() => {
    const handleKey = (e) => {
      if (!videoRef.current) return;
      const v = videoRef.current;
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); isPlaying ? v.pause() : v.play(); break;
        case 'ArrowRight': e.preventDefault(); skip(10); break;
        case 'ArrowLeft': e.preventDefault(); skip(-10); break;
        case 'ArrowUp': e.preventDefault(); setVolume(prev => Math.min(1, prev + 0.1)); break;
        case 'ArrowDown': e.preventDefault(); setVolume(prev => Math.max(0, prev - 0.1)); break;
        case 'f': e.preventDefault(); toggleFullscreen(); break;
        case 'm': e.preventDefault(); setIsMuted(m => !m); break;
        case 'j': e.preventDefault(); skip(-10); break;
        case 'l': e.preventDefault(); skip(10); break;
        case 'c': e.preventDefault(); setShowSubMenu(s => !s); break;
        case 'i': e.preventDefault(); setShowStreamInfo(s => !s); break;
        case 'Escape': e.preventDefault(); if (showSettings) setShowSettings(false); else if (onClose) { savePosition(); onClose(); } break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPlaying, showSettings]);

  // ========================
  // VOLUME SYNC
  // ========================
  useEffect(() => {
    if (videoRef.current) { videoRef.current.volume = volume; videoRef.current.muted = isMuted; }
  }, [volume, isMuted]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // ========================
  // CONTROLS AUTO-HIDE
  // ========================
  const resetHide = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isPlaying && !showSettings && !showSubMenu) setShowControls(false);
    }, 3500);
  }, [isPlaying, showSettings, showSubMenu]);

  // ========================
  // SKIP WITH ANIMATION
  // ========================
  const skip = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoDuration, videoRef.current.currentTime + seconds));
    setSkipDirection(seconds > 0 ? 'forward' : 'back');
    clearTimeout(skipAnim.current);
    skipAnim.current = setTimeout(() => setSkipDirection(null), 600);
    resetHide();
  };

  // ========================
  // FULLSCREEN
  // ========================
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ========================
  // PiP
  // ========================
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      document.pictureInPictureElement ? await document.exitPictureInPicture() : await videoRef.current.requestPictureInPicture();
    } catch {}
  };

  // ========================
  // PROGRESS BAR SEEK
  // ========================
  const handleProgressClick = (e) => {
    if (!progressRef.current || !videoRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * videoDuration;
  };

  const handleProgressHover = (e) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * videoDuration);
    setHoverPos(e.clientX - rect.left);
  };

  // ========================
  // DOUBLE CLICK TO SKIP
  // ========================
  const lastClick = useRef({ time: 0, x: 0 });
  const handleVideoClick = (e) => {
    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const third = rect.width / 3;

    if (now - lastClick.current.time < 300) {
      // Double click
      if (x < third) skip(-10);
      else if (x > third * 2) skip(10);
      else toggleFullscreen();
      lastClick.current.time = 0;
      return;
    }
    lastClick.current = { time: now, x };
    // Single click with delay
    setTimeout(() => {
      if (Date.now() - lastClick.current.time >= 280) {
        isPlaying ? videoRef.current?.pause() : videoRef.current?.play();
      }
    }, 300);
  };

  const handleClose = () => {
    savePosition();
    onClose?.();
  };

  const progress = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;
  const bufferedPct = videoDuration > 0 ? (buffered / videoDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group select-none"
      onMouseMove={resetHide}
      onMouseLeave={() => isPlaying && !showSettings && setShowControls(false)}
    >
      {/* ===== RESUME DIALOG ===== */}
      {showResume && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900/95 rounded-2xl p-8 max-w-md text-center space-y-4 border border-white/10">
            <h3 className="text-xl font-bold text-white">Reprendre la lecture ?</h3>
            <p className="text-zinc-400">Reprendre à <span className="text-white font-mono bg-white/10 px-2 py-1 rounded">{formatTime(initialPosition)}</span></p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => handleResume(true)} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-all hover:scale-105">▶ Reprendre</button>
              <button onClick={() => handleResume(false)} className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl transition-all">Depuis le début</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VIDEO ELEMENT ===== */}
      <video
        ref={videoRef}
        src={streamUrl}
        poster={posterUrl}
        className="w-full h-full cursor-pointer"
        onClick={handleVideoClick}
        onPlay={() => { setIsPlaying(true); setIsLoading(false); }}
        onPause={() => { setIsPlaying(false); savePosition(); }}
        onTimeUpdate={() => {
          if (!videoRef.current || isSeeking) return;
          setCurrentTime(videoRef.current.currentTime);
          const b = videoRef.current.buffered;
          if (b.length > 0) setBuffered(b.end(b.length - 1));
        }}
        onDurationChange={() => videoRef.current && setVideoDuration(videoRef.current.duration)}
        onEnded={() => { savePosition(); onEnded?.(); }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onSeeking={() => setIsSeeking(true)}
        onSeeked={() => setIsSeeking(false)}
        playsInline
        crossOrigin="anonymous"
      />

      {/* ===== LOADING SPINNER ===== */}
      {isLoading && !showResume && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-14 h-14 text-red-500 animate-spin" />
            {streamStatus && streamStatus.progress < 0.05 && (
              <p className="text-white/60 text-sm">Connexion aux pairs... {streamStatus.numPeers} peer{streamStatus.numPeers !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      )}

      {/* ===== SKIP ANIMATIONS ===== */}
      {skipDirection === 'back' && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-none animate-ping">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <SkipBack className="w-8 h-8 text-white" />
          </div>
        </div>
      )}
      {skipDirection === 'forward' && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none animate-ping">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <SkipForward className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* ===== STREAM INFO OVERLAY ===== */}
      {showStreamInfo && streamStatus && (
        <div className="absolute top-16 right-4 bg-black/80 backdrop-blur-sm rounded-xl px-4 py-3 text-xs text-zinc-300 space-y-1.5 font-mono border border-white/10 z-30">
          <p className="text-white font-semibold text-sm mb-2">Stream Info</p>
          <p>⬇ Vitesse: <span className="text-green-400">{(streamStatus.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s</span></p>
          <p>👥 Peers: <span className="text-blue-400">{streamStatus.numPeers}</span></p>
          <p>📦 Téléchargé: <span className="text-yellow-400">{(streamStatus.progress * 100).toFixed(1)}%</span></p>
          <p>📄 Fichier: <span className="text-zinc-400">{streamStatus.filename?.slice(0, 40)}</span></p>
          <p>🎬 Transcodage: <span className={streamStatus.needsTranscoding ? 'text-orange-400' : 'text-green-400'}>{streamStatus.needsTranscoding ? 'Oui' : 'Non'}</span></p>
          <p className="text-zinc-600 mt-2">Appuyez sur [i] pour fermer</p>
        </div>
      )}

      {/* ===== CONTROLS OVERLAY ===== */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        {/* TOP BAR */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 pb-16 flex items-center gap-4">
          <button onClick={handleClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-base font-semibold truncate">{title}</h2>
            {subtitle && <p className="text-zinc-400 text-xs">{subtitle}</p>}
            {mediaType === 'tv' && seasonNumber && episodeNumber && (
              <p className="text-zinc-400 text-xs">Saison {seasonNumber}, Épisode {episodeNumber}</p>
            )}
          </div>
          {/* Stream status badge */}
          {streamStatus && streamStatus.progress < 0.99 && (
            <button onClick={() => setShowStreamInfo(s => !s)} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg text-xs text-zinc-300 hover:bg-white/20 transition-all">
              <Gauge className="w-3.5 h-3.5" />
              <span>{(streamStatus.downloadSpeed / 1024 / 1024).toFixed(1)} MB/s</span>
              <span className="text-zinc-500">|</span>
              <span>{streamStatus.numPeers} peers</span>
            </button>
          )}
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16">

          {/* PROGRESS BAR */}
          <div
            ref={progressRef}
            className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer group/bar mb-4 relative hover:h-2.5 transition-all"
            onClick={handleProgressClick}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Buffered */}
            <div className="absolute h-full bg-white/20 rounded-full transition-all" style={{ width: `${bufferedPct}%` }} />
            {/* Progress */}
            <div className="absolute h-full bg-red-500 rounded-full transition-[width] duration-100" style={{ width: `${progress}%` }}>
              {/* Scrubber dot */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-red-500 rounded-full shadow-lg opacity-0 group-hover/bar:opacity-100 transition-all scale-0 group-hover/bar:scale-100" />
            </div>
            {/* Hover time tooltip */}
            {hoverTime !== null && (
              <div className="absolute -top-10 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none" style={{ left: `${hoverPos}px` }}>
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Play/Pause */}
            <button onClick={() => isPlaying ? videoRef.current?.pause() : videoRef.current?.play()} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-all">
              {isPlaying ? <Pause className="w-6 h-6 text-white fill-white" /> : <Play className="w-6 h-6 text-white fill-white ml-0.5" />}
            </button>

            {/* Skip back */}
            <button onClick={() => skip(-10)} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-all" title="-10s (J)">
              <SkipBack className="w-4.5 h-4.5 text-white" />
            </button>

            {/* Skip forward */}
            <button onClick={() => skip(10)} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-all" title="+10s (L)">
              <SkipForward className="w-4.5 h-4.5 text-white" />
            </button>

            {/* Time */}
            <span className="text-white text-xs font-mono ml-1">
              {formatTime(currentTime)} <span className="text-zinc-500">/</span> {formatTime(videoDuration)}
            </span>

            <div className="flex-1" />

            {/* Subtitles */}
            <div className="relative">
              <button
                onClick={() => { setShowSubMenu(s => !s); setShowSettings(false); }}
                className={`w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-all ${activeSubtitle >= 0 ? 'text-red-400' : 'text-white'}`}
                title="Sous-titres (C)"
              >
                <Subtitles className="w-4.5 h-4.5" />
              </button>
              {showSubMenu && (
                <div className="absolute bottom-12 right-0 bg-zinc-900/95 backdrop-blur-sm rounded-xl p-2 min-w-[180px] shadow-2xl border border-white/10 z-40">
                  <p className="text-zinc-400 text-xs px-3 py-1.5 font-semibold">Sous-titres</p>
                  <button onClick={() => { setActiveSubtitle(-1); setShowSubMenu(false); }} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${activeSubtitle === -1 ? 'bg-red-600 text-white' : 'text-zinc-300 hover:bg-white/5'}`}>
                    Désactivés
                  </button>
                  {subtitles.map((s, i) => (
                    <button key={i} onClick={() => { setActiveSubtitle(i); setShowSubMenu(false); }} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${activeSubtitle === i ? 'bg-red-600 text-white' : 'text-zinc-300 hover:bg-white/5'}`}>
                      {s.lang} <span className="text-zinc-500 text-xs">({s.filename.split('/').pop()})</span>
                    </button>
                  ))}
                  {subtitles.length === 0 && <p className="text-zinc-600 text-xs px-3 py-2">Aucun sous-titre disponible</p>}
                </div>
              )}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1 group/vol">
              <button onClick={() => setIsMuted(m => !m)} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-all text-white" title="Muet (M)">
                {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : volume > 0.5 ? <Volume2 className="w-4.5 h-4.5" /> : <Volume1 className="w-4.5 h-4.5" />}
              </button>
              <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200">
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={e => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
                  className="w-20 h-1 accent-red-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Settings */}
            <div className="relative">
              <button onClick={() => { setShowSettings(s => !s); setShowSubMenu(false); setSettingsTab('main'); }} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-all text-white" title="Paramètres">
                <Settings className={`w-4.5 h-4.5 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`} />
              </button>
              {showSettings && (
                <div className="absolute bottom-12 right-0 bg-zinc-900/95 backdrop-blur-sm rounded-xl p-2 min-w-[200px] shadow-2xl border border-white/10 z-40">
                  {settingsTab === 'main' && (
                    <>
                      <button onClick={() => setSettingsTab('speed')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/5 transition">
                        <span>Vitesse</span>
                        <span className="text-zinc-500">{playbackRate}x</span>
                      </button>
                      <button onClick={() => setShowStreamInfo(s => { setShowSettings(false); return !s; })} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/5 transition">
                        <span>Infos stream</span>
                        <span className="text-zinc-500">[i]</span>
                      </button>
                      <button onClick={() => { togglePiP(); setShowSettings(false); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:bg-white/5 transition">
                        <span>Picture-in-Picture</span>
                      </button>
                    </>
                  )}
                  {settingsTab === 'speed' && (
                    <>
                      <button onClick={() => setSettingsTab('main')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-white/5 transition mb-1">
                        ← Vitesse
                      </button>
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                        <button key={s} onClick={() => { setPlaybackRate(s); setShowSettings(false); }} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${playbackRate === s ? 'bg-red-600 text-white' : 'text-zinc-300 hover:bg-white/5'}`}>
                          {s}x{s === 1 ? ' (Normal)' : ''}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* PiP */}
            <button onClick={togglePiP} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-all text-white hidden md:flex" title="Picture-in-Picture">
              <Monitor className="w-4.5 h-4.5" />
            </button>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-all text-white" title="Plein écran (F)">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ===== KEYBOARD SHORTCUTS HINT (shows briefly) ===== */}
      <style jsx global>{`
        video::cue {
          background: rgba(0,0,0,0.7);
          color: white;
          font-size: 1.1em;
          line-height: 1.4;
          padding: 4px 8px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
