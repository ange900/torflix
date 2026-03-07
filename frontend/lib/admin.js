export const adminApi = {
  getStats: () => fetch('/api/admin/stats', { credentials: 'include' }).then(r => { if (!r.ok) throw r; return r.json(); }),
  getUsers: (page = 1, search = '') => fetch(`/api/admin/users?page=${page}&limit=20&search=${search}`, { credentials: 'include' }).then(r => r.json()),
  updateRole: (id, role) => fetch(`/api/admin/users/${id}/role`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) }).then(r => r.json()),
  toggleUser: (id) => fetch(`/api/admin/users/${id}/toggle`, { method: 'PUT', credentials: 'include' }).then(r => r.json()),
  deleteUser: (id) => fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' }).then(r => r.json()),
  getStreams: () => fetch('/api/admin/streams', { credentials: 'include' }).then(r => r.json()),
  killStream: (id) => fetch(`/api/admin/streams/${id}`, { method: 'DELETE', credentials: 'include' }).then(r => r.json()),
  getSystem: () => fetch('/api/admin/system', { credentials: 'include' }).then(r => r.json()),
};
