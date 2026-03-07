'use client';
import { useState, useEffect } from 'react';

export default function RatingWidget({ tmdbId, mediaType, compact = false }) {
  const [data, setData] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { fetchRatings(); }, [tmdbId, mediaType]);

  const fetchRatings = async () => {
    try {
      const res = await fetch(`/api/ratings/${tmdbId}/${mediaType}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
        const token = localStorage.getItem('token');
        if (token) {
          const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          if (meRes.ok) {
            const me = await meRes.json();
            const myRating = d.ratings.find(r => r.user_id === me.id);
            if (myRating) { setUserRating(myRating.rating); setReview(myRating.review || ''); }
          }
        }
      }
    } catch (e) {}
  };

  const submitRating = async (stars) => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Connectez-vous pour noter');
    setLoading(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tmdbId, mediaType, rating: stars, review })
      });
      if (res.ok) { setUserRating(stars); setSubmitted(true); await fetchRatings(); setTimeout(() => setSubmitted(false), 2000); }
    } catch (e) {} finally { setLoading(false); }
  };

  const labels = ['', 'Nul \ud83d\ude24', 'Bof \ud83d\ude10', 'Bien \ud83d\ude42', 'Super \ud83d\ude04', "Chef-d'\u0153uvre \ud83e\udd29"];

  if (compact) return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} onClick={() => submitRating(s)}
          className={`text-lg transition-transform hover:scale-125 ${s <= (hover || userRating) ? 'text-amber-400' : 'text-white/20'}`}
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}>\u2605</button>
      ))}
      {data && <span className="text-xs text-white/50 ml-1">({data.total})</span>}
    </div>
  );

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Votre avis</h3>
        {data && data.total > 0 && (
          <div className="flex items-center gap-1 text-amber-400">
            <span className="text-sm font-bold">\u2605 {data.average.toFixed(1)}</span>
            <span className="text-xs text-white/40">({data.total} avis)</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        {[1,2,3,4,5].map(s => (
          <button key={s} onClick={() => { setUserRating(s); setShowReview(true); }}
            onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
            className={`text-3xl transition-all hover:scale-110 ${s <= (hover || userRating) ? 'text-amber-400' : 'text-white/20'}`}>\u2605</button>
        ))}
        {(hover || userRating) > 0 && <span className="text-sm text-amber-400 font-medium ml-2">{labels[hover || userRating]}</span>}
      </div>
      {showReview && (
        <div className="mt-3 space-y-2">
          <textarea value={review} onChange={e => setReview(e.target.value)}
            placeholder="Laissez un commentaire (optionnel)..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-amber-500/50"
            rows={2} />
          <button onClick={() => submitRating(userRating)} disabled={loading || !userRating}
            className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm rounded-lg transition-colors">
            {submitted ? '\u2713 Not\u00e9 !' : loading ? 'Envoi...' : 'Valider mon avis'}
          </button>
        </div>
      )}
      {data?.ratings?.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
          <p className="text-xs text-white/40 font-semibold">DERNIERS AVIS</p>
          {data.ratings.slice(0, 3).map(r => (
            <div key={r.id} className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                {r.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-white/70">{r.username}</span>
                  <span className="text-[10px] text-amber-400">{'\u2605'.repeat(r.rating)}</span>
                </div>
                {r.review && <p className="text-[10px] text-white/50 line-clamp-1">{r.review}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
