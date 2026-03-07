'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import HeroBanner from '@/components/homepage/HeroBanner';
import ContentRow from '@/components/homepage/ContentRow';

export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('all');
  const [lang, setLang] = useState('fr');
  const router = useRouter();

  useEffect(() => {
    setMode(localStorage.getItem('torflix_mode') || 'all');
    setLang(localStorage.getItem('torflix_lang') || 'fr');
    const onMode = e => setMode(e.detail.mode);
    const onLang = e => setLang(e.detail.lang);
    window.addEventListener('torflix-mode-change', onMode);
    window.addEventListener('torflix-lang-change', onLang);
    return () => { window.removeEventListener('torflix-mode-change', onMode); window.removeEventListener('torflix-lang-change', onLang); };
  }, []);

  useEffect(() => { fetchHomepage(); }, [mode, lang]);

  const fetchHomepage = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
      const langParam = lang === 'fr' ? '&language=fr-FR&region=FR' : lang === 'en' ? '&language=en-US' : '';

      const [homeRes, animeMovieRes, animeTVRes, mangaTVRes] = await Promise.all([
        fetch(mode && mode !== 'all' ? `/api/homepage/mode/${mode}` : '/api/homepage', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch(`/api/movies/popular?${langParam ? langParam.slice(1) : ''}`),
        fetch('/api/tv/popular?language=fr-FR'),
        fetch('/api/tv/discover?with_genres=16&with_origin_country=JP&sort_by=popularity.desc')
      ]);

      if (!homeRes.ok) throw new Error(`HTTP ${homeRes.status}`);
      const homeData = await homeRes.json();

      if (token) {
        try {
          const cwRes = await fetch('/api/playback/continue?limit=10', { headers: { Authorization: `Bearer ${token}` } });
          if (cwRes.ok) {
            const cw = await cwRes.json();
            if (cw.results?.length > 0) {
              homeData.sections.unshift({
                id: 'continue-watching', title: '▶ Reprendre la lecture', icon: '⏯️', type: 'continue',
                items: cw.results.map(r => ({
                  tmdb_id: r.tmdb_id, type: r.content_type, title: r.title,
                  poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : null,
                  backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : null,
                  progress: (r.progress || 0) / 100, duration: r.duration_seconds,
                  season: r.season_number, episode: r.episode_number,
                  remainingMinutes: r.remainingMinutes, formattedPosition: r.formattedPosition,
                }))
              });
            }
          }
        } catch(e) {}
      }

      const toItem = (m, type) => ({
        tmdb_id: m.id, type, title: m.title || m.name,
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : null,
        backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}` : null,
        rating: m.vote_average, year: (m.release_date || m.first_air_date || '').slice(0,4), overview: m.overview
      });

      if (animeMovieRes.ok) {
        const d = await animeMovieRes.json();
        if (d.results?.length) homeData.sections.push({ id: 'extra-movies', title: 'Films', icon: '🎬', type: 'standard', items: d.results.slice(0,10).map(m => toItem(m,'movie')) });
      }
      if (animeTVRes.ok) {
        const d = await animeTVRes.json();
        if (d.results?.length) homeData.sections.push({ id: 'extra-tv', title: 'Séries', icon: '📺', type: 'standard', items: d.results.slice(0,10).map(m => toItem(m,'tv')) });
      }
      if (mangaTVRes.ok) {
        const d = await mangaTVRes.json();
        if (d.results?.length) homeData.sections.push({ id: 'manga-tv', title: 'Manga & Animé', icon: '⛩️', type: 'standard', items: d.results.slice(0,10).map(m => toItem(m,'tv')) });
      }

      if (mode === 'kids') {
        homeData.sections = homeData.sections.map(s => ({ ...s, items: (s.items || []).filter(i => !i.adult) }));
      }

      homeData.sections = homeData.sections.map(s => ({
        ...s, items: (s.items || []).slice(0, s.id === 'trending' ? 5 : s.id === 'top-rated' ? 9 : 10)
      }));
      setData(homeData);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleCardClick = (item) => router.push(`/player/${item.type || item.media_type}/${item.tmdb_id || item.id}`);

  if (loading) return (
    <MainLayout>
      <div>
        <div className="h-[50vh] bg-zinc-900 animate-pulse rounded-b-2xl" />
        {[1,2,3,4].map(i => (
          <div key={i} className="px-[3%] py-5">
            <div className="w-48 h-6 bg-zinc-800 rounded mb-4 animate-pulse" />
            <div className="flex gap-2.5 overflow-hidden">
              {[1,2,3,4,5,6].map(j => <div key={j} className="flex-shrink-0 w-[160px] aspect-[2/3] bg-zinc-800 rounded-md animate-pulse" />)}
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );

  if (error) return (
    <MainLayout>
      <div className="min-h-[60vh] flex items-center justify-center text-white">
        <div className="text-center max-w-md px-8">
          <h2 className="text-2xl font-bold mb-2">Impossible de charger</h2>
          <p className="text-white/50 mb-6">{error}</p>
          <button onClick={fetchHomepage} className="px-8 py-3 bg-rose-600 text-white font-semibold rounded-md hover:bg-rose-700">Réessayer</button>
        </div>
      </div>
    </MainLayout>
  );

  if (!data) return null;

  return (
    <MainLayout>
      <div className="text-white overflow-hidden">
        {data.hero?.length > 0 && <HeroBanner items={data.hero} />}

        <div className="pt-3 pb-16">
          {data.sections.map(section => <ContentRow key={section.id} section={section} onCardClick={handleCardClick} />)}
        </div>
      </div>
    </MainLayout>
  );
}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
