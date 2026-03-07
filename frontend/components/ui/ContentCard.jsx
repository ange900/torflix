'use client';
import { useRouter } from 'next/navigation';
import { Star, Play } from 'lucide-react';

export default function ContentCard({ item, type = 'movie', showProgress = false, index = 0 }) {
  const router = useRouter();
  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average?.toFixed(1);
  const poster = item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : null;
  const progress = showProgress && item.position_seconds && item.duration_seconds
    ? (item.position_seconds / item.duration_seconds) * 100 : 0;

  return (
    <div
      onClick={() => router.push(`/watch/${type}/${item.id || item.tmdb_id}`)}
      className="flex-shrink-0 w-[140px] sm:w-[155px] md:w-[165px] cursor-pointer group animate-fade-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800/50 mb-2 card-hover ring-1 ring-white/5 group-hover:ring-white/20">
        {/* Poster */}
        {poster ? (
          <img
            src={poster} alt={title} loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <span className="text-zinc-600 text-3xl">🎬</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-sp-red/90 flex items-center justify-center transform scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 shadow-lg glow-red">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
          </div>
          {/* Bottom info on hover */}
          <div className="absolute bottom-3 left-3 right-3 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            {year && <p className="text-zinc-300 text-[11px]">{year}</p>}
          </div>
        </div>

        {/* Rating badge */}
        {rating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[11px] text-yellow-400 font-bold">
            <Star className="w-2.5 h-2.5 fill-yellow-400" /> {rating}
          </div>
        )}

        {/* Progress bar */}
        {progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div className="h-full bg-sp-red rounded-full transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        )}
      </div>

      {/* Title */}
      <p className="text-white text-xs sm:text-sm font-medium truncate group-hover:text-sp-red transition-colors duration-200">{title}</p>
    </div>
  );
}
