'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Loader2, Film, Tv } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

export default function TrendingPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const [movies, tv] = await Promise.allSettled([
          fetch('/api/movies/trending').then(r => r.json()),
          fetch('/api/tv/trending').then(r => r.json()),
        ]);
        const m = (movies.status === 'fulfilled' ? movies.value.results || [] : []).map(i => ({ ...i, media_type: 'movie' }));
        const t = (tv.status === 'fulfilled' ? tv.value.results || [] : []).map(i => ({ ...i, media_type: 'tv' }));
        const all = [...m, ...t].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        setItems(all);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = items.filter(i => {
    if (filter === 'movies') return i.media_type === 'movie';
    if (filter === 'tv') return i.media_type === 'tv';
    return true;
  });

  if (loading) return <MainLayout><div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-sp-red animate-spin" /></div></MainLayout>;

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-6"><TrendingUp className="w-6 h-6 text-sp-red" /> Tendances</h1>
        <div className="flex gap-2 mb-6">
          {[['all','Tout'],['movies','Films'],['tv','Séries']].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === k ? 'bg-sp-red text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((item, i) => {
            const poster = item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null;
            const isTV = item.media_type === 'tv';
            const title = item.title || item.name;
            const rating = item.vote_average?.toFixed(1);
            return (
              <div key={i} onClick={() => router.push(`/watch/${item.media_type}/${item.id}`)} className="group cursor-pointer">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2 ring-1 ring-white/5 group-hover:ring-white/20 transition-all">
                  {poster ? <img src={poster} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600">{isTV ? <Tv className="w-8 h-8" /> : <Film className="w-8 h-8" />}</div>}
                  {rating > 0 && <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-xs text-yellow-400 font-bold">★ {rating}</div>}
                  <div className="absolute bottom-2 left-2"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isTV ? 'bg-blue-600' : 'bg-sp-red'} text-white`}>{isTV ? 'SÉRIE' : 'FILM'}</span></div>
                  {/* Rank number */}
                  <div className="absolute bottom-1 right-2 text-4xl font-black text-white/10 leading-none">{i + 1}</div>
                </div>
                <p className="text-white text-sm font-medium truncate">{title}</p>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
