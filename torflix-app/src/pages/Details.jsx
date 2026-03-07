import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, Star, Calendar, Clock, Download, Loader2, ChevronDown, Youtube, X, Heart, Share2, MessageCircle } from 'lucide-react';
import { tmdb, img, backdrop } from '../services/tmdb';
import { searchTorrents } from '../services/torrents';
import { getStoredAuth } from '../services/auth';

export default function Details() {
  const { type, id } = useParams();
  const nav = useNavigate();
  const [content, setContent] = useState(null);
  const [torrents, setTorrents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [torLoading, setTorLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonData, setSeasonData] = useState(null);
  const [showAllTorrents, setShowAllTorrents] = useState(false);
  const [epLoading, setEpLoading] = useState(null);
  const [epTorrents, setEpTorrents] = useState({});
  const [showEpTorrents, setShowEpTorrents] = useState(null);
  const [trailer, setTrailer] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [ratings, setRatings] = useState({ ratings: [], average: 0, total: 0 });
  const [userRating, setUserRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [showRatings, setShowRatings] = useState(false);

  useEffect(() => {
    setLoading(true);
    setTorrents([]);
    setEpTorrents({});
    const fetcher = type === 'tv' ? tmdb.tv : tmdb.movie;
    fetcher(id).then(d => {
      setContent(d);
      if (d.seasons?.length) {
        const first = d.seasons.find(s => s.season_number > 0);
        if (first) setSelectedSeason(first.season_number);
      }
      // For movies, search torrents immediately
      if (type !== 'tv') {
        const title = d.original_title || d.title;
        const frTitle = d.title;
        const year = (d.release_date || '').slice(0, 4);
        setTorLoading(true);
        Promise.all([
          searchTorrents(title + ' ' + year),
          title !== frTitle ? searchTorrents(frTitle + ' ' + year) : Promise.resolve([]),
        ]).then(([r1, r2]) => {
          setTorrents(dedup(sortTorrents([...r1, ...r2])));
        }).finally(() => setTorLoading(false));
      }
    }).finally(() => setLoading(false));
      // Check favorite
      const auth = getStoredAuth();
      const tk = auth?.tokens?.refreshToken;
      if (tk) {
        fetch(`https://torfix.xyz/api/ratings/${id}/${type}`).then(r=>r.ok?r.json():{}).then(d=>{
          setRatings(d);
          const mine = (d.ratings||[]).find(r=>r.user_id===auth?.user?.id);
          if(mine){setUserRating(mine.rating);setReviewText(mine.review||'');}
        }).catch(()=>{});
        fetch(`https://torfix.xyz/api/favorites/check/${id}/${type}`, { headers: { Authorization: 'Bearer ' + tk } })
          .then(r => r.ok ? r.json() : {}).then(d => setIsFav(d.isFavorite || false)).catch(() => {});
      }
      // Fetch trailer
      tmdb.get(`/${type}/${id}/videos`).then(vdata => {
        const vids = vdata.results || [];
        const yt = vids.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.iso_639_1 === 'fr')
          || vids.find(v => v.site === 'YouTube' && v.type === 'Trailer')
          || vids.find(v => v.site === 'YouTube');
        if (yt) setTrailer(yt);
      }).catch(() => {});
  }, [type, id]);

  useEffect(() => {
    if (type === 'tv' && content) {
      tmdb.season(id, selectedSeason).then(setSeasonData).catch(() => {});
      // Search season pack torrents
      const name = content.original_name || content.name;
      const frName = content.name;
      const sNum = String(selectedSeason).padStart(2, '0');
      setTorLoading(true);
      setTorrents([]);
      Promise.all([
        searchTorrents(`${name} S${sNum}`),
        name !== frName ? searchTorrents(`${frName} Saison ${selectedSeason}`) : Promise.resolve([]),
      ]).then(([r1, r2]) => {
        setTorrents(dedup(sortTorrents([...r1, ...r2])));
      }).finally(() => setTorLoading(false));
    }
  }, [selectedSeason, content]);

  const searchEpisode = async (epNum) => {
    if (!content) return;
    const key = `${selectedSeason}-${epNum}`;
    setEpLoading(key);
    setShowEpTorrents(key);
    try {
      const name = content.original_name || content.name;
      const frName = content.name;
      const sNum = String(selectedSeason).padStart(2, '0');
      const eNum = String(epNum).padStart(2, '0');
      const [r1, r2, r3] = await Promise.all([
        searchTorrents(`${name} S${sNum}E${eNum}`),
        name !== frName ? searchTorrents(`${frName} S${sNum}E${eNum}`) : Promise.resolve([]),
        searchTorrents(`${name} Saison ${selectedSeason} Episode ${epNum}`),
      ]);
      const results = dedup(sortTorrents([...r1, ...r2, ...r3]));
      setEpTorrents(prev => ({ ...prev, [key]: results }));
    } catch { }
    setEpLoading(null);
  };

  const playEpisode = (epNum) => {
    const key = `${selectedSeason}-${epNum}`;
    const epResults = epTorrents[key];
    if (epResults?.length) {
      playTorrent(epResults[0], `${content.name} S${selectedSeason}E${epNum}`);
    } else {
      searchEpisode(epNum);
    }
  };

  const dedup = (arr) => {
    const seen = new Set();
    return arr.filter(t => {
      const k = (t.hash || t.title || '').toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const sortTorrents = (arr) => {
    const langOrder = { FR: 0, MULTI: 1, VOSTFR: 2, VO: 3 };
    return arr.sort((a, b) => {
      const la = langOrder[a.lang] ?? 3;
      const lb = langOrder[b.lang] ?? 3;
      if (la !== lb) return la - lb;
      return b.seeders - a.seeders;
    });
  };

  const getBestTorrent = () => {
    const fr = torrents.filter(t => t.lang === 'FR' || t.lang === 'MULTI');
    if (fr.length) {
      const hd = fr.filter(t => t.quality === '1080p');
      return hd.length ? hd[0] : fr[0];
    }
    return torrents[0] || null;
  };

  const playTorrent = (t, titleOverride) => {
    if (!t) return;
    const link = t.magnet || t.downloadUrl || '';
    if (!link) return;
    const name = titleOverride || content?.title || content?.name || '';
    // Pass fallback torrents for multi-server
    const otherTorrents = torrents.filter(x => x !== t).slice(0, 5).map(x => ({ magnet: x.magnet, downloadUrl: x.downloadUrl, title: x.title }));
    const fb = otherTorrents.length ? '&fallbacks=' + encodeURIComponent(JSON.stringify(otherTorrents)) : '';
    const tmdbParam = id ? '&tmdbId=' + id + '&type=' + type : '';
    nav('/player?magnet=' + encodeURIComponent(link) + '&title=' + encodeURIComponent(name) + tmdbParam + fb);
  };

  const downloadTorrent = (t) => {
    if (!t) return;
    if (t.magnet) window.open(t.magnet, '_blank');
    else if (t.downloadUrl) window.open(t.downloadUrl, '_blank');
  };

  const qualityColor = (q) => {
    if (q === '2160p' || q === '4K') return 'text-amber-400 border-amber-400';
    if (q === '1080p') return 'text-green-400 border-green-400';
    if (q === '720p') return 'text-blue-400 border-blue-400';
    return 'text-zinc-400 border-zinc-400';
  };

  const langBadge = (t) => {
    const colors = { FR: 'bg-blue-500', MULTI: 'bg-purple-500', VOSTFR: 'bg-cyan-500', VO: 'bg-zinc-600' };
    return <span className={`px-1.5 py-0.5 ${colors[t.lang] || 'bg-zinc-600'} text-white text-[9px] font-bold rounded`}>{t.lang}</span>;
  };

  const shareContent = async () => {
    const url = window.location.href;
    const text = (content?.title || content?.name) + ' - Regarde sur TorFlix!';
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url);
      alert('Lien copie!');
    }
  };

  const submitRating = async (stars) => {
    const auth = getStoredAuth();
    const tk = auth?.tokens?.refreshToken;
    if (!tk) return;
    setUserRating(stars);
    await fetch('https://torfix.xyz/api/ratings', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId: parseInt(id), mediaType: type, rating: stars, review: reviewText }),
    });
    const res = await fetch(`https://torfix.xyz/api/ratings/${id}/${type}`);
    if (res.ok) setRatings(await res.json());
  };

  const toggleFavorite = async () => {
    const auth = getStoredAuth();
    const tk = auth?.tokens?.refreshToken;
    if (!tk) return;
    const headers = { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' };
    if (isFav) {
      await fetch(`https://torfix.xyz/api/favorites/${id}/${type}`, { method: 'DELETE', headers });
      setIsFav(false);
    } else {
      await fetch('https://torfix.xyz/api/favorites', { method: 'POST', headers,
        body: JSON.stringify({ tmdbId: id, mediaType: type, title: content?.title || content?.name, posterPath: content?.poster_path })
      });
      setIsFav(true);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 text-red animate-spin" /></div>;
  if (!content) return <div className="flex items-center justify-center h-screen text-zinc-500">Introuvable</div>;

  const title = content.title || content.name;
  const year = (content.release_date || content.first_air_date || '').slice(0, 4);
  const runtime = content.runtime || content.episode_run_time?.[0];
  const genres = content.genres || [];
  const cast = (content.credits?.cast || []).slice(0, 10);
  const seasons = (content.seasons || []).filter(s => s.season_number > 0);
  const displayTorrents = showAllTorrents ? torrents : torrents.slice(0, 5);
  const best = getBestTorrent();

  return (
    <div className="text-white">
      {/* Backdrop */}
      <div className="relative h-[35vh] min-h-[250px]">
        {content.backdrop_path && <img src={backdrop(content.backdrop_path)} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/20" />
        <button onClick={() => nav(-1)} className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/50 safe-top">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 -mt-20 relative z-10">
        <h1 className="text-2xl font-extrabold mb-2">{title}</h1>
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-zinc-400">
          {content.vote_average > 0 && <span className="flex items-center gap-0.5 text-amber-400 font-bold"><Star className="w-3 h-3 fill-amber-400" />{content.vote_average.toFixed(1)}</span>}
          {year && <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{year}</span>}
          {runtime && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{runtime}min</span>}
          <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">{type === 'tv' ? 'Série' : 'Film'}</span>
          {best && <span className={`px-1.5 py-0.5 ${best.lang === 'FR' ? 'bg-blue-500' : best.lang === 'MULTI' ? 'bg-purple-500' : 'bg-zinc-600'} text-white text-[10px] font-bold rounded`}>{best.lang}</span>}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {genres.map(g => <span key={g.id} className="px-2.5 py-1 bg-white/10 rounded-full text-[11px] text-zinc-300">{g.name}</span>)}
        </div>

        {/* Trailer button for TV */}
        {type === 'tv' && trailer && (
          <button onClick={() => setShowTrailer(true)}
            className="flex items-center gap-2 mb-3 px-4 py-2.5 bg-white/10 text-white font-bold rounded-xl text-sm active:scale-95 transition-transform">
            <Youtube className="w-5 h-5 text-red-500" /> Bande-annonce
          </button>
        )}

        {/* Play + Download for movies */}
        {type !== 'tv' && (
          <div className="flex gap-2 mb-3">
            {trailer && (
              <button onClick={() => setShowTrailer(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 text-white font-bold rounded-xl text-sm active:scale-95 transition-transform">
                <Youtube className="w-5 h-5 text-red-500" />
              </button>
            )}
            <button onClick={() => playTorrent(best)} disabled={torLoading || !best}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white font-bold rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-40">
              {torLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
              {torLoading ? 'Recherche...' : 'Lecture'}
            </button>
            <button onClick={() => downloadTorrent(best)} disabled={torLoading || !best}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white/10 text-white font-bold rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-40">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={toggleFavorite}
              className="flex items-center justify-center px-4 py-3 bg-white/10 rounded-xl active:scale-95 transition-transform">
              <Heart className={`w-5 h-5 ${isFav ? 'text-red-500 fill-red-500' : 'text-white'}`} />
            </button>
            <button onClick={shareContent}
              className="flex items-center justify-center px-4 py-3 bg-white/10 rounded-xl active:scale-95 transition-transform">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        )}

        {/* Best source info */}
        {best && !torLoading && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-white/5 rounded-lg">
            <span className="text-[10px] text-zinc-500">Meilleure source:</span>
            {langBadge(best)}
            <span className={`px-1 py-0.5 border ${qualityColor(best.quality)} text-[9px] font-bold rounded`}>{best.quality}</span>
            <span className="text-[10px] text-zinc-400">{best.size}</span>
            <span className="text-[10px] text-green-400">⬆{best.seeders}</span>
          </div>
        )}

        {content.overview && <p className="text-sm text-zinc-300 leading-relaxed mb-6 line-clamp-4">{content.overview}</p>}

        {/* Cast */}
        {cast.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold mb-3">Casting</h3>
            <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {cast.map(a => (
                <div key={a.id} className="flex-shrink-0 w-[70px] text-center">
                  <div className="w-[70px] h-[70px] rounded-full overflow-hidden bg-surface mb-1">
                    {a.profile_path ? <img src={img(a.profile_path, 'w185')} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600">👤</div>}
                  </div>
                  <p className="text-[10px] font-medium truncate">{a.name}</p>
                  <p className="text-[9px] text-zinc-500 truncate">{a.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seasons + Episodes (TV) */}
        {type === 'tv' && seasons.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold mb-3">Saisons</h3>
            <div className="flex gap-2 mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {seasons.map(s => (
                <button key={s.id} onClick={() => { setSelectedSeason(s.season_number); setShowEpTorrents(null); }}
                  className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${selectedSeason === s.season_number ? 'bg-red-600 text-white' : 'bg-surface text-zinc-400'}`}>
                  S{String(s.season_number).padStart(2, '0')} <span className="opacity-60 ml-1">({s.episode_count})</span>
                </button>
              ))}
            </div>

            {seasonData?.episodes && (
              <div className="space-y-2">
                {seasonData.episodes.map(ep => {
                  const epKey = `${selectedSeason}-${ep.episode_number}`;
                  const epResults = epTorrents[epKey] || [];
                  const isExpanded = showEpTorrents === epKey;
                  const isLoading = epLoading === epKey;

                  return (
                    <div key={ep.id} className="bg-surface rounded-xl overflow-hidden">
                      {/* Episode row */}
                      <div className="flex gap-3 p-2.5">
                        <div className="flex-shrink-0 w-[100px] aspect-video rounded-lg overflow-hidden bg-surface2 relative cursor-pointer"
                          onClick={() => playEpisode(ep.episode_number)}>
                          {ep.still_path ? <img src={img(ep.still_path, 'w300')} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-700">🎬</div>}
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Play className="w-8 h-8 text-white fill-white drop-shadow-lg" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">E{ep.episode_number}. {ep.name}</p>
                          <div className="flex gap-2 text-[10px] text-zinc-500 mt-0.5">
                            {ep.runtime && <span>{ep.runtime}min</span>}
                            {ep.vote_average > 0 && <span className="text-amber-400">★{ep.vote_average.toFixed(1)}</span>}
                          </div>
                          {ep.overview && <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1">{ep.overview}</p>}
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => playEpisode(ep.episode_number)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold active:scale-95 transition-transform">
                              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-white" />}
                              Lecture
                            </button>
                            <button onClick={() => isExpanded ? setShowEpTorrents(null) : searchEpisode(ep.episode_number)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 text-zinc-300 rounded-lg text-[10px] font-medium active:scale-95">
                              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                              Sources
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Episode torrents */}
                      {isExpanded && (
                        <div className="px-2.5 pb-2.5 pt-0">
                          {isLoading ? (
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                              <Loader2 className="w-3 h-3 text-red-500 animate-spin" />
                              <span className="text-[10px] text-zinc-400">Recherche S{String(selectedSeason).padStart(2,'0')}E{String(ep.episode_number).padStart(2,'0')}...</span>
                            </div>
                          ) : epResults.length > 0 ? (
                            <div className="space-y-1">
                              {epResults.slice(0, 5).map((t, i) => (
                                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer active:scale-[0.98] ${i === 0 ? 'bg-red-600/10 border border-red-600/20' : 'bg-white/5'}`}
                                  onClick={() => playTorrent(t, `${content.name} S${selectedSeason}E${ep.episode_number}`)}>
                                  {langBadge(t)}
                                  <span className={`px-1 py-0.5 border ${qualityColor(t.quality)} text-[9px] font-bold rounded`}>{t.quality}</span>
                                  <span className="flex-1 text-[10px] text-zinc-300 truncate">{t.title}</span>
                                  <span className="text-[9px] text-zinc-500">{t.size}</span>
                                  <span className="text-[9px] text-green-400 font-bold">⬆{t.seeders}</span>
                                  {i === 0 && <span className="px-1 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded">BEST</span>}
                                </div>
                              ))}
                              {epResults.length > 5 && <p className="text-[10px] text-zinc-500 text-center">+{epResults.length - 5} autres sources</p>}
                            </div>
                          ) : (
                            <div className="p-2 bg-white/5 rounded-lg text-center text-[10px] text-zinc-500">
                              Aucune source trouvée pour cet épisode
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Community Ratings */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2 cursor-pointer" onClick={() => setShowRatings(!showRatings)}>
            <MessageCircle className="w-4 h-4" /> Avis ({ratings.total}) {ratings.average > 0 && <span className="text-amber-400 text-xs">★ {ratings.average}/5</span>}
          </h3>
          {/* Rate */}
          <div className="flex items-center gap-3 mb-3 p-3 bg-surface rounded-xl">
            <span className="text-xs text-zinc-500">Votre note:</span>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => submitRating(s)} className="p-0.5">
                  <Star className={`w-5 h-5 ${s <= userRating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`} />
                </button>
              ))}
            </div>
          </div>
          {showRatings && ratings.ratings?.length > 0 && (
            <div className="space-y-2 mb-3">
              {ratings.ratings.slice(0, 5).map(r => (
                <div key={r.id} className="p-2.5 bg-surface rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white">{r.username}</span>
                    <div className="flex">{[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`} />)}</div>
                  </div>
                  {r.review && <p className="text-[10px] text-zinc-400">{r.review}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Torrents list (movies or season packs) */}
        <div className="mb-8">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Download className="w-4 h-4" />
            {type === 'tv' ? `Sources Saison ${selectedSeason}` : 'Sources disponibles'}
          </h3>
          {torLoading ? (
            <div className="flex items-center gap-2 p-4 bg-surface rounded-xl"><Loader2 className="w-4 h-4 text-red-500 animate-spin" /><span className="text-xs text-zinc-400">Recherche des sources...</span></div>
          ) : torrents.length > 0 ? (
            <>
              <div className="space-y-1.5">
                {displayTorrents.map((t, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2.5 rounded-xl ${i === 0 ? 'bg-red-600/10 border border-red-600/20' : 'bg-surface'}`}>
                    <div className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer active:scale-[0.98]" onClick={() => playTorrent(t)}>
                      {langBadge(t)}
                      <span className={`flex-shrink-0 px-1.5 py-0.5 border ${qualityColor(t.quality)} text-[10px] font-bold rounded`}>{t.quality}</span>
                      <span className="flex-1 text-[11px] text-zinc-300 truncate">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{t.size}</span>
                    <span className="text-[10px] text-green-400 font-bold">⬆{t.seeders}</span>
                    <button onClick={() => downloadTorrent(t)} className="p-1 text-zinc-500 active:text-white">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {i === 0 && <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded">BEST</span>}
                  </div>
                ))}
              </div>
              {torrents.length > 5 && (
                <button onClick={() => setShowAllTorrents(!showAllTorrents)}
                  className="w-full mt-2 py-2 text-xs text-red-500 flex items-center justify-center gap-1">
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAllTorrents ? 'rotate-180' : ''}`} />
                  {showAllTorrents ? 'Réduire' : `Voir les ${torrents.length} résultats`}
                </button>
              )}
            </>
          ) : (
            <div className="p-4 bg-surface rounded-xl text-center text-xs text-zinc-500">Aucun torrent trouvé</div>
          )}
        </div>

        {/* Trailer Modal */}
        {showTrailer && trailer && (
          <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4"
            onClick={() => setShowTrailer(false)}>
            <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-sm">{trailer.name}</h3>
                <button onClick={() => setShowTrailer(false)} className="p-2 rounded-full bg-white/10">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

                {/* Similar */}
        {content.similar?.results?.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold mb-3">Similaires</h3>
            <div className="flex gap-2.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {content.similar.results.slice(0, 10).map(item => (
                <div key={item.id} onClick={() => nav(`/details/${type}/${item.id}`)}
                  className="flex-shrink-0 w-[90px] cursor-pointer active:scale-95 transition-transform">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-surface mb-1">
                    {item.poster_path ? <img src={img(item.poster_path)} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center">🎬</div>}
                  </div>
                  <p className="text-[10px] font-medium truncate">{item.title || item.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
