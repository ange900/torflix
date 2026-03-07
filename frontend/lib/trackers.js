export const trackerApi = {
  // Comptes privés
  getSupported:    ()           => fetch('/api/tracker/supported', { credentials: 'include' }).then(r => r.json()),
  getAccounts:     ()           => fetch('/api/tracker/accounts', { credentials: 'include' }).then(r => r.json()),
  addAccount:      (t, u, p)   => fetch('/api/tracker/accounts', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackerType: t, username: u, password: p }) }).then(r => r.json()),
  removeAccount:   (id)        => fetch(`/api/tracker/accounts/${id}`, { method: 'DELETE', credentials: 'include' }).then(r => r.json()),
  testLogin:       (type)      => fetch(`/api/tracker/accounts/${type}/login`, { method: 'POST', credentials: 'include' }).then(r => r.json()),
  search:          (q, cat)    => fetch(`/api/tracker/search?q=${encodeURIComponent(q)}&category=${cat || 'all'}`, { credentials: 'include' }).then(r => r.json()),
  // Jackett indexers
  getJackettIndexers:  ()      => fetch('/api/tracker/jackett', { credentials: 'include' }).then(r => r.json()),
  getAvailableIndexers: ()     => fetch('/api/tracker/jackett/available', { credentials: 'include' }).then(r => r.json()),
  addJackettIndexer:   (id)    => fetch(`/api/tracker/jackett/${id}`, { method: 'POST', credentials: 'include' }).then(r => r.json()),
  removeJackettIndexer:(id)    => fetch(`/api/tracker/jackett/${id}`, { method: 'DELETE', credentials: 'include' }).then(r => r.json()),
};
