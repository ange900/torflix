'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Play, Heart, Star, Clock, Calendar, ArrowLeft, Share2, ExternalLink, Loader2, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TorrentList from '@/components/content/TorrentList';
import ContentRow from '@/components/ui/ContentRow';
import SeasonSelector from '@/components/content/SeasonSelector';
import { playbackApi } from '@/lib/streaming';

function WatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mediaType = params.type;
  const tmdbId = parseInt(params.id);
  const seasonParam = searchParams.get('season') ? parseInt(searchParams.get('season')) : 1;
  const episodeParam = searchParams.get('episode') ? parseInt(searchParams.get('episode')) : null;

  const [content, setContent] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [torrents, setTorrents] = useState([]);
  const [searchingTorrents, setSearchingTorrents] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(seasonParam);
  const [seasonDetails, setSeasonDetails] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [resumePosition, setResumePosition] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load content details (TMDB already appends credits,videos,similar)
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const endpoint = mediaType === 'tv' ? `/api/tv/${tmdbId}` : `/api/movies/${tmdbId}`;
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setContent(data);
          if (data.similar?.results) setSimilar(data.similar.results);
          if (data.recommendations?.results) setRecommendations(data.recommendations.results);
        }
      } catch (err) { console.error('Load error:', err); }
      finally { setLoading(false); }
    }
    load();
  }, [tmdbId, mediaType]);

  // Load season details for TV
  useEffect(() => {
    if (mediaType !== 'tv' || !tmdbId || !selectedSeason) return;
    async function loadSeason() {
      try {
        const res = await fetch(`/api/tv/${tmdbId}/season/${selectedSeason}`);
        if (res.ok) setSeasonDetails(await res.json());
      } catch {}
    }
    loadSeason();
  }, [tmdbId, mediaType, selectedSeason]);

  // Load resume position
  useEffect(() => {
    async function loadPos() {
      try {
        const pos = await playbackApi.getPosition(mediaType, tmdbId);
        if (pos && pos.position_seconds > 30) setResumePosition(pos);
      } catch {}
    }
    loadPos();
  }, [tmdbId, mediaType]);

  // Check favorite
  useEffect(() => {
    async function checkFav() {
      try {
        const r = await playbackApi.checkFavorite(mediaType, tmdbId);
        setIsFavorite(r?.isFavorite || false);
      } catch {}
    }
    checkFav();
  }, [tmdbId, mediaType]);

  // Search torrents
  const searchTorrents = useCallback(async (season, episode) => {
    if (!content) return;
    setSearchingTorrents(true);
    try {
      const title = content.title || content.name;
      const year = (content.release_date || content.first_air_date || '').slice(0, 4);
      let url;
      if (mediaType === 'movie') {
        url = `/api/torrents/search?q=${encodeURIComponent(title + ' ' + year)}&category=Movies`;
      } else {
        const epStr = season && episode ? ` S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}` : '';
        url = `/api/torrents/search?q=${encodeURIComponent(title + epStr)}&category=TV`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTorrents(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (err) { console.error('Torrent search:', err); }
    finally { setSearchingTorrents(false); }
  }, [content, mediaType]);

  // Auto-search on load
  useEffect(() => {
    if (content) {
      if (mediaType === 'movie') searchTorrents();
      else if (episodeParam) searchTorrents(seasonParam, episodeParam);
    }
  }, [content, mediaType, searchTorrents, seasonParam, episodeParam]);

  const handleTorrentSelect = (torrent, index) => {
    const base = `/player/${mediaType}/${tmdbId}`;
    const p = new URLSearchParams();
    if (mediaType === 'tv' && selectedSeason) {
      p.set('season', selectedSeason);
      if (episodeParam) p.set('episode', episodeParam);
    }
    router.push(`${base}?${p.toString()}`);
  };

  const handlePlayClick = () => {
    const base = `/player/${mediaType}/${tmdbId}`;
    if (mediaType === 'tv') {
      router.push(`${base}?season=${selectedSeason}&episode=${episodeParam || 1}`);
    } else {
      router.push(base);
    }
  };

  const handleEpisodeClick = (seasonNum, episodeNum) => {
    router.push(`/player/tv/${tmdbId}?season=${seasonNum}&episode=${episodeNum}`);
  };

  const handleSearchEpisodeTorrents = (seasonNum, episodeNum) => {
    searchTorrents(seasonNum, episodeNum);
    document.getElementById('torrents-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await playbackApi.removeFavorite(mediaType, tmdbId);
        setIsFavorite(false);
      } else {
        await playbackApi.addFavorite({ mediaType, tmdbId, title: content.title || content.name, posterPath: content.poster_path, backdropPath: content.backdrop_path });
        setIsFavorite(true);
      }
    } catch {}
  };

  if (loading) return <MainLayout><div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-sp-red animate-spin" /></div></MainLayout>;
  if (!content) return <MainLayout><div className="flex flex-col items-center justify-center h-[60vh] gap-4"><p className="text-zinc-400 text-lg">Contenu introuvable</p><button onClick={() => router.push('/')} className="px-6 py-3 bg-white/10 rounded-xl text-white hover:bg-white/20">Retour</button></div></MainLayout>;

  const title = content.title || content.name;
  const year = (content.release_date || content.first_air_date || '').slice(0, 4);
  const rating = content.vote_average?.toFixed(1);
  const runtime = content.runtime || (content.episode_run_time?.[0]);
  const genres = content.genres || [];
  const backdrop = content.backdrop_path ? `https://image.tmdb.org/t/p/original${content.backdrop_path}` : null;
  const poster = content.poster_path ? `https://image.tmdb.org/t/p/w500${content.poster_path}` : null;
  const cast = content.credits?.cast || [];
  const crew = content.credits?.crew || [];
  const director = crew.find(c => c.job === 'Director');
  const seasons = content.seasons?.filter(s => s.season_number > 0) || [];
  const videos = content.videos?.results || [];
  const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') || videos.find(v => v.site === 'YouTube');

  return (
    <MainLayout>
      {/* Hero Backdrop */}
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        {backdrop ? <img src={backdrop} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-sp-dark to-sp-darker" />}
        <div className="absolute inset-0 bg-gradient-to-t from-sp-darker via-sp-darker/50 to-sp-darker/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-sp-darker/80 via-sp-darker/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-sp-darker to-transparent" />
        <button onClick={() => router.back()} className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-xl text-white/80 hover:text-white hover:bg-black/60 transition-all">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>

      {/* Content */}
      <div className="relative -mt-40 z-10 px-4 md:px-8 lg:px-10 max-w-7xl mx-auto pb-16">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          {poster && (
            <div className="flex-shrink-0 hidden md:block">
              <img src={poster} alt={title} className="w-56 lg:w-64 rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-sp-red text-white text-xs font-bold rounded-lg uppercase">{mediaType === 'tv' ? 'Série' : 'Film'}</span>
              {year && <span className="px-2.5 py-1 bg-white/10 text-zinc-300 text-xs rounded-lg flex items-center gap-1"><Calendar className="w-3 h-3" /> {year}</span>}
              {rating > 0 && <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-lg flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400" /> {rating}</span>}
              {runtime && <span className="px-2.5 py-1 bg-white/10 text-zinc-300 text-xs rounded-lg flex items-center gap-1"><Clock className="w-3 h-3" /> {runtime} min</span>}
              {content.number_of_seasons && <span className="px-2.5 py-1 bg-white/10 text-zinc-300 text-xs rounded-lg">{content.number_of_seasons} saison{content.number_of_seasons > 1 ? 's' : ''}</span>}
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">{title}</h1>
            {content.tagline && <p className="text-zinc-400 italic mb-3">{content.tagline}</p>}

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {genres.map(g => <span key={g.id} className="px-3 py-1 bg-white/5 border border-white/10 text-zinc-300 text-sm rounded-lg">{g.name}</span>)}
              </div>
            )}

            {director && <p className="text-zinc-400 text-sm mb-1">Réalisé par <span className="text-white">{director.name}</span></p>}
            {content.created_by?.length > 0 && <p className="text-zinc-400 text-sm mb-1">Créé par <span className="text-white">{content.created_by.map(c => c.name).join(', ')}</span></p>}

            {content.overview && <p className="text-zinc-300 text-sm md:text-base leading-relaxed mb-6 max-w-3xl">{content.overview}</p>}

            {/* Resume banner */}
            {resumePosition && (
              <div className="mb-4 p-4 bg-sp-red/10 border border-sp-red/20 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-sp-red flex items-center justify-center flex-shrink-0"><Play className="w-5 h-5 text-white fill-white ml-0.5" /></div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Reprendre la lecture</p>
                  <p className="text-zinc-400 text-xs">Position : {Math.floor(resumePosition.position_seconds / 60)} min{resumePosition.season_number ? ` · S${resumePosition.season_number}E${resumePosition.episode_number}` : ''}</p>
                </div>
                <button onClick={() => {
                  const base = `/player/${mediaType}/${tmdbId}`;
                  const p = new URLSearchParams();
                  if (resumePosition.season_number) { p.set('season', resumePosition.season_number); p.set('episode', resumePosition.episode_number); }
                  router.push(`${base}?${p.toString()}`);
                }} className="px-5 py-2.5 bg-sp-red hover:bg-red-500 text-white font-bold rounded-xl transition-all hover:scale-105 text-sm">▶ Reprendre</button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <button onClick={handlePlayClick} className="flex items-center gap-2 px-8 py-3.5 bg-sp-red hover:bg-red-500 text-white font-bold rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-sp-red/25"><Play className="w-5 h-5 fill-white" /> Regarder</button>
              {trailer && <button onClick={() => setShowTrailer(true)} className="flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"><ExternalLink className="w-4 h-4" /> Bande-annonce</button>}
              <button onClick={toggleFavorite} className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium transition-all ${isFavorite ? 'bg-sp-red/20 text-sp-red border border-sp-red/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}><Heart className={`w-4 h-4 ${isFavorite ? 'fill-sp-red' : ''}`} />{isFavorite ? 'Dans Ma Liste' : 'Ma Liste'}</button>
              <button className="p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"><Share2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* TV: Season/Episode Selector */}
        {mediaType === 'tv' && seasons.length > 0 && (
          <SeasonSelector seasons={seasons} selectedSeason={selectedSeason} onSeasonChange={setSelectedSeason} seasonDetails={seasonDetails} tmdbId={tmdbId} onEpisodePlay={handleEpisodeClick} onEpisodeSearch={handleSearchEpisodeTorrents} />
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-zinc-500" /> Casting</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {cast.slice(0, 15).map(person => (
                <div key={person.id} className="flex-shrink-0 w-28 text-center group">
                  <div className="w-28 h-28 rounded-full overflow-hidden bg-zinc-800 mb-2 ring-2 ring-white/5 group-hover:ring-sp-red/30 transition-all">
                    {person.profile_path ? <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-600">👤</div>}
                  </div>
                  <p className="text-white text-xs font-medium truncate">{person.name}</p>
                  <p className="text-zinc-500 text-[10px] truncate">{person.character}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Torrent Sources */}
        <section id="torrents-section" className="mb-10">
          <TorrentList torrents={torrents} onSelect={handleTorrentSelect} selectedIndex={-1} isLoading={searchingTorrents} />
          {!searchingTorrents && torrents.length === 0 && content && (
            <button onClick={() => searchTorrents()} className="mt-4 px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm transition-colors">🔍 Rechercher les sources</button>
          )}
        </section>

        {/* Recommendations */}
        {similar.length > 0 && <ContentRow title="Titres similaires" icon="🎭" items={similar} type={mediaType} />}
      </div>

      {/* Trailer Modal */}
      {showTrailer && trailer && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTrailer(false)}>
          <div className="relative w-full max-w-4xl aspect-video" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowTrailer(false)} className="absolute -top-12 right-0 text-white/70 hover:text-white text-sm">Fermer ✕</button>
            <iframe src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`} className="w-full h-full rounded-2xl" allow="autoplay; encrypted-media" allowFullScreen />
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default function WatchPage() {
  return <Suspense fallback={<MainLayout><div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-sp-red animate-spin" /></div></MainLayout>}><WatchContent /></Suspense>;
}
