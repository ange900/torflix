'use client';
import { useState, useRef, useEffect } from 'react';
import ContentCard from './ContentCard';
import ContinueCard from './ContinueCard';

export default function ContentRow({ section, onCardClick }) {
  const rowRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [hovered, setHovered] = useState(false);

  const check = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 10);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    check();
    const el = rowRef.current;
    if (el) { el.addEventListener('scroll', check, { passive: true }); return () => el.removeEventListener('scroll', check); }
  }, [section.items]);

  const scroll = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    const amt = (section.type === 'large' ? 320 : 200) * 4;
    el.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' });
  };

  if (!section.items?.length) return null;

  return (
    <section className="relative mb-8" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="flex items-center justify-between px-[4%] mb-3">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          {section.icon && <span className="text-lg">{section.icon}</span>}{section.title}
        </h2>
        <span className="text-xs text-white/40">{section.items.length} titres</span>
      </div>
      <div className="relative overflow-hidden">
        {canLeft && (
          <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-full max-h-[280px] flex items-center justify-center bg-gradient-to-r from-[#0a0a0ae6] to-transparent text-white rounded-r" style={{ animation: 'fadeIn 0.2s forwards' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        <div ref={rowRef} className="flex gap-2.5 overflow-x-hidden scroll-smooth px-[4%] py-2 pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {section.items.map((item, i) => {
            if (section.type === 'continue') return <ContinueCard key={`${item.tmdb_id}-${i}`} item={item} onClick={() => onCardClick?.(item)} />;
            if (section.type === 'numbered') return (
              <div key={`${item.tmdb_id}-${i}`} className="flex items-center relative flex-shrink-0">
                <span className="text-7xl font-black text-transparent leading-none -mr-5 select-none" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.3)' }}>{i + 1}</span>
                <ContentCard item={item} size="standard" onClick={() => onCardClick?.(item)} />
              </div>
            );
            return <ContentCard key={`${item.tmdb_id}-${i}`} item={item} size={section.type === 'large' ? 'large' : 'standard'} onClick={() => onCardClick?.(item)} />;
          })}
        </div>
        {canRight && (
          <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-full max-h-[280px] flex items-center justify-center bg-gradient-to-l from-[#0a0a0ae6] to-transparent text-white rounded-l" style={{ animation: 'fadeIn 0.2s forwards' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </div>
    </section>
  );
}
 
 
