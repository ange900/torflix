import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('torflix_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('torflix_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════
// Auth API
// ═══════════════════════════════════════════════
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  register: (username, email, password) =>
    api.post('/auth/register', { username, email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updatePreferences: (prefs) => api.put('/auth/preferences', prefs),
};

// ═══════════════════════════════════════════════
// Movies API
// ═══════════════════════════════════════════════
export const moviesAPI = {
  trending: () => api.get('/movies/trending'),
  newReleases: () => api.get('/movies/new'),
  popular: () => api.get('/movies/popular'),
  detail: (id) => api.get(`/movies/${id}`),
  tvTrending: () => api.get('/movies/tv/trending'),
  tvDetail: (id) => api.get(`/movies/tv/${id}`),
  tvSeason: (id, season) => api.get(`/movies/tv/${id}/season/${season}`),
};

// ═══════════════════════════════════════════════
// Search API
// ═══════════════════════════════════════════════
export const searchAPI = {
  search: (params) => api.get('/search', { params }),
  suggestions: (q) => api.get('/search/suggestions', { params: { q } }),
  history: () => api.get('/search/history'),
};

// ═══════════════════════════════════════════════
// Torrents API
// ═══════════════════════════════════════════════
export const torrentsAPI = {
  search: (q, filters) => api.get('/torrents/search', { params: { q, ...filters } }),
  getMagnet: (url) => api.get('/torrents/magnet', { params: { url } }),
};

// ═══════════════════════════════════════════════
// Streaming API
// ═══════════════════════════════════════════════
export const streamAPI = {
  start: (magnet) => api.get('/stream/start', { params: { magnet } }),
  status: (infoHash) => api.get(`/stream/status/${infoHash}`),
  stop: (infoHash) => api.delete(`/stream/${infoHash}`),
  videoUrl: (infoHash) =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/stream/video/${infoHash}`,
};

// ═══════════════════════════════════════════════
// Watch Progress API (reprise de lecture)
// ═══════════════════════════════════════════════
export const progressAPI = {
  getAll: () => api.get('/progress'),
  getRecent: () => api.get('/progress/recent'),
  get: (tmdbId, params) => api.get(`/progress/${tmdbId}`, { params }),
  save: (tmdbId, data) => api.put(`/progress/${tmdbId}`, data),
  delete: (tmdbId) => api.delete(`/progress/${tmdbId}`),
};

// ═══════════════════════════════════════════════
// Torrent Accounts API
// ═══════════════════════════════════════════════
export const accountsAPI = {
  list: () => api.get('/accounts'),
  add: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
  test: (id) => api.post(`/accounts/${id}/test`),
};

export default api;
