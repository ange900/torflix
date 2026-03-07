import { useState, useEffect } from 'react';
import { User, Clock, Heart, Film, Tv, Trophy, TrendingUp, Loader2, BarChart3 } from 'lucide-react';
import { getStoredAuth } from '../services/auth';

const API = 'https://torfix.xyz';

export default function Profile() {
  const auth = getStoredAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = auth?.tokens?.refreshToken;
    if (!token) { setLoading(false); return; }
    fetch(`${API}/api/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const user = auth?.user;
  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="pt-4 px-4 pb-24 max-w-2xl mx-auto">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-red-600/20">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{user?.username}</h1>
          <p className="text-sm text-zinc-500">{user?.email}</p>
          <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full ${user?.role === 'admin' ? 'bg-red-600/20 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
            {user?.role || 'user'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-red-500 animate-spin" /></div>
      ) : !stats ? (
        <p className="text-zinc-500 text-center py-10">Aucune statistique disponible</p>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard icon={Clock} color="blue" value={`${stats.totalHoursWatched}h`} label="Temps de visionnage" />
            <StatCard icon={Film} color="green" value={stats.totalItems} label="Contenus regardés" />
            <StatCard icon={Trophy} color="amber" value={stats.completed} label="Terminés" />
            <StatCard icon={Heart} color="red" value={stats.favorites} label="Favoris" />
          </div>

          {/* Type breakdown */}
          {stats.typeBreakdown && (
            <div className="bg-surface rounded-2xl p-4 border border-white/5 mb-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-zinc-500" /> Répartition</h3>
              <div className="flex gap-4">
                {Object.entries(stats.typeBreakdown).map(([type, count]) => {
                  const total = Object.values(stats.typeBreakdown).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={type} className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {type === 'movie' ? <Film className="w-4 h-4 text-blue-400" /> : <Tv className="w-4 h-4 text-purple-400" />}
                        <span className="text-xs text-zinc-400">{type === 'movie' ? 'Films' : 'Séries'}</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-1">
                        <div className={`h-full rounded-full transition-all ${type === 'movie' ? 'bg-blue-500' : 'bg-purple-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-zinc-500">{count} ({pct}%)</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly activity */}
          {stats.monthly?.length > 0 && (
            <div className="bg-surface rounded-2xl p-4 border border-white/5">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-zinc-500" /> Activité mensuelle</h3>
              <div className="flex items-end gap-2 h-[100px]">
                {stats.monthly.slice(0, 6).reverse().map((m, i) => {
                  const maxH = Math.max(...stats.monthly.map(x => x.hours), 1);
                  const h = Math.max((m.hours / maxH) * 80, 4);
                  const monthName = new Date(m.month).toLocaleDateString('fr-FR', { month: 'short' });
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-zinc-500">{m.hours}h</span>
                      <div className="w-full bg-red-600/80 rounded-t-md transition-all" style={{ height: `${h}px` }} />
                      <span className="text-[9px] text-zinc-600">{monthName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, value, label }) {
  const colors = { blue: 'text-blue-500', green: 'text-green-500', amber: 'text-amber-500', red: 'text-red-500' };
  return (
    <div className="bg-surface rounded-xl p-4 border border-white/5 text-center">
      <Icon className={`w-7 h-7 ${colors[color]} mx-auto mb-2`} />
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-zinc-500 text-[10px]">{label}</p>
    </div>
  );
}
