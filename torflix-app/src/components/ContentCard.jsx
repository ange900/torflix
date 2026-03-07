import { useNavigate } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import { img } from '../services/tmdb';

export default function ContentCard({ item, type }) {
  const nav = useNavigate();
  const title = item.title || item.name;
  const mediaType = type || item.media_type || 'movie';
  const poster = img(item.poster_path);
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average?.toFixed(1);

  return (
    <div onClick={() => nav(`/details/${mediaType}/${item.id}`)}
      className="flex-shrink-0 w-[110px] sm:w-[130px] cursor-pointer group active:scale-95 transition-transform">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface mb-1.5">
        {poster ? (
          <img src={poster} alt={title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-2xl">🎬</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-red/90 flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
        </div>
        {rating > 0 && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-amber-400 font-bold">
            <Star className="w-2.5 h-2.5 fill-amber-400" />{rating}
          </div>
        )}
      </div>
      <p className="text-white text-xs font-medium truncate">{title}</p>
      {year && <p className="text-zinc-500 text-[10px]">{year}</p>}
    </div>
  );
}
