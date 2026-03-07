import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://torfix.xyz/api';

async function getToken(): Promise<string> {
  return await AsyncStorage.getItem('jwt') || '';
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  // Auth
  getProfile: () => request('/auth/me'),

  // Films/Séries
  getTrending: (type: 'movies' | 'tv') => request(`/${type}/trending`),
  getDetail: (type: 'movies' | 'tv', id: string) => request(`/${type}/${id}`),
  getCredits: (type: 'movies' | 'tv', id: string) => request(`/${type}/${id}/credits`),
  search: (query: string) => request(`/search?q=${encodeURIComponent(query)}`),
  getByGenre: (type: 'movies' | 'tv', genreId: string) => {
    const endpoint = genreId === '16manga'
      ? `/${type}/discover?with_genres=16&with_keywords=210024&page=1`
      : `/${type}/discover?with_genres=${genreId}&page=1`;
    return request(endpoint);
  },

  // Séries
  getSeasonDetail: (id: string, season: number) => request(`/tv/${id}/season/${season}`),

  // Torrents
  searchTorrents: (query: string, category: string) =>
    request(`/torrents/search?q=${encodeURIComponent(query)}&category=${category}`),

  // Stream
  startStream: (magnet: string, downloadUrl: string) =>
    request('/stream/start', {
      method: 'POST',
      body: JSON.stringify(magnet ? { magnet } : { downloadUrl }),
    }),
  getStreamStatus: (sessionId: string) => request(`/stream/${sessionId}/status`),
  stopStream: (sessionId: string) =>
    request(`/stream/${sessionId}`, { method: 'DELETE' }),
};

export const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';
export const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w780';
