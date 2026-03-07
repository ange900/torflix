'use client';
import { useState } from 'react';
import { Play, Search, ChevronDown, Clock, Star, Calendar } from 'lucide-react';

function EpisodeCard({ episode, tmdbId, seasonNumber, onPlay, onSearch }) {
  const still = episode.still_path ? `https://image.tmdb.org/t/p/w300${episode.still_path}` : null;
  const airDate = episode.air_date;
  const isPast = airDate ? new Date(airDate) <= new Date() : true;
  const rating = episode.vote_average?.toFixed(1);

  return (
    <div className={`group rounded-xl overflow-hidden border transition-all ${isPast ? 'border-white/5 hover:border-white/15 bg-white/[0.02] hover:bg-white/[0.05]' : 'border-white/5 bg-white/[0.01] opacity-60'}`}>
      <div className="relative aspect-video bg-zinc-900">
        {still ? <img src={still} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900"><span className="text-3xl text-zinc-700">📺</span></div>}
        {isPast && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
            <button onClick={() => onPlay(seasonNumber, episode.episode_number)} className="w-12 h-12 rounded-full bg-sp-red/0 group-hover:bg-sp-red flex items-center justify-center transform scale-50 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </button>
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded-md text-xs font-bold text-white">E{episode.episode_number}</div>
        {rating > 0 && <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded-md text-xs text-yellow-400"><Star className="w-3 h-3 fill-yellow-400" /> {rating}</div>}
      </div>
      <div className="p-3">
        <h4 className="text-white text-sm font-medium mb-1 line-clamp-1">{episode.name || `Épisode ${episode.episode_number}`}</h4>
        <div className="flex items-center gap-2 mb-2">
          {episode.runtime && <span className="text-zinc-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {episode.runtime} min</span>}
          {airDate && <span className="text-zinc-500 text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> {airDate}</span>}
        </div>
        {episode.overview && <p className="text-zinc-500 text-xs line-clamp-2 mb-2">{episode.overview}</p>}
        {isPast ? (
          <div className="flex gap-2">
            <button onClick={() => onPlay(seasonNumber, episode.episode_number)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-sp-red/10 hover:bg-sp-red/20 text-sp-red text-xs font-medium rounded-lg transition-colors"><Play className="w-3 h-3 fill-sp-red" /> Regarder</button>
            <button onClick={() => onSearch(seasonNumber, episode.episode_number)} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 text-xs rounded-lg transition-colors"><Search className="w-3 h-3" /> Sources</button>
          </div>
        ) : <p className="text-zinc-600 text-xs italic">Pas encore diffusé</p>}
      </div>
    </div>
  );
}

export default function SeasonSelector({ seasons = [], selectedSeason, onSeasonChange, seasonDetails, tmdbId, onEpisodePlay, onEpisodeSearch }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const currentSeason = seasons.find(s => s.season_number === selectedSeason);
  const episodes = seasonDetails?.episodes || [];

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">📺 Épisodes</h2>
        <div className="relative">
          <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors">
            <span className="text-sm font-medium">{currentSeason ? `Saison ${currentSeason.season_number}` : `Saison ${selectedSeason}`}</span>
            {currentSeason?.episode_count && <span className="text-xs text-zinc-500">({currentSeason.episode_count} ép.)</span>}
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showDropdown && (
            <><div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 mt-2 w-64 bg-sp-darker border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-20 overflow-hidden max-h-80 overflow-y-auto">
              {seasons.map(s => (
                <button key={s.season_number} onClick={() => { onSeasonChange(s.season_number); setShowDropdown(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${selectedSeason === s.season_number ? 'bg-sp-red/10 border-l-2 border-sp-red' : ''}`}>
                  {s.poster_path && <img src={`https://image.tmdb.org/t/p/w92${s.poster_path}`} alt="" className="w-10 h-14 rounded-lg object-cover flex-shrink-0" />}
                  <div><p className={`text-sm font-medium ${selectedSeason === s.season_number ? 'text-sp-red' : 'text-white'}`}>Saison {s.season_number}</p><p className="text-xs text-zinc-500">{s.episode_count} épisodes · {s.air_date?.slice(0, 4) || ''}</p></div>
                </button>
              ))}
            </div></>
          )}
        </div>
      </div>
      {currentSeason?.overview && <p className="text-zinc-400 text-sm mb-6 max-w-3xl">{currentSeason.overview}</p>}
      {episodes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {episodes.map(ep => <EpisodeCard key={ep.episode_number} episode={ep} tmdbId={tmdbId} seasonNumber={selectedSeason} onPlay={onEpisodePlay} onSearch={onEpisodeSearch} />)}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-sp-red border-t-transparent rounded-full animate-spin" /><span className="ml-3 text-zinc-500 text-sm">Chargement des épisodes...</span></div>
      )}
    </section>
  );
}
