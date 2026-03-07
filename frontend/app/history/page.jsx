'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Play, Trash2, Loader2, Film, Tv } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { playbackApi } from '@/lib/streaming';

export default function HistoryPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await playbackApi.getHistory(1, 100);
        setItems(data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = (now - date) / 1000 / 60;
    if (diff < 60) return `Il y a ${Math.floor(diff)} min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (s) => {
    if (!s) return '0:00';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
  };

  if (loading) return <MainLayout><div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-sp-red animate-spin" /></div></MainLayout>;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Clock className="w-6 h-6 text-sp-blue" /> Historique</h1>
          <span className="text-zinc-500 text-sm">{items.length} élément{items.length !== 1 ? 's' : ''}</span>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-lg">Aucun historique</p>
            <p className="text-zinc-600 text-sm mt-1">Les films et séries que vous regardez apparaîtront ici</p>
            <button onClick={() => router.push('/')} className="mt-6 px-6 py-3 bg-sp-red hover:bg-red-500 text-white rounded-xl transition-all">Parcourir</button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => {
              const poster = item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null;
              const progress = item.duration_seconds > 0 ? (item.position_seconds / item.duration_seconds) * 100 : 0;
              const isTV = item.content_type === 'tv';

              return (
                <div key={i} onClick={() => router.push(`/watch/${item.content_type}/${item.tmdb_id}`)} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer group">
                  {/* Poster */}
                  <div className="relative w-16 h-24 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                    {poster ? <img src={poster} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{isTV ? <Tv className="w-5 h-5 text-zinc-600" /> : <Film className="w-5 h-5 text-zinc-600" />}</div>}
                    {/* Progress bar */}
                    {progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
                        <div className="h-full bg-sp-red rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
                      </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                      <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 fill-white transition-all" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{item.title || 'Sans titre'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isTV ? 'bg-blue-600/20 text-blue-400' : 'bg-sp-red/20 text-sp-red'}`}>{isTV ? 'SÉRIE' : 'FILM'}</span>
                      {isTV && item.season_number && <span className="text-zinc-500 text-xs">S{item.season_number}E{item.episode_number}</span>}
                    </div>
                    {progress > 0 && progress < 90 && (
                      <p className="text-zinc-500 text-xs mt-1">{formatTime(item.position_seconds)} / {formatTime(item.duration_seconds)}</p>
                    )}
                    {item.completed && <span className="text-green-500 text-xs">✓ Terminé</span>}
                  </div>

                  {/* Date */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-zinc-500 text-xs">{formatDate(item.updated_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
