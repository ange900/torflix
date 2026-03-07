import { useState, useEffect } from 'react';
import { tmdb } from '../services/tmdb';
import Row from '../components/Row';

export default function Trending() {
  const [movies, setMovies] = useState([]);
  const [tv, setTv] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      tmdb.trending('movie'),
      tmdb.trending('tv'),
    ]).then(([m, t]) => {
      setMovies(m.results || []);
      setTv(t.results || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-red border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="pt-4">
      <h1 className="text-2xl font-bold px-4 mb-4">🔥 Tendances</h1>
      <Row title="Films tendances" items={movies} type="movie" />
      <Row title="Séries tendances" items={tv} type="tv" />
    </div>
  );
}
