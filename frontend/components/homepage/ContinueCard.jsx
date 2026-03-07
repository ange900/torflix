'use client';
import { useRouter } from 'next/navigation';

export default function ContinueCard({ item, onClick }) {
  const router = useRouter();
  const pct = Math.round((item.progress || 0) * 100);
  const remainMin = item.duration ? Math.round((item.duration * (1 - item.progress)) / 60) : null;

  const handlePlay = (e) => {
    e?.stopPropagation?.();
    const p = new URLSearchParams();
    if (item.season) p.set('s', item.season);
    if (item.episode) p.set('e', item.episode);
    router.push(`/player/${item.type}/${item.tmdb_id}?${p.toString()}`);
  };

  return (
    <div className="flex-shrink-0 w-[280px] rounded-md overflow-hidden bg-zinc-800 cursor-pointer hover:scale-[1.03] transition-transform" onClick={() => onClick ? onClick(item) : handlePlay()}>
      <div className="relative w-full aspect-video overflow-hidden bg-zinc-900">
        {(item.backdrop || item.poster) ? <img src={item.backdrop || item.poster} alt={item.title} loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-zinc-900 to-slate-900">🎬</div>}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
          <button onClick={handlePlay} className="w-12 h-12 rounded-full border-2 border-white bg-black/50 flex items-center justify-center hover:scale-110 transition-transform">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
        {item.season && item.episode && <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/75 rounded text-[11px] font-bold text-white backdrop-blur-sm">S{item.season}E{item.episode}</span>}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-rose-600 rounded-r-sm" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="px-3 py-2.5">
        <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
        <span className="text-xs text-white/50">{remainMin ? `${remainMin} min restantes` : `${pct}%`}</span>
      </div>
    </div>
  );
}
