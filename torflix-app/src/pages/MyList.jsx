import { useState, useEffect } from 'react';
import { Heart, Trash2, Loader2 } from 'lucide-react';
import { getStoredAuth } from '../services/auth';
import ContentCard from '../components/ContentCard';

const API = 'https://torfix.xyz';

export default function MyList() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = () => {
    const auth = getStoredAuth();
    return { Authorization: `Bearer ${auth?.tokens?.refreshToken || ''}`, 'Content-Type': 'application/json' };
  };

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/favorites`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchFavorites(); }, []);

  const removeFav = async (tmdbId, mediaType) => {
    await fetch(`${API}/api/favorites/${tmdbId}/${mediaType}`, { method: 'DELETE', headers: headers() });
    setFavorites(prev => prev.filter(f => !(f.tmdb_id === tmdbId && f.media_type === mediaType)));
  };

  return (
    <div className="pt-4 px-4 pb-24">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Heart className="w-6 h-6 text-red-500 fill-red-500" /> Ma Liste
      </h1>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-red-500 animate-spin" /></div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Votre liste est vide</p>
          <p className="text-zinc-600 text-xs mt-1">Ajoutez des films et séries depuis leur page</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {favorites.map(f => (
            <div key={f.id} className="relative">
              <ContentCard item={{
                id: f.tmdb_id,
                media_type: f.media_type,
                title: f.title,
                name: f.title,
                poster_path: f.poster_path,
              }} />
              <button onClick={() => removeFav(f.tmdb_id, f.media_type)}
                className="absolute top-1 right-1 p-1.5 bg-black/70 rounded-full text-red-500 active:scale-90 z-10">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
