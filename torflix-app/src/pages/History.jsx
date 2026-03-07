import { useState, useEffect } from 'react';
import { Clock, Trash2, Loader2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStoredAuth } from '../services/auth';

const API = 'https://torfix.xyz';

export default function History() {
  const nav = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = () => {
    const auth = getStoredAuth();
    return { Authorization: `Bearer ${auth?.tokens?.refreshToken || ''}`, 'Content-Type': 'application/json' };
  };

  useEffect(() => {
    fetch(`${API}/api/playback/history?limit=50`, { headers: headers() })
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => setHistory(d.results || []))
      .finally(() => setLoading(false));
  }, []);

  const resumePlay = (item) => {
    if (item.magnet) {
      nav(`/player?magnet=${encodeURIComponent(item.magnet)}&title=${encodeURIComponent(item.title || '')}&resume=${item.position_seconds}&tmdbId=${item.tmdb_id}&type=${item.content_type}`);
    } else {
      nav(`/details/${item.content_type}/${item.tmdb_id}`);
    }
  };

  return (
    <div className="pt-4 px-4 pb-24">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Clock className="w-6 h-6 text-blue-500" /> Historique
      </h1>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-red-500 animate-spin" /></div>
      ) : history.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Aucun historique</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map(item => {
            const progress = item.duration_seconds > 0 ? (item.position_seconds / item.duration_seconds) * 100 : 0;
            const epLabel = item.season_number ? `S${item.season_number}E${item.episode_number}` : null;
            return (
              <div key={item.id} onClick={() => resumePlay(item)}
                className="flex gap-3 p-3 bg-surface rounded-xl cursor-pointer active:scale-[0.98] transition-transform">
                <div className="flex-shrink-0 w-[80px] aspect-video rounded-lg overflow-hidden bg-surface2 relative">
                  {item.backdrop_path || item.poster_path ? (
                    <img src={`https://image.tmdb.org/t/p/w300${item.backdrop_path || item.poster_path}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">🎬</div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white drop-shadow" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-zinc-800">
                    <div className="h-full bg-red-600" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                    {epLabel && <span className="text-red-400 font-bold">{epLabel}</span>}
                    <span>{item.formattedPosition}</span>
                    {item.completed && <span className="text-green-400">✓ Terminé</span>}
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-1">{new Date(item.updated_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
