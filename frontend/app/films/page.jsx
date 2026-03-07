'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Film, Loader2, Star, SlidersHorizontal, ChevronDown, X, ArrowUpDown } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Popularité ↓' },
  { value: 'popularity.asc', label: 'Popularité ↑' },
  { value: 'vote_average.desc', label: 'Note ↓' },
  { value: 'vote_average.asc', label: 'Note ↑' },
  { value: 'primary_release_date.desc', label: 'Date ↓' },
  { value: 'primary_release_date.asc', label: 'Date ↑' },
];

export default function FilmsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // Load genres
  useEffect(() => {
    fetch('/api/movies/genres').then(r => r.json()).then(d => setGenres(d.genres || [])).catch(() => {});
  }, []);

  // Load movies
  const loadMovies = useCallback(async (p, reset = false) => {
    if (p > 1) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, sort_by: sortBy });
      if (selectedGenre) params.set('with_genres', selectedGenre);
      const res = await fetch(`/api/movies/discover?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(prev => reset ? (data.results || []) : [...prev, ...(data.results || [])]);
        setTotalPages(data.total_pages || 1);
        setPage(p);
      }
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  }, [sortBy, selectedGenre]);

  // Initial load + reload on filter change
  useEffect(() => {
    setItems([]);
    loadMovies(1, true);
  }, [sortBy, selectedGenre, loadMovies]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMore && page < totalPages) {
        loadMovies(page + 1);
      }
    }, { threshold: 0.1 });
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [page, totalPages, loadingMore, loadMovies]);

  const activeGenre = genres.find(g => g.id === selectedGenre);
  const activeSort = SORT_OPTIONS.find(s => s.value === sortBy);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Film className="w-7 h-7 text-sp-red" /> Films
          </h1>
          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <div className="relative">
              <button onClick={() => { setShowSort(s => !s); setShowFilters(false); }} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-300 hover:bg-white/10 transition-all">
                <ArrowUpDown className="w-4 h-4" /> {activeSort?.label || 'Tri'}
              </button>
              {showSort && (
                <><div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-sp-darker border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
                  {SORT_OPTIONS.map(s => (
                    <button key={s.value} onClick={() => { setSortBy(s.value); setShowSort(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === s.value ? 'bg-sp-red/10 text-sp-red' : 'text-zinc-300 hover:bg-white/5'}`}>
                      {s.label}
                    </button>
                  ))}
                </div></>
              )}
            </div>
            {/* Filter toggle */}
            <button onClick={() => { setShowFilters(f => !f); setShowSort(false); }} className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm transition-all ${showFilters || selectedGenre ? 'bg-sp-red/10 border-sp-red/30 text-sp-red' : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'}`}>
              <SlidersHorizontal className="w-4 h-4" /> Genres
              {selectedGenre && <span className="w-2 h-2 rounded-full bg-sp-red" />}
            </button>
          </div>
        </div>

        {/* Active filter badge */}

        {/* Catégories rapides */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Catégories :</span>
          {[
            { id: null, label: '🌐 Tous' },
            { id: 16, label: '🎌 Animation & Anime' },
            { id: 10751, label: '👨‍👩‍👧 Famille' },
            { id: 28, label: '⚔️ Action' },
            { id: 12, label: '🗺️ Aventure' },
            { id: 35, label: '😂 Comédie' },
            { id: 27, label: '👻 Horreur' },
            { id: 878, label: '🚀 Science-Fiction' },
            { id: 18, label: '🎭 Drame' },
            { id: 53, label: '🔪 Thriller' },
            { id: 10749, label: '💕 Romance' },
          ].map(cat => (
            <button key={cat.id ?? 'all'} onClick={() => setSelectedGenre(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${selectedGenre === cat.id ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/10'}`}>
              {cat.label}
            </button>
          ))}
        </div>
        {selectedGenre && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-zinc-500 text-sm">Filtre :</span>
            <button onClick={() => setSelectedGenre(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-sp-red/10 border border-sp-red/20 rounded-lg text-sp-red text-sm">
              {activeGenre?.name} <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Genre filters panel */}
        <div style={{
          maxHeight: showFilters ? '500px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
          pointerEvents: showFilters ? 'auto' : 'none',
        }}>
          <div className="mb-6 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedGenre(null)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${!selectedGenre ? 'bg-sp-red text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>Tous</button>
              {genres.map(g => (
                <button key={g.id} onClick={() => setSelectedGenre(g.id === selectedGenre ? null : g.id)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedGenre === g.id ? 'bg-sp-red text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center h-[40vh]"><Loader2 className="w-10 h-10 text-sp-red animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20"><p className="text-zinc-500 text-lg">Aucun film trouvé</p></div>
        ) : (
          <>
            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {items.map((item, i) => {
                const poster = item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null;
                const rating = item.vote_average?.toFixed(1);
                const year = item.release_date?.slice(0, 4);
                return (
                  <div key={`${item.id}-${i}`} onClick={() => router.push(`/watch/movie/${item.id}`)} className="group cursor-pointer">
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800 mb-2 ring-1 ring-white/5 group-hover:ring-white/20 transition-all">
                      {poster ? (
                        <img src={poster} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-zinc-600" /></div>
                      )}
                      {rating > 0 && (
                        <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-xs text-yellow-400 font-bold">
                          <Star className="w-3 h-3 fill-yellow-400" /> {rating}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                    <p className="text-white text-sm font-medium truncate">{item.title}</p>
                    {year && <p className="text-zinc-500 text-xs">{year}</p>}
                  </div>
                );
              })}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-8 flex justify-center">
              {loadingMore && <Loader2 className="w-6 h-6 text-sp-red animate-spin" />}
              {page >= totalPages && items.length > 0 && <p className="text-zinc-600 text-sm">Fin des résultats</p>}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
