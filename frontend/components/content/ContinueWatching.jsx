'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ContinueWatching() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/playback/continue', { credentials: 'include' });
        if (res.ok) { const d = await res.json(); setItems(d.results || []); }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading || !items.length) return null;
  const hero = items[0], rest = items.slice(1);

  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold text-white mb-4">▶ Reprendre la lecture</h2>
      <Link href={`/player/${hero.content_type}/${hero.tmdb_id}${hero.season_number?`?season=${hero.season_number}&episode=${hero.episode_number}`:''}`} className="block relative rounded-2xl overflow-hidden mb-4 group">
        <div className="relative aspect-[21/9] w-full">
          {hero.backdrop_path ? <Image src={`https://image.tmdb.org/t/p/w1280${hero.backdrop_path}`} alt="" fill className="object-cover" priority /> : <div className="w-full h-full bg-gradient-to-r from-zinc-900 to-zinc-800" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 md:p-8">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{hero.title}</h3>
            {hero.season_number && <p className="text-zinc-400 text-sm mb-2">S{hero.season_number} · E{hero.episode_number}</p>}
            <p className="text-zinc-400 mb-4">Reprendre à {hero.formattedPosition} · {hero.remainingMinutes} min restantes</p>
            <div className="w-64 md:w-96 h-1 bg-zinc-700 rounded-full mb-4"><div className="h-full bg-red-500 rounded-full" style={{width:`${Math.min(hero.progress,100)}%`}} /></div>
            <div className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-semibold transition group-hover:scale-105">▶ Reprendre à {hero.formattedPosition}</div>
          </div>
        </div>
      </Link>
      {rest.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {rest.map((item, i) => (
            <Link key={i} href={`/player/${item.content_type}/${item.tmdb_id}${item.season_number?`?season=${item.season_number}&episode=${item.episode_number}`:''}`} className="flex-shrink-0 w-64 group">
              <div className="relative aspect-video rounded-xl overflow-hidden mb-2">
                {item.backdrop_path ? <Image src={`https://image.tmdb.org/t/p/w500${item.backdrop_path}`} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><span className="text-4xl">🎬</span></div>}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700"><div className="h-full bg-red-500" style={{width:`${Math.min(item.progress,100)}%`}} /></div>
              </div>
              <p className="text-white text-sm font-medium truncate">{item.title}</p>
              <p className="text-zinc-500 text-xs">{item.remainingMinutes} min restantes</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
