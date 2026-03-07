'use client';
import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ContentCard from './ContentCard';

export default function ContentRow({ title, items = [], type = 'movie', showProgress = false, icon }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  if (!items?.length) return null;

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 20);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 20);
  };

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    setTimeout(checkScroll, 400);
  };

  // Mouse drag scroll
  const onMouseDown = (e) => {
    dragState.current = { isDown: true, startX: e.pageX - scrollRef.current.offsetLeft, scrollLeft: scrollRef.current.scrollLeft };
  };
  const onMouseMove = (e) => {
    if (!dragState.current.isDown) return;
    e.preventDefault();
    setIsDragging(true);
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.5;
    scrollRef.current.scrollLeft = dragState.current.scrollLeft - walk;
  };
  const onMouseUp = () => {
    dragState.current.isDown = false;
    setTimeout(() => setIsDragging(false), 50);
    checkScroll();
  };

  return (
    <div className="mb-8 animate-fade-in group/row">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3 px-1">
        {icon && <span className="text-lg">{icon}</span>}
        <h2 className="text-base sm:text-lg font-semibold text-white">{title}</h2>
        <span className="text-zinc-600 text-sm">({items.length})</span>
        <div className="flex-1" />
        {/* Desktop nav arrows */}
        <div className="hidden md:flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={() => scroll('left')}
            disabled={!showLeft}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all disabled:opacity-0"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!showRight}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-all disabled:opacity-0"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Scroll container */}
      <div className="relative -mx-4 px-4">
        {/* Left fade */}
        {showLeft && <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-sp-darker to-transparent z-10 pointer-events-none" />}
        {/* Right fade */}
        {showRight && <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-sp-darker to-transparent z-10 pointer-events-none" />}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          className={`flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {items.map((item, i) => (
            <div key={item.id || i} className="snap-start">
              <ContentCard item={item} type={type} showProgress={showProgress} index={i} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
