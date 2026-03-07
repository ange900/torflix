import { useState, useEffect } from 'react';
import { getStoredAuth } from '../services/auth';

export default function TVPair() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('code');
    if (c) setCode(c);
  }, []);

  const handlePair = async () => {
    const stored = getStoredAuth();
    if (!stored || !stored.tokens) { setStatus('Connectez-vous d\'abord'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/tv/pair-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, token: stored.tokens, user: stored.user })
      });
      const d = await r.json();
      if (d.ok) setStatus('TV connectée ! Vous pouvez fermer cette page.');
      else setStatus(d.error || 'Erreur');
    } catch(e) { setStatus('Erreur réseau'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <img src="/icons/icon-192x192.png" alt="TorFlix" className="w-20 h-20 mb-6" />
      <h1 className="text-2xl font-bold text-white mb-2">Connecter votre TV</h1>
      <p className="text-zinc-400 text-sm mb-8 text-center">Entrez le code affiché sur votre télévision</p>
      <input
        value={code} onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
        placeholder="000000" maxLength={6} inputMode="numeric"
        className="w-64 text-center text-3xl font-mono tracking-widest px-4 py-4 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-red-600"
      />
      <button onClick={handlePair} disabled={loading || code.length !== 6}
        className="mt-6 px-8 py-3 bg-red-600 text-white font-bold rounded-xl disabled:opacity-50">
        {loading ? 'Connexion...' : 'Connecter la TV'}
      </button>
      {status && <p className="mt-4 text-sm" style={{color: status.indexOf('connectée') !== -1 ? '#4f4' : '#f44'}}>{status}</p>}
    </div>
  );
}
