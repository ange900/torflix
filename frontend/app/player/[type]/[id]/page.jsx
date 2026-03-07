'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import TorrentList from '@/components/content/TorrentList';
import VideoPlayer from '@/components/player/VideoPlayer';
const BACKEND = '';
export default function PlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { type, id } = params;
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const videoRef = useRef(null);
  const [content, setContent] = useState(null);
  const [torrents, setTorrents] = useState([]);
  const [selectedTorrent, setSelectedTorrent] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [streamUrl, setStreamUrl] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);
  const [searching, setSearching] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(null);
  const [resumePosition, setResumePosition] = useState(null);
  const [showResumePopup, setShowResumePopup] = useState(false);
  const pollRef = useRef(null);
  const wtRef = useRef(null);
  useEffect(() => {
    (async () => {
      try {
        const endpoint = type === 'tv' ? 'tv' : 'movies';
        const res = await fetch(`/api/${endpoint}/${id}`);
        if (res.ok) {
          const d = await res.json();
          setContent(d);
          let q = d.title || d.name;
          if (type === 'tv' && season && episode) {
            q += ` S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
          }
          await searchTorrents(q, type === 'tv' ? 'TV' : 'Movies');
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const pbRes = await fetch(`/api/playback/position/${type}/${id}${season ? `?season=${season}&episode=${episode}` : ''}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (pbRes.ok) {
                const pb = await pbRes.json();
                if (pb && pb.position_seconds > 30 && !pb.completed) setResumePosition(pb);
              }
            } catch(e) {}
          }
        }
      } catch (err) { console.error('[Player]', err); }
    })();
  }, [id, type]);
  async function searchTorrents(query, category) {
    setSearching(true);
    try {
      const lang = localStorage.getItem('torflix_lang') || 'fr';
      const langMap = { 'fr': 'VF', 'en': 'VO', 'all': 'all' };
      const langParam = langMap[lang] || 'VF';
      const res = await fetch(`/api/torrents/search?q=${encodeURIComponent(query)}&category=${category}&language=${langParam}`);
      if (res.ok) {
        const d = await res.json();
        const results = Array.isArray(d) ? d : (d.results || []);
        setTorrents(results);
        const frTorrent = results.find(t => (t.magnet || t.downloadUrl) && (t.title?.toUpperCase().includes('FRENCH') || t.title?.toUpperCase().includes(' FR ') || t.title?.toUpperCase().includes('.FR.') || t.title?.toUpperCase().includes('TRUEFRENCH') || t.title?.toUpperCase().includes('VFF') || t.title?.toUpperCase().includes('VF')));
        const bestTorrent = frTorrent || (d.best && (d.best.magnet || d.best.downloadUrl) ? d.best : null) || results.find(t => t.magnet || t.downloadUrl);
        if (bestTorrent) { const bi = results.findIndex(t => t.title === bestTorrent.title); setSelectedTorrent(bestTorrent); setSelectedIndex(bi >= 0 ? bi : 0); }
      }
    } catch (err) { console.error('[Search]', err); }
    setSearching(false);
    setPhase('select');
  }
  async function resolveTorrent(torrent) {
    if (torrent.magnet) return torrent.magnet;
    if (!torrent.downloadUrl) return null;
    if (torrent.downloadUrl.startsWith('magnet:')) return torrent.downloadUrl;
    try {
      const res = await fetch('/api/torrents/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ downloadUrl: torrent.downloadUrl }) });
      if (!res.ok) throw new Error('Resolve failed');
      const d = await res.json();
      if (d.magnet) return d.magnet;
      throw new Error('No magnet returned');
    } catch (err) { throw new Error(`Impossible de résoudre le torrent: ${err.message}`); }
  }
  function destroyWebTorrent() {
    if (wtRef.current) { try { wtRef.current.destroy(); } catch {} wtRef.current = null; }
  }
  async function startStream() {
    const isAndroidApp = typeof navigator !== 'undefined' && navigator.userAgent.includes('TorFlixTV');
    if (isAndroidApp && selectedTorrent) {
      const magnet = encodeURIComponent(selectedTorrent.magnet || '');
      const dlUrl = encodeURIComponent(selectedTorrent.downloadUrl || '');
      window.location.href = 'torflix://stream?magnet=' + magnet + '&downloadUrl=' + dlUrl;
      return;
    }
    if (!selectedTorrent) { setError("Sélectionnez un torrent"); return; }
    if (!selectedTorrent.magnet && !selectedTorrent.downloadUrl) { setError("Pas de source disponible"); return; }
    setPhase('buffering'); setError(null); setBufferProgress(null);
    try {
      const magnet = await resolveTorrent(selectedTorrent);
      if (!magnet || typeof magnet !== 'string') throw new Error('Impossible de résoudre le magnet');
      if (!window.WebTorrent) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Impossible de charger WebTorrent'));
          document.head.appendChild(script);
        });
      }
      destroyWebTorrent();
      const client = new window.WebTorrent();
      wtRef.current = client;
      client.on('error', (err) => { setError('Erreur WebTorrent: ' + err.message); setPhase('error'); });
      client.add(magnet, (torrent) => {
        const videoExts = ['.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v'];
        const file = torrent.files.filter(f => videoExts.some(ext => f.name.toLowerCase().endsWith(ext))).sort((a, b) => b.length - a.length)[0] || torrent.files[0];
        if (!file) { setError('Aucun fichier vidéo trouvé'); setPhase('error'); return; }
        console.log('[WebTorrent] Streaming:', file.name);
        const progressInterval = setInterval(() => {
          if (!wtRef.current) { clearInterval(progressInterval); return; }
          setBufferProgress({ peers: torrent.numPeers, speed: torrent.downloadSpeed, progress: torrent.progress });
        }, 1000);
        file.getBlobURL((err, url) => {
          clearInterval(progressInterval);
          if (err) { setError('Erreur streaming: ' + err.message); setPhase('error'); return; }
          setStreamUrl(url); setPhase('playing');
        });
      });
    } catch (err) { setError(err.message); setPhase('error'); }
  }
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); destroyWebTorrent(); };
  }, []);
  const bd = content?.backdrop_path ? `https://image.tmdb.org/t/p/original${content.backdrop_path}` : null;
  const title = content?.title || content?.name || 'Chargement...';
  const sub = type === 'tv' && season && episode ? `S${season}E${episode}` : content?.release_date?.slice(0, 4) || '';
  if (phase === 'playing' && streamUrl) {
    return (
      <VideoPlayer
        streamUrl={streamUrl}
        sessionId={null}
        title={title}
        subtitle={sub}
        posterUrl={bd}
        initialPosition={0}
        duration={0}
        mediaType={type}
        tmdbId={id}
        seasonNumber={season}
        episodeNumber={episode}
        onClose={() => { if (pollRef.current) clearInterval(pollRef.current); destroyWebTorrent(); setStreamUrl(null); setPhase('select'); }}
        onPositionUpdate={(position, duration) => {
          const token = localStorage.getItem('token');
          if (token && position > 5) {
            fetch('/api/playback/progress', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ tmdbId: parseInt(id), contentType: type, title, posterPath: content?.poster_path, backdropPath: content?.backdrop_path, position, duration: duration || 0, seasonNumber: season ? parseInt(season) : null, episodeNumber: episode ? parseInt(episode) : null }) }).catch(() => {});
          }
        }}
        onEnded={() => { destroyWebTorrent(); router.back(); }}
      />
    );
  }
  return (
    <div className="min-h-screen bg-sp-darker">
      {bd && (<div className="fixed inset-0 z-0"><img src={bd} alt="" className="w-full h-full object-cover opacity-15" /><div className="absolute inset-0 bg-gradient-to-t from-sp-darker via-sp-darker/90 to-sp-darker/50" /></div>)}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white mb-6 flex items-center gap-2 transition-colors">← Retour</button>
        <div className="flex gap-6 mb-8">
          {content?.poster_path && (<img src={`https://image.tmdb.org/t/p/w300${content.poster_path}`} alt={title} className="w-32 md:w-48 rounded-xl shadow-2xl flex-shrink-0" />)}
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{title}</h1>
            {sub && <p className="text-zinc-400 text-lg mb-3">{sub}</p>}
            {content?.overview && <p className="text-zinc-500 text-sm line-clamp-3 max-w-2xl">{content.overview}</p>}
            {content?.vote_average > 0 && <p className="text-yellow-400 mt-2">★ {content.vote_average.toFixed(1)}/10</p>}
          </div>
        </div>
        {phase === 'buffering' && (
          <div className="flex flex-col items-center py-16 animate-fade-in">
            <div className="w-16 h-16 border-4 border-sp-red border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-xl mb-2">Connexion aux pairs...</p>
            {bufferProgress && (<div className="text-center text-zinc-400 text-sm space-y-1"><p>🔗 {bufferProgress.peers} pairs</p><p>📥 {((bufferProgress.speed||0)/1024).toFixed(0)} KB/s</p><p>📊 {((bufferProgress.progress||0)*100).toFixed(1)}%</p></div>)}
            <p className="text-zinc-600 text-xs mt-3">Streaming direct — aucun cache sur le serveur</p>
          </div>
        )}
        {phase === 'error' && (
          <div className="text-center py-12 mb-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">❌</span></div>
            <p className="text-red-400 text-lg mb-2">{error}</p>
            <p className="text-zinc-600 text-sm mb-4">Essayez un autre torrent</p>
            <button onClick={() => { setPhase('select'); setError(null); }} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all">Réessayer</button>
          </div>
        )}
        {(phase === 'select' || phase === 'loading') && (
          <>
            {showResumePopup && resumePosition && (
              <div className="mb-6 p-5 bg-gradient-to-r from-sp-red/20 to-transparent border border-sp-red/30 rounded-2xl animate-fade-in">
                <div className="flex items-center gap-4">
                  {content?.backdrop_path && (<div className="w-24 h-14 rounded-lg overflow-hidden flex-shrink-0"><img src={`https://image.tmdb.org/t/p/w300${content.backdrop_path}`} alt="" className="w-full h-full object-cover" /></div>)}
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">Reprendre la lecture</p>
                    <p className="text-zinc-400 text-xs">Arrêté à {resumePosition.formattedPosition || Math.floor(resumePosition.position_seconds/60)+' min'}{resumePosition.remainingMinutes && ` — ${resumePosition.remainingMinutes} min restantes`}</p>
                    <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden"><div className="h-full bg-sp-red rounded-full" style={{ width: `${resumePosition.progress||0}%` }} /></div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setShowResumePopup(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Recommencer</button>
                    <button onClick={() => { setShowResumePopup(false); startStream(); }} className="px-6 py-2 bg-sp-red hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all">▶ Reprendre à {resumePosition.formattedPosition||'...'}</button>
                  </div>
                </div>
              </div>
            )}
            {selectedTorrent && (selectedTorrent.magnet || selectedTorrent.downloadUrl) && (
              <button onClick={startStream} className="w-full md:w-auto mb-8 px-8 py-4 bg-sp-red hover:bg-red-500 text-white text-lg font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] btn-press">
                ▶ Lancer la lecture
                <span className="text-sm font-normal opacity-80">[{selectedTorrent.language}] [{selectedTorrent.quality}] — {selectedTorrent.seeders} seeds{selectedTorrent.source && ` • ${selectedTorrent.source}`}</span>
              </button>
            )}
            {selectedTorrent && !selectedTorrent.magnet && !selectedTorrent.downloadUrl && (<div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm flex items-center gap-2">⚠ Pas de source disponible. Choisissez un autre torrent.</div>)}
            <TorrentList torrents={torrents} onSelect={(t, i) => { setSelectedTorrent(t); setSelectedIndex(i); }} selectedIndex={selectedIndex} isLoading={searching || phase === 'loading'} />
            {!searching && phase === 'select' && torrents.length === 0 && (<div className="text-center py-12"><p className="text-zinc-500 text-lg mb-2">Aucun torrent trouvé</p><p className="text-zinc-600 text-sm">Essayez avec un titre différent</p></div>)}
          </>
        )}
      </div>
    </div>
  );
}
