import { useState, useEffect } from 'react';
import { Tv, Loader2 } from 'lucide-react';
import Row from '../components/Row';
import ContentCard from '../components/ContentCard';
import { tmdb } from '../services/tmdb';

export default function Series() {
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [onAir, setOnAir] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genreResults, setGenreResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genreLoading, setGenreLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      tmdb.popular('tv'),
      tmdb.get('/tv/top_rated'),
      tmdb.get('/tv/on_the_air'),
      tmdb.get('/genre/tv/list'),
    ]).then(([p, tr, oa, g]) => {
      setPopular(p.results || []);
      setTopRated(tr.results || []);
      setOnAir(oa.results || []);
      setGenres(g.genres || []);
    }).finally(() => setLoading(false));
  }, []);

  const selectGenre = async (genre) => {
    if (selectedGenre?.id === genre.id) { setSelectedGenre(null); setGenreResults([]); return; }
    setSelectedGenre(genre);
    setGenreLoading(true);
    try {
      const data = await tmdb.get(`/discover/tv?with_genres=${genre.id}&sort_by=popularity.desc`);
      setGenreResults(data.results || []);
    } catch {}
    setGenreLoading(false);
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="w-6 h-6 text-red-500 animate-spin" /></div>;

  return (
    <div className="pt-4 pb-24">
      <h1 className="text-2xl font-bold px-4 mb-4 flex items-center gap-2"><Tv className="w-6 h-6" /> Séries</h1>

      {genres.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {genres.map(g => (
              <button key={g.id} onClick={() => selectGenre(g)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedGenre?.id === g.id ? 'bg-red-600 text-white' : 'bg-surface text-zinc-400 hover:text-white'}`}>
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedGenre && (
        <div className="px-4 mb-6">
          <h2 className="text-sm font-bold mb-3">{selectedGenre.name}</h2>
          {genreLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-red-500 animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {genreResults.map(item => <ContentCard key={item.id} item={{ ...item, media_type: 'tv' }} />)}
            </div>
          )}
        </div>
      )}

      {!selectedGenre && (
        <>
          <Row title="🔥 Populaires" items={popular} type="tv" />
          <Row title="⭐ Mieux notées" items={topRated} type="tv" />
          <Row title="📡 En cours" items={onAir} type="tv" />
        </>
      )}
    </div>
  );
}
