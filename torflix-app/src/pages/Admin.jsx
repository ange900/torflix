import { useState, useEffect } from 'react';
import { Shield, Users, HardDrive, Activity, Trash2, UserX, UserCheck, ChevronDown, Crown, Ban, RefreshCw, AlertTriangle } from 'lucide-react';
import { getStoredAuth } from '../services/auth';

const API = 'https://torfix.xyz';

function getToken() {
  const auth = getStoredAuth();
  return auth?.tokens?.refreshToken || '';
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionUser, setActionUser] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [msg, setMsg] = useState('');

  const headers = { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API}/api/admin/users`, { headers }).then(r => r.ok ? r.json() : { users: [] }),
        fetch(`${API}/api/admin/stats`, { headers }).then(r => r.ok ? r.json() : null),
      ]);
      setUsers(usersRes.users || usersRes || []);
      setStats(statsRes);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const changeRole = async (userId, role) => {
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}/role`, {
        method: 'PUT', headers, body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setMsg('✅ Rôle modifié');
      fetchData();
    } catch (e) { setMsg('❌ ' + e.message); }
    setActionUser(null);
    setTimeout(() => setMsg(''), 3000);
  };

  const toggleUser = async (userId) => {
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}/toggle`, {
        method: 'PUT', headers,
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setMsg('✅ Statut modifié');
      fetchData();
    } catch (e) { setMsg('❌ ' + e.message); }
    setTimeout(() => setMsg(''), 3000);
  };

  const deleteUser = async (userId) => {
    try {
      const res = await fetch(`${API}/api/admin/users/${userId}`, {
        method: 'DELETE', headers,
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setMsg('✅ Utilisateur supprimé');
      setConfirm(null);
      fetchData();
    } catch (e) { setMsg('❌ ' + e.message); }
    setTimeout(() => setMsg(''), 3000);
  };

  const auth = getStoredAuth();
  const myId = auth?.user?.id;

  return (
    <div className="pt-4 px-4 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" /> Administration</h1>
        <button onClick={fetchData} disabled={loading}
          className="text-sm text-zinc-400 hover:text-white flex items-center gap-1">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm text-center ${msg.startsWith('✅') ? 'bg-green-600/15 text-green-400' : 'bg-red-600/15 text-red-400'}`}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} color="blue" value={users.length} label="Utilisateurs" />
        <StatCard icon={Activity} color="green" value={stats?.streams?.active || 0} label="Streams actifs" />
        <StatCard icon={HardDrive} color="purple" value="6" label="Trackers" />
        <StatCard icon={Shield} color="red" value={users.filter(u => u.role === 'admin').length} label="Admins" />
      </div>

      {/* Users */}
      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-400">Utilisateurs ({users.length})</span>
          <div className="flex gap-4 text-xs text-zinc-600">
            <span>🟢 Actif</span>
            <span>🔴 Bloqué</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-red border-t-transparent rounded-full animate-spin" /></div>
        ) : users.length === 0 ? (
          <p className="text-zinc-500 text-center py-10">Aucun utilisateur trouvé</p>
        ) : (
          <div>
            {users.map(u => (
              <div key={u.id} className="border-b border-white/5 last:border-0">
                <div className="flex items-center justify-between px-4 py-3">
                  {/* User info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${u.is_active !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{u.username}</p>
                        {u.role === 'admin' && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                      </div>
                      <p className="text-zinc-500 text-xs truncate">{u.email}</p>
                    </div>
                  </div>

                  {/* Role badge */}
                  <span className={`text-xs px-2 py-1 rounded-full mr-3 flex-shrink-0 ${u.role === 'admin' ? 'bg-red-600/20 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    {u.role || 'user'}
                  </span>

                  {/* Actions */}
                  {u.id !== myId ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setActionUser(actionUser === u.id ? null : u.id)}
                        className="p-2 rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white transition-all">
                        <ChevronDown className={`w-4 h-4 transition-transform ${actionUser === u.id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 italic">Vous</span>
                  )}
                </div>

                {/* Action panel */}
                {actionUser === u.id && u.id !== myId && (
                  <div className="px-4 pb-3 flex flex-wrap gap-2">
                    {/* Toggle active */}
                    <button onClick={() => toggleUser(u.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${u.is_active !== false ? 'bg-orange-600/15 text-orange-400 hover:bg-orange-600/25' : 'bg-green-600/15 text-green-400 hover:bg-green-600/25'}`}>
                      {u.is_active !== false ? <><Ban className="w-3.5 h-3.5" /> Bloquer</> : <><UserCheck className="w-3.5 h-3.5" /> Débloquer</>}
                    </button>

                    {/* Change role */}
                    <button onClick={() => changeRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-blue-600/15 text-blue-400 hover:bg-blue-600/25 transition-all">
                      <Crown className="w-3.5 h-3.5" />
                      {u.role === 'admin' ? 'Retirer admin' : 'Rendre admin'}
                    </button>

                    {/* Delete */}
                    <button onClick={() => setConfirm(u)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-600/15 text-red-400 hover:bg-red-600/25 transition-all">
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm delete modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4" onClick={() => setConfirm(null)}>
          <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-sm w-full border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-white font-bold">Supprimer l'utilisateur</h3>
                <p className="text-zinc-500 text-xs">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-zinc-300 text-sm mb-1">
              Voulez-vous vraiment supprimer <strong className="text-white">{confirm.username}</strong> ?
            </p>
            <p className="text-zinc-500 text-xs mb-5">{confirm.email}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors">
                Annuler
              </button>
              <button onClick={() => deleteUser(confirm.id)}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, value, label }) {
  const colors = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
    red: 'text-red-500',
  };
  return (
    <div className="bg-surface rounded-xl p-4 border border-white/5 text-center">
      <Icon className={`w-7 h-7 ${colors[color]} mx-auto mb-2`} />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-zinc-500 text-xs">{label}</p>
    </div>
  );
}
