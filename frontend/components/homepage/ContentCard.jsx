'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ContentCard({ item, size = 'standard', onClick }) {
  const [hovered, setHovered] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const timer = useRef(null);
  const router = useRouter();

  const onEnter = () => { timer.current = setTimeout(() => setHovered(true), 350); };
  const onLeave = () => { clearTimeout(timer.current); setHovered(false); };
  const handleClick = () => onClick ? onClick(item) : router.push(`/details/${item.type}/${item.tmdb_id}`);
  const handlePlay = (e) => { e.stopPropagation(); router.push(`/player/${item.type}/${item.tmdb_id}`); };
  const handleInfo = (e) => { e.stopPropagation(); router.push(`/details/${item.type}/${item.tmdb_id}`); };

  const poster = size === 'large' ? (item.backdrop || item.poster_lg || item.poster) : (item.poster || item.poster_lg);
  const w = size === 'large' ? 'w-[300px]' : 'w-[160px]';
  const aspect = size === 'large' ? 'aspect-video' : 'aspect-[2/3]';

  return (
    <div className={`relative flex-shrink-0 ${w} rounded-md cursor-pointer transition-transform duration-300 ${hovered ? 'z-50' : ''}`}
      onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={handleClick}>
      <div className={`relative ${aspect} rounded-md overflow-hidden bg-zinc-900`}>
        {poster && !imgErr ? (
          <img src={poster} alt={item.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" onError={() => setImgErr(true)} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-zinc-900 to-slate-900 p-2">
            <span className="text-2xl">🎬</span>
            <span className="text-[9px] text-white/60 text-center line-clamp-2">{item.title}</span>
          </div>
        )}
        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-[11px] font-semibold text-white truncate drop-shadow-md">{item.title}</p>
          {item.rating > 0 && <span className="text-[10px] text-amber-400">★ {item.rating.toFixed(1)}</span>}
        </div>
      </div>

      {hovered && (
        <div className="absolute top-[-10px] left-[-10px] w-[calc(100%+20px)] min-w-[240px] bg-zinc-800 rounded-lg shadow-2xl z-[100] overflow-hidden" style={{ animation: 'scaleIn 0.2s ease-out' }}>
          <div className="relative w-full aspect-video overflow-hidden">
            {(item.backdrop || poster) && <img src={item.backdrop || poster} alt="" className="w-full h-full object-cover" />}
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-zinc-800 to-transparent" />
          </div>
          <div className="px-3 pb-3">
            <div className="flex gap-2 -mt-5 mb-2 relative z-10">
              <button onClick={handlePlay} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </button>
              <button onClick={handleInfo} className="w-8 h-8 rounded-full border-2 border-white/50 text-white flex items-center justify-center hover:border-white hover:scale-110 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            <h4 className="text-xs font-bold text-white mb-1 line-clamp-2 leading-tight">{item.title}</h4>
            <div className="flex items-center gap-2 mb-1 text-[10px] text-white/60">
              {item.rating > 0 && <span className="text-green-400 font-semibold">⭐ {item.rating.toFixed(1)}</span>}
              {item.year && <span>{item.year}</span>}
              {item.type === 'tv' && <span className="px-1 py-0.5 bg-indigo-500 rounded text-[9px] text-white font-semibold">Série</span>}
            </div>
            {item.overview && <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2">{item.overview}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
 
 
 
 
 
