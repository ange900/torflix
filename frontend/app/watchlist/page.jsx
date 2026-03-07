'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Loader2, Film, Tv, Play, X } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { playbackApi } from '@/lib/streaming';

export default function WatchlistPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const data = await playbackApi.getFavorites();
        setItems(data.items || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleRemove = async (e, mediaType, tmdbId) => {
    e.stopPropagation();
    try {
      await playbackApi.removeFavorite(mediaType, tmdbId);
      setItems(prev => prev.filter(i => !(i.media_type === mediaType && i.tmdb_id === tmdbId)));
    } catch {}
  };

  const filtered = items.filter(i => {
    if (filter === 'movies') return i.media_type === 'movie';
    if (filter === 'tv') return i.media_type === 'tv';
    return true;
  });

  if (loading) return <MainLayout><div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-sp-red animate-spin" /></div></MainLayout>;

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Heart className="w-6 h-6 text-pink-500 fill-pink-500" /> Ma Liste</h1>
          <span className="text-zinc-500 text-sm">{items.length} titre{items.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {[['all','Tout'], ['movies','Films'], ['tv','Séries']].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === key ? 'bg-sp-red text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>{label}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-lg">{items.length === 0 ? 'Votre liste est vide' : 'Aucun résultat pour ce filtre'}</p>
            <p className="text-zinc-600 text-sm mt-1">Ajoutez des films et séries depuis leur page détail</p>
            <button onClick={() => router.push('/')} className="mt-6 px-6 py-3 bg-sp-red hover:bg-red-500 text-white rounded-xl transition-all">Parcourir</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((item, i) => {
              const poster = item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null;
              const isTV = item.media_type === 'tv';
              return (
                <div key={i} onClick={() => router.push(`/watch/${item.media_type}/${item.tmdb_id}`)} className="group cursor-pointer relative">
                  {/* Poster */}
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2 ring-1 ring-white/5 group-hover:ring-white/20 transition-all">
                    {poster ? <img src={poster} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center">{isTV ? <Tv className="w-8 h-8 text-zinc-600" /> : <Film className="w-8 h-8 text-zinc-600" />}</div>}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                      <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 fill-white transition-all drop-shadow-lg" />
                    </div>
                    {/* Remove button */}
                    <button onClick={(e) => handleRemove(e, item.media_type, item.tmdb_id)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" title="Retirer">
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                    {/* Type badge */}
                    <div className="absolute bottom-2 left-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isTV ? 'bg-blue-600' : 'bg-sp-red'} text-white`}>{isTV ? 'SÉRIE' : 'FILM'}</span>
                    </div>
                  </div>
                  <p className="text-white text-sm font-medium truncate">{item.title || 'Sans titre'}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
