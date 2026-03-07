'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function HeroBanner({ items = [] }) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  const router = useRouter();
  const timerRef = useRef(null);

  const current = items[idx];

  // Auto-rotation avec ref pour éviter les problèmes de closure
  useEffect(() => {
    if (paused || items.length <= 1) return;
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx(p => (p + 1) % items.length);
        setFading(false);
      }, 500);
    }, 8000);
    return () => clearInterval(timerRef.current);
  }, [paused, items.length]);

  const goTo = (i) => {
    if (i === idx) return;
    setFading(true);
    clearInterval(timerRef.current);
    setTimeout(() => { setIdx(i); setFading(false); }, 500);
  };

  if (!current) return null;

  return (
    <section className="relative w-full h-[52vh] min-h-[350px] max-h-[550px] overflow-hidden rounded-b-xl"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundImage: `url(${current.backdrop_full || current.backdrop})`, backgroundPosition: "center 20%" }} />
      <div className="absolute bottom-0 left-0 right-0 h-[70%] bg-gradient-to-t from-sp-darker via-sp-darker/80 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-sp-darker/80 via-sp-darker/40 to-transparent pointer-events-none" />

      <div className={`absolute bottom-6 left-[3%] max-w-[480px] z-10 transition-all duration-500 ${fading ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {current.type === 'tv' && <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded uppercase">Série</span>}
          {current.type === 'movie' && <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded uppercase">Film</span>}
          {current.rating >= 7.5 && <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-bold rounded uppercase">TOP {Math.round(current.rating * 10)}%</span>}
          {current.year && <span className="px-2 py-0.5 bg-white/15 text-white/90 text-[10px] font-bold rounded">{current.year}</span>}
        </div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-white mb-1 leading-tight drop-shadow-lg">{current.title}</h1>
        <p className="text-[11px] text-white/70 leading-relaxed mb-2 line-clamp-2">{current.overview?.substring(0, 120)}...</p>
        <div className="flex items-center gap-2 mb-2">
          <span className="flex items-center gap-1 text-amber-400 font-bold text-xs">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            {current.rating?.toFixed(1)}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push(`/player/${current.type}/${current.tmdb_id}`)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black font-bold rounded-lg hover:bg-white/85 transition-all text-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>Lecture
          </button>
          <button onClick={() => router.push(`/details/${current.type}/${current.tmdb_id}`)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white/15 text-white font-bold rounded-lg hover:bg-white/25 transition-all text-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Plus d'infos
          </button>
        </div>
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-2 right-[3%] flex gap-1.5 z-20">
          {items.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'}`} />
          ))}
        </div>
      )}

      {items.length > 1 && !paused && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 z-30 overflow-hidden">
          <div key={idx} className="h-full bg-gradient-to-r from-rose-600 to-amber-500" style={{ animation: 'progress 8s linear forwards' }} />
        </div>
      )}
    </section>
  );
}
 
 
 
 
 
 
 
 
 
