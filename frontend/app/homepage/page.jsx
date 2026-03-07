'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HeroBanner from '@/components/homepage/HeroBanner';
import ContentRow from '@/components/homepage/ContentRow';

export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => { fetchHomepage(); }, []);

  const fetchHomepage = async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
      const res = await fetch('/api/homepage', {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) { console.error('Homepage:', err); setError(err.message); }
    finally { setLoading(false); }
  };

  const handleCardClick = (item) => router.push(`/details/${item.type || item.media_type}/${item.tmdb_id || item.id}`);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="h-[85vh] bg-zinc-900 animate-pulse" />
      {[1,2,3].map(i => (
        <div key={i} className="px-[4%] py-5">
          <div className="w-48 h-6 bg-zinc-800 rounded mb-4 animate-pulse" />
          <div className="flex gap-2.5 overflow-hidden">
            {[1,2,3,4,5,6].map(j => <div key={j} className="flex-shrink-0 w-[160px] aspect-[2/3] bg-zinc-800 rounded-md animate-pulse" />)}
          </div>
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
      <div className="text-center max-w-md px-8">
        <h2 className="text-2xl font-bold mb-2">Impossible de charger le contenu</h2>
        <p className="text-white/50 mb-6">{error}</p>
        <button onClick={fetchHomepage} className="px-8 py-3 bg-rose-600 text-white font-semibold rounded-md hover:bg-rose-700 transition-all">Réessayer</button>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {data.hero?.length > 0 && <HeroBanner items={data.hero} />}
      <div className="relative -mt-28 z-10 pb-16">
        {data.sections.map(section => <ContentRow key={section.id} section={section} onCardClick={handleCardClick} />)}
      </div>
    </main>
  );
}
