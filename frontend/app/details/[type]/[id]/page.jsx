'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Play, Heart, ArrowLeft, Star, Calendar, Clock, Globe, ChevronDown, ChevronUp, ExternalLink, Users, Film, Tv, Download, Loader2, Search, CheckCircle } from 'lucide-react';

const IMG = 'https://image.tmdb.org/t/p';

export default function DetailsPage() {
  const { type, id } = useParams();
  const router = useRouter();
  const [content, setContent] = useState(null);
  const [torrents, setTorrents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [torrentLoading, setTorrentLoading] = useState(false);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonData, setSeasonData] = useState(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [episodeTorrents, setEpisodeTorrents] = useState([]);
  const [episodeTorrentLoading, setEpisodeTorrentLoading] = useState(false);

  const endpoint = type === 'tv' ? 'tv' : 'movies';

  useEffect(() => { fetchContent(); }, [id, type]);
  useEffect(() => { if (content && type !== 'tv') searchTorrents(); }, [content]);
  useEffect(() => { if (type === 'tv' && content) fetchSeason(selectedSeason); }, [selectedSeason, content]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${endpoint}/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setContent(data);
      if (data.seasons?.length) {
        const firstReal = data.seasons.find(s => s.season_number > 0);
        if (firstReal) setSelectedSeason(firstReal.season_number);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSeason = async (num) => {
    try {
      setSeasonLoading(true);
      setSelectedEpisode(null);
      setEpisodeTorrents([]);
      const res = await fetch(`/api/tv/${id}/season/${num}`);
      if (res.ok) {
        const data = await res.json();
        setSeasonData(data);
        // Search torrents for the full season
        searchSeasonTorrents(num);
      }
    } catch (err) { console.error(err); }
    finally { setSeasonLoading(false); }
  };

  const searchTorrents = async () => {
    if (!content) return;
    setTorrentLoading(true);
    try {
      const title = content.title || content.name;
      const year = (content.release_date || content.first_air_date || '').slice(0, 4);
      const q = `${title} ${year}`;
      const res = await fetch(`/api/torrents/search?q=${encodeURIComponent(q)}&category=Movies`);
      if (res.ok) {
        const data = await res.json();
        setTorrents(data.results || []);
      }
    } catch (err) { console.error(err); }
    finally { setTorrentLoading(false); }
  };

  const searchSeasonTorrents = async (seasonNum) => {
    if (!content) return;
    setTorrentLoading(true);
    try {
      const title = content.name || content.title;
      const sNum = String(seasonNum).padStart(2, '0');
      // Search for full season pack
      const q = `${title} S${sNum}`;
      const res = await fetch(`/api/torrents/search?q=${encodeURIComponent(q)}&category=TV`);
      if (res.ok) {
        const data = await res.json();
        setTorrents(data.results || []);
      }
    } catch (err) { console.error(err); }
    finally { setTorrentLoading(false); }
  };

  const searchEpisodeTorrents = async (ep) => {
    if (!content) return;
    setSelectedEpisode(ep);
    setEpisodeTorrentLoading(true);
    try {
      const title = content.name || content.title;
      const sNum = String(selectedSeason).padStart(2, '0');
      const eNum = String(ep.episode_number).padStart(2, '0');
      const q = `${title} S${sNum}E${eNum}`;
      const res = await fetch(`/api/torrents/search?q=${encodeURIComponent(q)}&category=TV`);
      if (res.ok) {
        const data = await res.json();
        setEpisodeTorrents(data.results || []);
      }
    } catch (err) { console.error(err); }
    finally { setEpisodeTorrentLoading(false); }
  };

  const handlePlay = (torrent, season, episode) => {
    const params = new URLSearchParams();
    if (torrent) {
      if (torrent.magnetUrl) params.set('magnet', torrent.magnetUrl);
      if (torrent.downloadUrl) params.set('download', torrent.downloadUrl);
    }
    if (season) params.set('season', season);
    if (episode) params.set('episode', episode);
    router.push(`/player/${type}/${id}?${params.toString()}`);
  };

  const detectLang = (title) => {
    const t = (title || '').toUpperCase();
    if (t.includes('MULTI')) return { label: 'MULTI', color: 'bg-emerald-500' };
    if (t.includes('VOSTFR')) return { label: 'VOSTFR', color: 'bg-purple-500' };
    if (t.includes('TRUEFRENCH') || t.includes('FRENCH') || t.match(/[\.\- ]VF[\.\- ]/)) return { label: 'VF', color: 'bg-blue-500' };
    return { label: 'VO', color: 'bg-zinc-500' };
  };

  const detectQuality = (title) => {
    const t = (title || '').toUpperCase();
    if (t.includes('2160P') || t.includes('4K') || t.includes('UHD')) return { label: '4K', color: 'text-amber-400 border-amber-400' };
    if (t.includes('1080P')) return { label: '1080p', color: 'text-green-400 border-green-400' };
    if (t.includes('720P')) return { label: '720p', color: 'text-blue-400 border-blue-400' };
    return { label: 'SD', color: 'text-zinc-400 border-zinc-400' };
  };

  const seedHealth = (s) => s >= 100 ? 'text-green-400' : s >= 10 ? 'text-orange-400' : 'text-red-400';

  const trailer = content?.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')
    || content?.videos?.results?.find(v => v.site === 'YouTube');

  if (loading) return (
    <MainLayout>
      <div className="animate-pulse">
        <div className="h-[40vh] bg-zinc-900 rounded-b-2xl" />
        <div className="px-[4%] py-6 space-y-4">
          <div className="w-64 h-8 bg-zinc-800 rounded" />
          <div className="w-full max-w-xl h-4 bg-zinc-800 rounded" />
        </div>
      </div>
    </MainLayout>
  );

  if (!content) return (
    <MainLayout><div className="min-h-[60vh] flex items-center justify-center"><p className="text-zinc-400">Contenu introuvable</p></div></MainLayout>
  );

  const title = content.title || content.name;
  const year = (content.release_date || content.first_air_date || '').slice(0, 4);
  const runtime = content.runtime || content.episode_run_time?.[0];
  const genres = content.genres || [];
  const cast = (content.credits?.cast || []).slice(0, 12);
  const directors = (content.credits?.crew || []).filter(c => c.job === 'Director');
  const seasons = (content.seasons || []).filter(s => s.season_number > 0);

  // Torrent list renderer
  const TorrentList = ({ items, loading: isLoading, onPlay, season, episode }) => {
    if (isLoading) return (
      <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
        <Loader2 className="w-4 h-4 text-sp-red animate-spin" />
        <span className="text-sm text-zinc-400">Recherche de torrents...</span>
      </div>
    );
    if (!items.length) return (
      <div className="p-4 bg-white/5 rounded-xl text-center">
        <p className="text-zinc-500 text-sm">Aucun torrent trouvé</p>
      </div>
    );
    return (
      <div className="space-y-1.5">
        {items.slice(0, 15).map((t, i) => {
          const lang = detectLang(t.title);
          const qual = detectQuality(t.title);
          return (
            <div key={i} onClick={() => onPlay(t, season, episode)}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.005] ${i === 0 ? 'bg-sp-red/10 border border-sp-red/20' : 'bg-white/[0.03] hover:bg-white/[0.07]'}`}>
              <span className={`flex-shrink-0 px-2 py-0.5 ${lang.color} text-white text-[10px] font-bold rounded`}>{lang.label}</span>
              <span className={`flex-shrink-0 px-1.5 py-0.5 border ${qual.color} text-[10px] font-bold rounded`}>{qual.label}</span>
              <span className="flex-1 text-xs text-zinc-300 truncate">{t.title}</span>
              {t.size && <span className="flex-shrink-0 text-[11px] text-zinc-500 hidden sm:block">{t.size}</span>}
              <span className={`flex-shrink-0 text-xs font-bold ${seedHealth(t.seeders)}`}>⬆{t.seeders || 0}</span>
              <span className="flex-shrink-0 text-[11px] text-orange-400/60">⬇{t.leechers || 0}</span>
              {i === 0 && <span className="flex-shrink-0 px-1.5 py-0.5 bg-sp-red text-white text-[9px] font-bold rounded">BEST</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="text-white overflow-hidden">
        {/* ── Backdrop ── */}
        <div className="relative h-[40vh] min-h-[280px] max-h-[400px] overflow-hidden rounded-b-2xl">
          {content.backdrop_path && <img src={`${IMG}/original${content.backdrop_path}`} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-sp-darker via-sp-darker/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-sp-darker/70 to-transparent" />
          <button onClick={() => router.back()} className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors backdrop-blur-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* ── Main content ── */}
        <div className="px-[4%] -mt-32 relative z-10">
          <div className="flex gap-6 flex-col md:flex-row">
            {/* Poster */}
            <div className="flex-shrink-0 w-[180px] hidden md:block">
              {content.poster_path ? (
                <img src={`${IMG}/w500${content.poster_path}`} alt={title} className="w-full rounded-xl shadow-2xl" />
              ) : (
                <div className="w-full aspect-[2/3] bg-zinc-800 rounded-xl flex items-center justify-center text-5xl">🎬</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{title}</h1>
              <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-zinc-400">
                {content.vote_average > 0 && (
                  <span className="flex items-center gap-1 text-amber-400 font-bold"><Star className="w-4 h-4 fill-amber-400" />{content.vote_average.toFixed(1)}</span>
                )}
                {year && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{year}</span>}
                {runtime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{runtime} min</span>}
                {content.original_language && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{content.original_language.toUpperCase()}</span>}
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs">{type === 'tv' ? 'Série' : 'Film'}</span>
                {type === 'tv' && content.number_of_seasons && (
                  <span className="text-xs">{content.number_of_seasons} saison{content.number_of_seasons > 1 ? 's' : ''} · {content.number_of_episodes} épisodes</span>
                )}
                {content.status && <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${content.status === 'Ended' || content.status === 'Canceled' ? 'bg-zinc-700 text-zinc-300' : 'bg-green-500/20 text-green-400'}`}>{content.status === 'Returning Series' ? 'En cours' : content.status === 'Ended' ? 'Terminée' : content.status}</span>}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {genres.map(g => <span key={g.id} className="px-3 py-1 bg-white/10 rounded-full text-xs text-zinc-300">{g.name}</span>)}
              </div>

              <div className="flex flex-wrap gap-3 mb-6">
                <button onClick={() => {
                  if (type === 'tv') {
                    const ep = seasonData?.episodes?.[0];
                    handlePlay(torrents[0], selectedSeason, ep?.episode_number || 1);
                  } else {
                    handlePlay(torrents[0]);
                  }
                }} className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-white/85 hover:scale-105 transition-all text-sm">
                  <Play className="w-5 h-5 fill-black" />Lecture
                </button>
                {trailer && (
                  <button onClick={() => setShowTrailer(!showTrailer)} className="flex items-center gap-2 px-6 py-2.5 bg-white/15 text-white font-bold rounded-lg hover:bg-white/25 transition-all text-sm backdrop-blur-sm">
                    <ExternalLink className="w-4 h-4" />Bande-annonce
                  </button>
                )}
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white/10 rounded-lg hover:bg-white/20 transition-all text-sm">
                  <Heart className="w-4 h-4" />Ma Liste
                </button>
              </div>

              {content.overview && (
                <div className="mb-6">
                  <p className={`text-sm text-zinc-300 leading-relaxed ${!showFullSynopsis ? 'line-clamp-3' : ''}`}>{content.overview}</p>
                  {content.overview.length > 200 && (
                    <button onClick={() => setShowFullSynopsis(!showFullSynopsis)} className="text-sp-red text-xs mt-1 flex items-center gap-1 hover:underline">
                      {showFullSynopsis ? <><ChevronUp className="w-3 h-3" />Réduire</> : <><ChevronDown className="w-3 h-3" />Lire la suite</>}
                    </button>
                  )}
                </div>
              )}

              {directors.length > 0 && <p className="text-xs text-zinc-500 mb-4">Réalisé par <span className="text-zinc-300">{directors.map(d => d.name).join(', ')}</span></p>}
            </div>
          </div>

          {/* Trailer */}
          {showTrailer && trailer && (
            <div className="mt-6 mb-8">
              <div className="relative w-full max-w-3xl aspect-video rounded-xl overflow-hidden bg-black">
                <iframe src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`} className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
              </div>
            </div>
          )}

          {/* Cast */}
          {cast.length > 0 && (
            <div className="mt-8 mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-zinc-400" />Casting</h2>
              <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
                {cast.map(actor => (
                  <div key={actor.id} className="flex-shrink-0 w-[100px] text-center">
                    <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-zinc-800 mb-2 mx-auto">
                      {actor.profile_path ? <img src={`${IMG}/w185${actor.profile_path}`} alt={actor.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-2xl text-zinc-600">👤</div>}
                    </div>
                    <p className="text-xs font-medium text-white truncate">{actor.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{actor.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════ SEASONS & EPISODES (TV) ══════ */}
          {type === 'tv' && seasons.length > 0 && (
            <div className="mt-8 mb-8">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                <Tv className="w-5 h-5 text-sp-red" />Saisons & Épisodes
              </h2>

              {/* Season tabs */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {seasons.map(s => (
                  <button key={s.id} onClick={() => setSelectedSeason(s.season_number)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedSeason === s.season_number ? 'bg-sp-red text-white shadow-lg shadow-sp-red/20' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5'}`}>
                    S{String(s.season_number).padStart(2, '0')}
                    {s.episode_count && <span className="ml-1.5 text-[10px] opacity-70">({s.episode_count} ép.)</span>}
                  </button>
                ))}
              </div>

              {/* Season info */}
              {seasonData && (
                <div className="mb-5">
                  <div className="flex items-start gap-4 p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                    {seasonData.poster_path && (
                      <img src={`${IMG}/w185${seasonData.poster_path}`} alt="" className="w-20 rounded-lg flex-shrink-0 hidden sm:block" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white mb-1">{seasonData.name || `Saison ${selectedSeason}`}</h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
                        {seasonData.air_date && <span>{seasonData.air_date.slice(0, 4)}</span>}
                        <span>{seasonData.episodes?.length || 0} épisodes</span>
                      </div>
                      {seasonData.overview && <p className="text-xs text-zinc-400 line-clamp-2">{seasonData.overview}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Episodes list */}
              {seasonLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-sp-red animate-spin" /></div>
              ) : seasonData?.episodes ? (
                <div className="space-y-2">
                  {seasonData.episodes.map(ep => {
                    const isSelected = selectedEpisode?.id === ep.id;
                    const epNum = String(ep.episode_number).padStart(2, '0');
                    const sNum = String(selectedSeason).padStart(2, '0');
                    const aired = ep.air_date ? new Date(ep.air_date) <= new Date() : true;

                    return (
                      <div key={ep.id} className="rounded-xl overflow-hidden border border-white/5 transition-all">
                        {/* Episode row */}
                        <div
                          onClick={() => isSelected ? setSelectedEpisode(null) : searchEpisodeTorrents(ep)}
                          className={`flex gap-3 p-3 cursor-pointer transition-all ${isSelected ? 'bg-white/[0.08]' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`}
                        >
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-[130px] aspect-video rounded-lg overflow-hidden bg-zinc-800 relative group">
                            {ep.still_path ? (
                              <img src={`${IMG}/w300${ep.still_path}`} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700 text-lg">🎬</div>
                            )}
                            {aired && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-6 h-6 text-white fill-white" />
                              </div>
                            )}
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] font-mono text-white">S{sNum}E{epNum}</span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-white truncate">
                                {ep.episode_number}. {ep.name}
                              </p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {ep.vote_average > 0 && (
                                  <span className="flex items-center gap-0.5 text-[11px] text-amber-400 font-bold">
                                    <Star className="w-3 h-3 fill-amber-400" />{ep.vote_average.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5 mb-1">
                              {ep.air_date && <span>{new Date(ep.air_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                              {ep.runtime && <span>{ep.runtime} min</span>}
                              {!aired && <span className="text-amber-500 font-semibold">Pas encore diffusé</span>}
                            </div>
                            {ep.overview && <p className="text-xs text-zinc-400 line-clamp-2">{ep.overview}</p>}

                            {/* Expand indicator */}
                            <div className="flex items-center gap-1 mt-1.5 text-[11px] text-sp-red">
                              <Search className="w-3 h-3" />
                              {isSelected ? 'Masquer les torrents' : 'Rechercher les torrents'}
                            </div>
                          </div>
                        </div>

                        {/* Episode torrents (expanded) */}
                        {isSelected && (
                          <div className="px-3 pb-3 bg-white/[0.03] border-t border-white/5">
                            <div className="pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-zinc-400 font-medium">
                                  Torrents pour S{sNum}E{epNum}
                                </p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handlePlay(episodeTorrents[0], selectedSeason, ep.episode_number); }}
                                  disabled={!episodeTorrents.length}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sp-red text-white text-xs font-semibold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Play className="w-3 h-3 fill-white" />Lire le meilleur
                                </button>
                              </div>
                              <TorrentList items={episodeTorrents} loading={episodeTorrentLoading} onPlay={handlePlay} season={selectedSeason} episode={ep.episode_number} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

          {/* ── Torrents (Films or Season Pack) ── */}
          <div className="mt-8 mb-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-zinc-400" />
              {type === 'tv' ? `Torrents Saison ${selectedSeason}` : 'Torrents disponibles'}
            </h2>
            <TorrentList items={torrents} loading={torrentLoading} onPlay={handlePlay} season={type === 'tv' ? selectedSeason : undefined} />
          </div>

          {/* ── Similar ── */}
          {content.similar?.results?.length > 0 && (
            <div className="mt-8 mb-16">
              <h2 className="text-lg font-bold mb-4">Similaires</h2>
              <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
                {content.similar.results.slice(0, 10).map(item => (
                  <div key={item.id} onClick={() => router.push(`/details/${type}/${item.id}`)}
                    className="flex-shrink-0 w-[120px] cursor-pointer hover:scale-105 transition-transform">
                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 mb-1">
                      {item.poster_path ? <img src={`${IMG}/w342${item.poster_path}`} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>}
                    </div>
                    <p className="text-[11px] font-medium truncate">{item.title || item.name}</p>
                    {item.vote_average > 0 && <p className="text-[10px] text-amber-400">★ {item.vote_average.toFixed(1)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
