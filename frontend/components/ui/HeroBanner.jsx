'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Info, ChevronLeft, ChevronRight, Star, Volume2, VolumeX } from 'lucide-react';

export default function HeroBanner({ items = [] }) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const progressRef = useRef(null);
  const heroes = items.slice(0, 6);

  const goTo = useCallback((index) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setImageLoaded(false);
    setProgressWidth(0);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning]);

  const next = useCallback(() => goTo((current + 1) % heroes.length), [current, heroes.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + heroes.length) % heroes.length), [current, heroes.length, goTo]);

  // Auto-advance with progress bar
  useEffect(() => {
    if (heroes.length <= 1) return;
    const duration = 8000;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgressWidth(Math.min(100, (elapsed / duration) * 100));
    }, 50);
    const timer = setTimeout(next, duration);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [current, next, heroes.length]);

  if (!heroes.length) return (
    <div className="relative w-full h-[50vh] sm:h-[60vh] lg:h-[70vh] skeleton" />
  );

  const hero = heroes[current];
  const backdrop = hero.backdrop_path ? `https://image.tmdb.org/t/p/original${hero.backdrop_path}` : null;
  const title = hero.title || hero.name;
  const year = (hero.release_date || hero.first_air_date || '').slice(0, 4);
  const rating = hero.vote_average?.toFixed(1);
  const overview = hero.overview || '';
  const mediaType = hero.media_type || 'movie';

  return (
    <div className="relative w-full h-[35vh] sm:h-[40vh] lg:h-[50vh] overflow-hidden select-none">
      {/* Background image with crossfade */}
      <div className="absolute inset-0">
        {backdrop && (
          <img
            key={current}
            src={backdrop}
            alt=""
            onLoad={() => setImageLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-1000 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          />
        )}
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-sp-darker via-sp-darker/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-sp-darker/70 via-sp-darker/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-sp-darker to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex items-end pb-10 sm:pb-12 lg:pb-14">
        <div className="w-full px-4 md:px-8 lg:px-10">
          <div key={current} className="max-w-lg">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3 animate-fade-in-down">
              <span className="px-2 py-0.5 bg-sp-red rounded text-[11px] font-bold text-white tracking-wide">
                {mediaType === 'tv' ? 'SÉRIE' : 'FILM'}
              </span>
              {rating > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded text-[11px] text-yellow-400 font-bold">
                  <Star className="w-3 h-3 fill-yellow-400" /> {rating}
                </span>
              )}
              {year && <span className="text-zinc-400 text-xs font-medium">{year}</span>}
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-[1.1] mb-3 animate-fade-in-up drop-shadow-lg">
              {title}
            </h1>

            {/* Overview */}
            <p className="text-zinc-300 text-sm leading-relaxed line-clamp-2 mb-5 animate-fade-in max-w-xl" style={{ animationDelay: '0.15s' }}>
              {overview}
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <button
                onClick={() => router.push(`/player/${mediaType}/${hero.id}`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-sp-red hover:bg-red-500 text-white font-bold text-sm rounded-xl transition-all duration-200 hover:scale-105 btn-press glow-red shadow-lg"
              >
                <Play className="w-5 h-5 fill-white" /> Regarder
              </button>
              <button
                onClick={() => router.push(`/watch/${mediaType}/${hero.id}`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold text-sm rounded-xl transition-all duration-200 btn-press"
              >
                <Info className="w-5 h-5" /> Plus d'infos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {heroes.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-all duration-300 group"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-all duration-300 group"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </>
      )}

      {/* Bottom indicators + progress */}
      {heroes.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {heroes.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="relative h-1 rounded-full overflow-hidden transition-all duration-300"
              style={{ width: i === current ? '32px' : '12px' }}
            >
              <div className="absolute inset-0 bg-white/30 rounded-full" />
              {i === current && (
                <div
                  className="absolute inset-0 bg-sp-red rounded-full transition-none"
                  style={{ width: `${progressWidth}%` }}
                />
              )}
              {i !== current && i < current && (
                <div className="absolute inset-0 bg-white/60 rounded-full" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
