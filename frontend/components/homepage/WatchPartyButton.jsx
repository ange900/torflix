'use client';
import { useState } from 'react';

export default function WatchPartyButton({ tmdbId, mediaType, title, poster }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Connectez-vous pour cr\u00e9er une watch party');
    setLoading(true);
    try {
      const res = await fetch('/api/watch-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tmdbId, mediaType, title, poster, message })
      });
      if (res.ok) { const d = await res.json(); setCreated(d.party); }
    } catch (e) {} finally { setLoading(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/watch-party/${created.id}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 font-semibold rounded-lg transition-all text-sm">
        \ud83d\udc65 Viens regarder avec moi !
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            {!created ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/30 flex items-center justify-center text-xl">\ud83d\udc65</div>
                  <div>
                    <h3 className="text-white font-bold">Watch Party</h3>
                    <p className="text-xs text-white/50">Invitez vos amis \u00e0 regarder</p>
                  </div>
                </div>
                <div className="mb-3 p-3 bg-white/5 rounded-lg flex items-center gap-3">
                  {poster && <img src={poster} alt={title} className="w-10 h-14 object-cover rounded" />}
                  <span className="text-sm text-white font-medium line-clamp-2">{title}</span>
                </div>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Message pour vos amis (ex: On regarde ensemble ce soir \u00e0 21h !)"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 resize-none mb-4 focus:outline-none focus:border-purple-500/50"
                  rows={3} />
                <div className="flex gap-2">
                  <button onClick={() => setOpen(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-sm">Annuler</button>
                  <button onClick={create} disabled={loading}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-lg text-sm">
                    {loading ? 'Cr\u00e9ation...' : '\ud83c\udf89 Cr\u00e9er'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">\ud83c\udf89</div>
                  <h3 className="text-white font-bold text-lg">Watch Party cr\u00e9\u00e9e !</h3>
                  <p className="text-xs text-white/50 mt-1">Partagez le lien avec vos amis</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 mb-4 font-mono text-xs text-white/70 break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/watch-party/${created.id}` : '...'}
                </div>
                <div className="flex gap-2">
                  <button onClick={copyLink} className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-sm">
                    {copied ? '\u2713 Copi\u00e9 !' : '\ud83d\udccb Copier le lien'}
                  </button>
                  <button onClick={() => setOpen(false)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg text-sm">Fermer</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
