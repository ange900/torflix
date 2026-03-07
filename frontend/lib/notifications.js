export const notifApi = {
  getAll: async (limit = 20) => {
    const r = await fetch(`/api/notifications?limit=${limit}`, { credentials: 'include' });
    return r.ok ? r.json() : { notifications: [], unread_count: 0 };
  },
  getUnread: async () => {
    const r = await fetch('/api/notifications?unread_only=true&limit=10', { credentials: 'include' });
    return r.ok ? r.json() : { notifications: [], unread_count: 0 };
  },
  markRead: (id) => fetch(`/api/notifications/${id}/read`, { method: 'PUT', credentials: 'include' }),
  markAllRead: () => fetch('/api/notifications/read-all', { method: 'PUT', credentials: 'include' }),
  remove: (id) => fetch(`/api/notifications/${id}`, { method: 'DELETE', credentials: 'include' }),
  clearAll: () => fetch('/api/notifications', { method: 'DELETE', credentials: 'include' }),
  generateRecommendations: () => fetch('/api/notifications/generate-recommendations', { method: 'POST', credentials: 'include' }).then(r => r.json()),
  checkNewEpisodes: () => fetch('/api/notifications/check-new-episodes', { method: 'POST', credentials: 'include' }).then(r => r.json()),
};
