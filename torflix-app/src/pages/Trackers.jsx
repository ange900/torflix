import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, Wifi } from 'lucide-react';

const API = 'https://torfix.xyz';

export default function Trackers() {
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrackers = () => {
    setLoading(true);
    fetch(`${API}/jackett-api/?q=test`)
      .then(r => r.json())
      .then(data => {
        const counts = {};
        (data.results || []).forEach(r => {
          counts[r.source] = (counts[r.source] || 0) + 1;
        });
        setTrackers(Object.entries(counts).map(([name, count]) => ({ name, count, status: 'ok' })));
      })
      .catch(() => setTrackers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTrackers(); }, []);

  return (
    <div className="pt-4 px-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wifi className="w-6 h-6" /> Trackers</h1>
        <button onClick={fetchTrackers} disabled={loading}
          className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center mt-20"><div className="w-8 h-8 border-2 border-red border-t-transparent rounded-full animate-spin" /></div>
      ) : trackers.length === 0 ? (
        <p className="text-zinc-500 text-center mt-20">Aucun tracker disponible</p>
      ) : (
        <div className="space-y-2">
          {trackers.map(t => (
            <div key={t.name} className="flex items-center justify-between bg-surface rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-white font-medium">{t.name}</span>
              </div>
              <span className="text-zinc-400 text-sm">{t.count} résultats</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
