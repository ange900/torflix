// Torrent Search API
export const torrentApi = {
  // Search torrents by query
  search: async (query, options = {}) => {
    const params = new URLSearchParams({ q: query, ...options });
    const res = await fetch(`/api/torrent/search?${params}`);
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  // Search torrents for a specific movie
  searchMovie: async (tmdbId, title, year) => {
    const params = new URLSearchParams({ title, year: year || '' });
    const res = await fetch(`/api/torrent/movie/${tmdbId}?${params}`);
    if (!res.ok) throw new Error('Movie torrent search failed');
    return res.json();
  },

  // Search torrents for a TV episode
  searchTV: async (tmdbId, title, season, episode) => {
    const params = new URLSearchParams({
      title,
      season: season || '',
      episode: episode || '',
    });
    const res = await fetch(`/api/torrent/tv/${tmdbId}?${params}`);
    if (!res.ok) throw new Error('TV torrent search failed');
    return res.json();
  },
};

// Streaming API
export const streamApi = {
  // Start a streaming session
  start: async (magnetUri, fileIndex = -1) => {
    const res = await fetch('/api/stream/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ magnet: magnetUri, downloadUrl: magnetUri, fileIndex }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to start stream');
    }
    return res.json();
  },

  // Get session status
  getStatus: async (sessionId) => {
    const res = await fetch(`/api/stream/${sessionId}/status`);
    if (!res.ok) return null;
    return res.json();
  },

  // Stop session
  stop: async (sessionId) => {
    await fetch(`/api/stream/${sessionId}`, { method: 'DELETE' });
  },

  // Get stream URL
  getStreamUrl: (sessionId) => `/api/stream/${sessionId}`,

  // Get subtitle URL
  getSubtitleUrl: (sessionId, index) => `/api/stream/${sessionId}/subtitle/${index}`,
};

// Playback API
export const playbackApi = {
  // Save position (called every 10s)
  savePosition: async (data) => {
    const res = await fetch('/api/playback/position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  },

  // Get position for content
  getPosition: async (mediaType, tmdbId, season = null, episode = null) => {
    const params = new URLSearchParams();
    if (season) params.set('season', season);
    if (episode) params.set('episode', episode);
    const res = await fetch(`/api/playback/position/${mediaType}/${tmdbId}?${params}`);
    if (!res.ok) return null;
    return res.json();
  },

  // Get continue watching list
  getContinueWatching: async (limit = 20) => {
    const res = await fetch(`/api/playback/continue?limit=${limit}`);
    if (!res.ok) return { items: [] };
    return res.json();
  },

  // Get recently watched
  getRecentlyWatched: async (limit = 20) => {
    const res = await fetch(`/api/playback/recent?limit=${limit}`);
    if (!res.ok) return { items: [] };
    return res.json();
  },

  // Get watch history
  getHistory: async (page = 1, limit = 50) => {
    const res = await fetch(`/api/playback/history?page=${page}&limit=${limit}`);
    if (!res.ok) return { items: [], total: 0 };
    return res.json();
  },

  // Mark as completed
  markComplete: async (tmdbId, mediaType, seasonNumber, episodeNumber) => {
    return fetch('/api/playback/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, mediaType, seasonNumber, episodeNumber }),
    });
  },

  // Favorites
  addFavorite: async (data) => {
    return fetch('/api/playback/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  removeFavorite: async (mediaType, tmdbId) => {
    return fetch(`/api/playback/favorites/${mediaType}/${tmdbId}`, { method: 'DELETE' });
  },

  getFavorites: async () => {
    const res = await fetch('/api/playback/favorites');
    if (!res.ok) return { items: [] };
    return res.json();
  },

  checkFavorite: async (mediaType, tmdbId) => {
    const res = await fetch(`/api/playback/favorites/check/${mediaType}/${tmdbId}`);
    if (!res.ok) return { isFavorite: false };
    return res.json();
  },

  getNextEpisode: async (tmdbId) => {
    const res = await fetch(`/api/playback/next-episode/${tmdbId}`);
    if (!res.ok) return null;
    return res.json();
  },
};
