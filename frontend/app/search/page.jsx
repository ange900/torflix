'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, SlidersHorizontal, X, Film, Tv, Star, Loader2, ChevronDown, Zap, TrendingUp } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ContentCard from '@/components/ui/ContentCard';

const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Popularité' },
  { value: 'vote_average.desc', label: 'Meilleures notes' },
  { value: 'primary_release_date.desc', label: 'Plus récents' },
  { value: 'revenue.desc', label: 'Box office' },
];

const YEAR_OPTIONS = (() => {
  const years = [{ value: '', label: 'Toutes' }];
  for (let y = new Date().getFullYear(); y >= 2000; y--) years.push({ value: String(y), label: String(y) });
  return years;
})();

function TypeTab({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-sp-red text-white shadow-lg shadow-sp-red/25' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5'}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function FilterChip({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${active ? (color || 'bg-sp-red/20 text-sp-red border-sp-red/40') : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'}`}>
      {label}
    </button>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const debounceRef = useRef(null);

  // State
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all'); // all, movie, tv
  const [genres, setGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('popularity.desc');

  // Trending for empty state
  const [trending, setTrending] = useState([]);

  // Load genres on mount
  useEffect(() => {
    fetch('/api/search/genres').then(r => r.json()).then(d => setGenres(d.genres || [])).catch(() => {});
    fetch('/api/movies/trending').then(r => r.json()).then(d => {
      const items = (d.results || []).slice(0, 12).map(r => ({ ...r, media_type: 'movie' }));
      setTrending(items);
    }).catch(() => {});
  }, []);

  // Search function
  const doSearch = useCallback(async (q, p = 1, append = false) => {
    if (!q || q.length < 2) {
      if (!append) { setResults([]); setTotalResults(0); }
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, page: p });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`/api/search/multi?${params}`);
      if (res.ok) {
        const data = await res.json();
        let items = data.results || [];

        // Client-side filtering
        if (selectedGenres.length > 0) {
          items = items.filter(i => i.genre_ids?.some(g => selectedGenres.includes(g)));
        }
        if (minRating > 0) {
          items = items.filter(i => (i.vote_average || 0) >= minRating);
        }
        if (selectedYear) {
          items = items.filter(i => {
            const date = i.release_date || i.first_air_date || '';
            return date.startsWith(selectedYear);
          });
        }

        setResults(prev => append ? [...prev, ...items] : items);
        setTotalPages(data.total_pages || 0);
        setTotalResults(data.total_results || 0);
        setPage(p);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [typeFilter, selectedGenres, minRating, selectedYear]);

  // Initial search
  useEffect(() => {
    if (initialQuery) { setQuery(initialQuery); doSearch(initialQuery); }
  }, [initialQuery]);

  // Re-search when filters change
  useEffect(() => {
    if (query.length >= 2) doSearch(query);
  }, [typeFilter, selectedGenres, minRating, selectedYear]);

  // Debounced live search
  const handleInputChange = (val) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val.length >= 2) {
        router.replace(`/search?q=${encodeURIComponent(val)}`, { scroll: false });
        doSearch(val);
      } else {
        setResults([]);
        setTotalResults(0);
      }
    }, 400);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      router.replace(`/search?q=${encodeURIComponent(query.trim())}`, { scroll: false });
      doSearch(query.trim());
    }
  };

  const loadMore = () => {
    if (page < totalPages) doSearch(query, page + 1, true);
  };

  const clearFilters = () => {
    setSelectedGenres([]); setSelectedYear(''); setMinRating(0); setSortBy('popularity.desc');
  };

  const hasFilters = selectedGenres.length > 0 || selectedYear || minRating > 0;
  const filterCount = selectedGenres.length + (selectedYear ? 1 : 0) + (minRating > 0 ? 1 : 0);

  return (
    <MainLayout>
      <div className="px-4 md:px-8 lg:px-12 py-8 min-h-screen">

        {/* Search Header */}
        <div className="max-w-4xl mx-auto mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
            Rechercher
          </h1>
          <p className="text-zinc-500 text-center mb-8">Films, séries, et plus encore</p>

          {/* Search Bar */}
          <form onSubmit={handleSubmit} className="relative mb-6">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text" value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Rechercher un film, une série..."
              className="w-full pl-14 pr-28 py-4 bg-white/[0.04] border border-white/10 rounded-2xl text-white text-lg placeholder-zinc-600 focus:outline-none focus:border-sp-red/50 focus:ring-2 focus:ring-sp-red/20 focus:bg-white/[0.06] transition-all"
              autoFocus
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {query && (
                <button type="button" onClick={() => { setQuery(''); setResults([]); setTotalResults(0); }} className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button type="submit" className="px-4 py-2 bg-sp-red rounded-xl text-white text-sm font-semibold hover:bg-red-500 transition-colors">
                Rechercher
              </button>
            </div>
          </form>

          {/* Type Tabs + Filter Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              <TypeTab icon={Zap} label="Tout" active={typeFilter === 'all'} onClick={() => setTypeFilter('all')} />
              <TypeTab icon={Film} label="Films" active={typeFilter === 'movie'} onClick={() => setTypeFilter('movie')} />
              <TypeTab icon={Tv} label="Séries" active={typeFilter === 'tv'} onClick={() => setTypeFilter('tv')} />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${showFilters || hasFilters ? 'bg-sp-red/15 text-sp-red border border-sp-red/30' : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white hover:bg-white/10'}`}>
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
              {filterCount > 0 && <span className="w-5 h-5 rounded-full bg-sp-red text-white text-xs flex items-center justify-center">{filterCount}</span>}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="max-w-4xl mx-auto mb-8 p-6 bg-white/[0.03] border border-white/5 rounded-2xl space-y-5 animate-fade-in">
            {/* Genres */}
            <div>
              <label className="text-sm font-semibold text-zinc-300 mb-3 block">Genre</label>
              <div className="flex flex-wrap gap-2">
                {genres.map(g => (
                  <FilterChip
                    key={g.id} label={g.name}
                    active={selectedGenres.includes(g.id)}
                    onClick={() => setSelectedGenres(p => p.includes(g.id) ? p.filter(x => x !== g.id) : [...p, g.id])}
                  />
                ))}
              </div>
            </div>

            {/* Year + Rating row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-semibold text-zinc-300 mb-2 block">Année</label>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-sp-red/50 appearance-none cursor-pointer">
                  {YEAR_OPTIONS.map(y => <option key={y.value} value={y.value} className="bg-zinc-900">{y.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-zinc-300 mb-2 block">
                  Note minimum : <span className="text-sp-red font-bold">{minRating > 0 ? `${minRating}/10` : 'Toutes'}</span>
                </label>
                <input type="range" min="0" max="9" step="0.5" value={minRating} onChange={e => setMinRating(+e.target.value)} className="w-full accent-sp-red" />
              </div>
            </div>

            {/* Clear */}
            {hasFilters && (
              <button onClick={clearFilters} className="text-sm text-sp-red hover:underline">
                Effacer tous les filtres
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {loading && results.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="w-8 h-8 text-sp-red animate-spin" />
            <p className="text-zinc-500 mt-4">Recherche en cours...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <p className="text-zinc-400 text-sm">
                <span className="text-white font-semibold">{totalResults.toLocaleString()}</span> résultats
                {typeFilter !== 'all' && <span> · {typeFilter === 'movie' ? 'Films' : 'Séries'}</span>}
                {hasFilters && <span> · Filtré</span>}
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 md:gap-5">
              {results.map((item, idx) => (
                <ContentCard
                  key={`${item.id}-${item.media_type}-${idx}`}
                  item={item}
                  type={item.media_type === 'tv' ? 'tv' : 'movie'}
                  index={idx}
                />
              ))}
            </div>

            {/* Load More */}
            {page < totalPages && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-semibold hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                  Voir plus de résultats
                </button>
              </div>
            )}
          </div>
        ) : query.length >= 2 && !loading ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-zinc-300 text-lg font-medium">Aucun résultat pour &quot;{query}&quot;</p>
            <p className="text-zinc-600 text-sm mt-2">Essayez d&apos;autres termes ou modifiez vos filtres</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 px-6 py-2 bg-sp-red/10 text-sp-red rounded-xl text-sm hover:bg-sp-red/20 transition-colors">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          /* Empty state — show trending */
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-sp-red" />
              <h2 className="text-xl font-bold text-white">Tendances du moment</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 md:gap-5">
              {trending.map((item, idx) => (
                <ContentCard key={item.id} item={item} type="movie" index={idx} />
              ))}
            </div>
            <p className="text-center text-zinc-600 text-sm mt-8">Tapez pour rechercher parmi des millions de films et séries</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<MainLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-sp-red animate-spin" /></div></MainLayout>}>
      <SearchContent />
    </Suspense>
  );
}
