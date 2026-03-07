import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, RotateCcw, Subtitles, X, PictureInPicture2, SkipForward } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getStoredAuth } from '../services/auth';

const API = 'https://torfix.xyz';
const OSUB_API = 'https://api.opensubtitles.com/api/v1';

export default function Player() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const link = params.get('magnet') || '';
  const title = params.get('title') || 'TorFlix';
  const resumeAt = parseFloat(params.get('resume') || '0');
  const tmdbId = params.get('tmdbId') || '';
  const contentType = params.get('type') || 'movie';
  const season = params.get('season') || '';
  const episode = params.get('episode') || '';
  const fallbacksParam = params.get('fallbacks') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [status, setStatus] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentLink, setCurrentLink] = useState(link);
  const [fallbacks, setFallbacks] = useState(() => {
    try { return fallbacksParam ? JSON.parse(decodeURIComponent(fallbacksParam)) : []; } catch { return []; }
  });
  const [fallbackIdx, setFallbackIdx] = useState(0);
  const [retrying, setRetrying] = useState(false);

  const [subs, setSubs] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [activeSub, setActiveSub] = useState(null);
  const [pipActive, setPipActive] = useState(false);

  const videoRef = useRef(null);
  const statusInterval = useRef(null);
  const posInterval = useRef(null);

  useEffect(() => {
    if (!currentLink) { setError('Aucun lien torrent'); setLoading(false); return; }
    startStream(currentLink);
    searchSubtitles();
    return () => {
      if (statusInterval.current) clearInterval(statusInterval.current);
      if (posInterval.current) clearInterval(posInterval.current);
      savePosition();
      if (sessionId) fetch(API + '/api/stream/' + sessionId, { method: 'DELETE' }).catch(() => {});
    };
  }, []);

  const onVideoLoaded = useCallback(() => {
    if (videoRef.current && resumeAt > 0) videoRef.current.currentTime = resumeAt;
  }, [resumeAt]);

  const savePosition = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.currentTime || v.currentTime < 5) return;
    const auth = getStoredAuth();
    const token = auth?.tokens?.refreshToken;
    if (!token) return;
    fetch(`${API}/api/playback/position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        contentType, tmdbId: tmdbId || 0, seasonNumber: season ? parseInt(season) : null,
        episodeNumber: episode ? parseInt(episode) : null, position: v.currentTime,
        duration: v.duration || 0, title, magnet: currentLink,
      }),
    }).catch(() => {});
  }, [tmdbId, contentType, season, episode, title, currentLink]);

  useEffect(() => {
    posInterval.current = setInterval(savePosition, 15000);
    return () => { if (posInterval.current) clearInterval(posInterval.current); };
  }, [savePosition]);

  // === Multi-server fallback ===
  const tryNextSource = async () => {
    if (fallbackIdx >= fallbacks.length) {
      setError('Aucune source alternative disponible');
      return;
    }
    setRetrying(true);
    const next = fallbacks[fallbackIdx];
    setFallbackIdx(prev => prev + 1);
    setCurrentLink(next.magnet || next.downloadUrl);
    if (sessionId) await fetch(API + '/api/stream/' + sessionId, { method: 'DELETE' }).catch(() => {});
    startStream(next.magnet || next.downloadUrl);
  };

  const startStream = async (streamLink) => {
    setLoading(true); setError(null); setRetrying(false);
    try {
      const body = streamLink.startsWith('magnet:') ? { magnet: streamLink } : { downloadUrl: streamLink };
      const res = await fetch(API + '/api/stream/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setSessionId(data.sessionId);
      setStreamUrl(API + data.streamUrl);
      setLoading(false);
      if (statusInterval.current) clearInterval(statusInterval.current);
      statusInterval.current = setInterval(async () => {
        try { const sr = await fetch(API + data.statusUrl); setStatus(await sr.json()); } catch {}
      }, 3000);
    } catch (err) { setError(err.message); setLoading(false); }
  };

  // === Picture-in-Picture ===
  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPipActive(false);
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
        setPipActive(true);
        videoRef.current.addEventListener('leavepictureinpicture', () => setPipActive(false), { once: true });
      }
    } catch (e) { console.error('PiP error:', e); }
  };

  // === Subtitles ===
  const searchSubtitles = async () => {
    if (!title) return;
    setSubLoading(true);
    try {
      const q = new URLSearchParams({ query: title.replace(/S\d+E\d+/i, '').trim(), languages: 'fr,en,it,es,de,pt,ar', order_by: 'download_count', order_direction: 'desc' });
      if (tmdbId) q.set('tmdb_id', tmdbId);
      if (season) q.set('season_number', season);
      if (episode) q.set('episode_number', episode);
      const res = await fetch(`${OSUB_API}/subtitles?${q}`, {
        headers: { 'Api-Key': 'bBtRAzLNmXokjT7WLagOYjMR48v8CBgG', 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setSubs((data.data || []).slice(0, 20).map(s => ({
          id: s.id, fileId: s.attributes?.files?.[0]?.file_id, lang: s.attributes?.language || '??',
          langName: s.attributes?.language_name || s.attributes?.language,
          release: s.attributes?.release || '', downloads: s.attributes?.download_count || 0,
        })));
      }
    } catch {}
    setSubLoading(false);
  };

  const activateSubtitle = async (sub) => {
    if (!sub.fileId) return;
    try {
      const res = await fetch(`${OSUB_API}/download`, {
        method: 'POST', headers: { 'Api-Key': 'bBtRAzLNmXokjT7WLagOYjMR48v8CBgG', 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: sub.fileId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.link && videoRef.current) {
          setActiveSub(sub); setShowSubMenu(false);
          const existing = videoRef.current.querySelector('track');
          if (existing) existing.remove();
          const track = document.createElement('track');
          track.kind = 'subtitles'; track.label = sub.langName; track.srclang = sub.lang;
          track.src = data.link; track.default = true;
          videoRef.current.appendChild(track);
          videoRef.current.textTracks[0].mode = 'showing';
        }
      }
    } catch {}
  };

  const disableSubtitles = () => {
    setActiveSub(null); setShowSubMenu(false);
    if (videoRef.current) { for (let i = 0; i < videoRef.current.textTracks.length; i++) videoRef.current.textTracks[i].mode = 'hidden'; }
  };

  const fmt = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB/s' : (b / 1024).toFixed(0) + ' KB/s';
  const pct = (p) => p ? (p * 100).toFixed(1) + '%' : '0%';
  const langFlags = { fr:'🇫🇷',en:'🇬🇧',it:'🇮🇹',es:'🇪🇸',de:'🇩🇪',pt:'🇵🇹',ar:'🇸🇦',ja:'🇯🇵',ko:'🇰🇷',ru:'🇷🇺' };
  const pipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center gap-2 p-4 safe-top z-20">
        <button onClick={() => { savePosition(); nav(-1); }} className="p-2 rounded-full bg-white/10"><ArrowLeft className="w-5 h-5 text-white" /></button>
        <h1 className="text-sm font-semibold text-white truncate flex-1">{title}</h1>
        <div className="flex gap-1">
          {pipSupported && (
            <button onClick={togglePiP} className={`p-2 rounded-full ${pipActive ? 'bg-blue-600' : 'bg-white/10'}`}>
              <PictureInPicture2 className="w-5 h-5 text-white" />
            </button>
          )}
          <button onClick={() => setShowSubMenu(!showSubMenu)} className={`p-2 rounded-full ${activeSub ? 'bg-red-600' : 'bg-white/10'}`}>
            <Subtitles className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {showSubMenu && (
        <div className="absolute top-16 right-4 z-30 w-[280px] max-h-[60vh] bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-bold text-white">Sous-titres</span>
            <button onClick={() => setShowSubMenu(false)}><X className="w-4 h-4 text-zinc-500" /></button>
          </div>
          <div className="overflow-y-auto max-h-[50vh]">
            <button onClick={disableSubtitles} className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 ${!activeSub ? 'bg-red-600/10 text-red-400' : 'text-zinc-400'}`}>
              <span className="text-sm">🚫</span><span className="text-xs font-medium">Désactivés</span>
            </button>
            {subLoading ? (
              <div className="flex items-center gap-2 px-4 py-6 justify-center"><Loader2 className="w-4 h-4 animate-spin text-red-500" /><span className="text-xs text-zinc-400">Recherche...</span></div>
            ) : subs.length > 0 ? subs.map(s => (
              <button key={s.id} onClick={() => activateSubtitle(s)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 ${activeSub?.id === s.id ? 'bg-red-600/10' : ''}`}>
                <span className="text-sm">{langFlags[s.lang] || '🏳️'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${activeSub?.id === s.id ? 'text-red-400' : 'text-white'}`}>{s.langName}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{s.release}</p>
                </div>
                <span className="text-[9px] text-zinc-600">{s.downloads}⬇</span>
              </button>
            )) : <p className="text-xs text-zinc-500 text-center py-6">Aucun sous-titre trouvé</p>}
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center" onClick={() => setShowSubMenu(false)}>
        {loading ? (
          <div className="text-center px-8">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold mb-1">{retrying ? 'Source alternative...' : 'Chargement du stream...'}</p>
            <p className="text-zinc-500 text-xs">Connexion aux pairs et buffering</p>
          </div>
        ) : error ? (
          <div className="text-center px-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-white font-semibold mb-2">Erreur</p>
            <p className="text-zinc-400 text-sm mb-4">{error}</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => startStream(currentLink)} className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm">
                <RotateCcw className="w-4 h-4" />Réessayer
              </button>
              {fallbacks.length > 0 && fallbackIdx < fallbacks.length && (
                <button onClick={tryNextSource} className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm">
                  <SkipForward className="w-4 h-4" />Source suivante ({fallbacks.length - fallbackIdx} restantes)
                </button>
              )}
            </div>
          </div>
        ) : streamUrl ? (
          <video ref={videoRef} src={streamUrl} controls autoPlay playsInline crossOrigin="anonymous"
            className="w-full h-full max-h-[70vh] bg-black"
            onLoadedMetadata={onVideoLoaded} onPause={savePosition} onEnded={savePosition}
            onError={() => { if (fallbacks.length > 0 && fallbackIdx < fallbacks.length) tryNextSource(); else setError('Erreur de lecture'); }} />
        ) : null}
      </div>

      {status && !error && (
        <div className="p-4 safe-bottom">
          <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
            <span>Pairs: {status.numPeers || 0}</span>
            <span>DL: {fmt(status.downloadSpeed || 0)}</span>
            <span>{pct(status.progress)}</span>
          </div>
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 transition-all" style={{ width: pct(status.progress) }} />
          </div>
        </div>
      )}
    </div>
  );
}
