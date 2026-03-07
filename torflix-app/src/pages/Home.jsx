import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Clock, X } from 'lucide-react';
import { tmdb, backdrop, img } from '../services/tmdb';
import { getStoredAuth } from '../services/auth';
import Row from '../components/Row';

const API = 'https://torfix.xyz';

export default function Home() {
  const nav = useNavigate();
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topTV, setTopTV] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getStoredAuth();
    const token = auth?.tokens?.refreshToken;

    Promise.all([
      tmdb.trending(),
      tmdb.popular('movie'),
      tmdb.popular('tv'),
      token ? fetch(`${API}/api/playback/continue?limit=15`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] })) : Promise.resolve({ results: [] }),
    ]).then(([t, m, tv, cw]) => {
      setTrending(t.results || []);
      setPopular(m.results || []);
      setTopTV(tv.results || []);
      setContinueWatching(cw.results || []);
    }).finally(() => setLoading(false));
  }, []);

  // Kids mode: filter adult content
  const kidsMode = (() => { try { return JSON.parse(localStorage.getItem('torflix_prefs') || '{}').kidsMode; } catch { return false; } })();
  const filterKids = (items) => kidsMode ? items.filter(i => !i.adult && (i.vote_average || 0) > 5) : items;
  const filteredTrending = filterKids(trending);
  const filteredPopular = filterKids(popular);
  const filteredTopTV = filterKids(topTV);
  const hero = filteredTrending[0];

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {hero && (
        <div className="relative h-[55vh] min-h-[350px]">
          <img src={backdrop(hero.backdrop_path)} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
          <div className="absolute bottom-8 left-4 right-4 z-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 drop-shadow-lg">{hero.title || hero.name}</h1>
            <p className="text-xs text-zinc-300 line-clamp-2 mb-4 max-w-md">{hero.overview}</p>
            <div className="flex gap-3">
              <button onClick={() => nav(`/details/${hero.media_type || 'movie'}/${hero.id}`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-bold rounded-lg text-sm active:scale-95 transition-transform">
                <Play className="w-4 h-4 fill-black" />Lecture
              </button>
              <button onClick={() => nav(`/details/${hero.media_type || 'movie'}/${hero.id}`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white font-bold rounded-lg text-sm backdrop-blur-sm active:scale-95 transition-transform">
                <Info className="w-4 h-4" />Infos
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <div className="mb-6 px-4">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-red-500" /> Reprendre la lecture</h2>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {continueWatching.map(item => (
                <ContinueCard key={item.id} item={item} nav={nav} />
              ))}
            </div>
          </div>
        )}

        <Row title="🔥 Tendances" items={filteredTrending} />
        <Row title="🎬 Films populaires" items={filteredPopular} type="movie" />
        <Row title="📺 Séries populaires" items={filteredTopTV} type="tv" />
      </div>
    </div>
  );
}

function ContinueCard({ item, nav }) {
  const progress = item.duration_seconds > 0 ? (item.position_seconds / item.duration_seconds) * 100 : 0;
  const remaining = item.duration_seconds > 0 ? Math.ceil((item.duration_seconds - item.position_seconds) / 60) : null;
  const type = item.content_type === 'tv' ? 'tv' : 'movie';
  const epLabel = item.season_number ? `S${item.season_number}E${item.episode_number}` : null;

  const handlePlay = () => {
    if (item.magnet) {
      nav(`/player?magnet=${encodeURIComponent(item.magnet)}&title=${encodeURIComponent(item.title || '')}&resume=${item.position_seconds}`);
    } else {
      nav(`/details/${type}/${item.tmdb_id}`);
    }
  };

  return (
    <div onClick={handlePlay}
      className="flex-shrink-0 w-[160px] cursor-pointer active:scale-95 transition-transform">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-surface mb-1.5">
        {item.backdrop_path ? (
          <img src={`https://image.tmdb.org/t/p/w300${item.backdrop_path}`} alt="" className="w-full h-full object-cover" />
        ) : item.poster_path ? (
          <img src={`https://image.tmdb.org/t/p/w200${item.poster_path}`} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-2xl">🎬</div>
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Play className="w-10 h-10 text-white fill-white drop-shadow-lg" />
        </div>
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-zinc-800">
          <div className="h-full bg-red-600 transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>
      <p className="text-[11px] font-semibold truncate text-white">{item.title}</p>
      <div className="flex items-center gap-2 text-[9px] text-zinc-500">
        {epLabel && <span className="text-red-400 font-bold">{epLabel}</span>}
        {remaining && <span>{remaining} min restantes</span>}
      </div>
    </div>
  );
}
