const API = 'https://torfix.xyz';

export async function register(username, email, password) {
  const res = await fetch(API + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Erreur inscription');
  return data;
}

export async function login(email, password) {
  const res = await fetch(API + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Erreur connexion');
  return data;
}

export async function getMe(token) {
  const res = await fetch(API + '/api/auth/me', {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('Non autorise');
  return res.json();
}

export function getStoredAuth() {
  try {
    const d = localStorage.getItem('torflix_auth');
    return d ? JSON.parse(d) : null;
  } catch { return null; }
}

export function storeAuth(user, tokens) {
  localStorage.setItem('torflix_auth', JSON.stringify({ user, tokens, ts: Date.now() }));
}

export function clearAuth() {
  localStorage.removeItem('torflix_auth');
}
