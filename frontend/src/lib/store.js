import { create } from 'zustand';
import { authAPI } from './api';

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  // Initialize: check if user is logged in
  init: async () => {
    try {
      const token = localStorage.getItem('torflix_token');
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const { data } = await authAPI.me();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('torflix_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Login
  login: async (email, password) => {
    const { data } = await authAPI.login(email, password);
    localStorage.setItem('torflix_token', data.token);
    set({ user: data.user, isAuthenticated: true });
    return data;
  },

  // Register
  register: async (username, email, password) => {
    const { data } = await authAPI.register(username, email, password);
    localStorage.setItem('torflix_token', data.token);
    set({ user: data.user, isAuthenticated: true });
    return data;
  },

  // Logout
  logout: async () => {
    await authAPI.logout().catch(() => {});
    localStorage.removeItem('torflix_token');
    set({ user: null, isAuthenticated: false });
  },

  // Update preferences
  updatePreferences: async (prefs) => {
    await authAPI.updatePreferences(prefs);
    const user = get().user;
    set({ user: { ...user, ...prefs } });
  },
}));

export const usePlayerStore = create((set) => ({
  isPlaying: false,
  currentMovie: null,
  streamInfo: null,
  currentTime: 0,
  duration: 0,

  startPlaying: (movie, streamInfo) =>
    set({ isPlaying: true, currentMovie: movie, streamInfo }),

  stopPlaying: () =>
    set({ isPlaying: false, currentMovie: null, streamInfo: null, currentTime: 0 }),

  updateTime: (currentTime, duration) =>
    set({ currentTime, duration }),
}));
