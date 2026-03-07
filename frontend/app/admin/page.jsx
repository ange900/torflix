'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, Activity, Database, Server, Cpu, HardDrive, Clock,
  Search, Trash2, UserX, UserCheck, Crown, Loader2, RefreshCw,
  AlertTriangle, Play, X, BarChart3, Zap, ArrowLeft, Eye
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { adminApi } from '@/lib/admin';
import AdminQRAuth from '@/components/admin/AdminQRAuth';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function timeAgo(date) {
  if (!date) return 'Jamais';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ==================== STAT CARD ====================
function StatCard({ icon: Icon, label, value, sub, color = 'text-sp-red', bgColor = 'bg-sp-red/10' }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-zinc-400 text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ==================== TAB BUTTON ====================
function Tab({ active, onClick, icon: Icon, label, count }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all btn-press ${active ? 'bg-sp-red text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
      <Icon className="w-4 h-4" /> {label}
      {count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-white/10'}`}>{count}</span>}
    </button>
  );
}

// ==================== MAIN ADMIN PAGE ====================
export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [streams, setStreams] = useState([]);
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, u, st, sys] = await Promise.allSettled([
        adminApi.getStats(),
        adminApi.getUsers(1, search),
        adminApi.getStreams(),
        adminApi.getSystem(),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (u.status === 'fulfilled') { setUsers(u.value.users || []); setUsersTotal(u.value.total || 0); }
      if (st.status === 'fulfilled') setStreams(st.value.streams || []);
      if (sys.status === 'fulfilled') setSystem(sys.value);
    } catch (err) { console.error('Admin load error:', err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'users') adminApi.getUsers(1, search).then(d => { setUsers(d.users || []); setUsersTotal(d.total || 0); }); }, [search]);

  const handleRoleChange = async (userId, newRole) => {
    await adminApi.updateRole(userId, newRole);
    load();
  };

  const handleToggle = async (userId) => {
    await adminApi.toggleUser(userId);
    load();
  };

  const handleDelete = async (userId) => {
    if (confirm !== userId) { setConfirm(userId); return; }
    await adminApi.deleteUser(userId);
    setConfirm(null);
    load();
  };

  const handleKillStream = async (sessionId) => {
    await adminApi.killStream(sessionId);
    load();
  };

  if (loading && !stats) return (
    <MainLayout>
      <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-sp-red animate-spin" /></div>
    </MainLayout>
  );

  // Check if forbidden (non-admin)
  if (!stats && !loading) return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Shield className="w-16 h-16 text-zinc-700 mb-4" />
        <p className="text-xl font-bold text-white mb-2">Accès refusé</p>
        <p className="text-zinc-500">Vous devez être administrateur</p>
        <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-sp-red text-white rounded-xl text-sm">Retour à l'accueil</button>
      </div>
    </MainLayout>
  );

  const memUsed = system ? ((1 - system.freeMemory / system.totalMemory) * 100).toFixed(0) : 0;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <Shield className="w-7 h-7 text-sp-red" />
            <h1 className="text-2xl font-bold text-white">Administration</h1>
          </div>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl text-zinc-400 text-sm hover:bg-white/10 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          <Tab active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={BarChart3} label="Dashboard" />
          <Tab active={tab === 'users'} onClick={() => setTab('users')} icon={Users} label="Utilisateurs" count={usersTotal} />
          <Tab active={tab === 'streams'} onClick={() => setTab('streams')} icon={Activity} label="Streams" count={streams.length} />
          <Tab active={tab === 'system'} onClick={() => setTab('system')} icon={Server} label="Système" />
          <Tab active={tab === 'tv'} onClick={() => setTab('tv')} icon={Shield} label="TV / QR" />
        </div>

        {/* ==================== DASHBOARD TAB ==================== */}
        {tab === 'dashboard' && stats && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Utilisateurs" value={stats.users?.total || 0} sub={`+${stats.users?.recent || 0} cette semaine`} />
              <StatCard icon={Activity} label="Streams actifs" value={stats.streams?.active || 0} color="text-green-400" bgColor="bg-green-500/10" />
              <StatCard icon={Play} label="Lectures" value={stats.content?.playbackEntries || 0} color="text-blue-400" bgColor="bg-blue-500/10" />
              <StatCard icon={Database} label="Base de données" value={stats.system?.dbSize || '?'} color="text-purple-400" bgColor="bg-purple-500/10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Uptime */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-500" /> Uptime serveur</h3>
                <p className="text-3xl font-bold text-white">{formatUptime(stats.system?.uptime || 0)}</p>
                <p className="text-zinc-500 text-xs mt-1">Node.js {stats.system?.nodeVersion}</p>
              </div>

              {/* Memory */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Cpu className="w-4 h-4 text-zinc-500" /> Mémoire processus</h3>
                <p className="text-3xl font-bold text-white">{formatBytes(stats.system?.memoryUsage?.heapUsed)}</p>
                <p className="text-zinc-500 text-xs mt-1">Heap total : {formatBytes(stats.system?.memoryUsage?.heapTotal)}</p>
              </div>
            </div>

            {/* Active streams */}
            {stats.streams?.sessions?.length > 0 && (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-green-400" /> Streams en cours</h3>
                <div className="space-y-2">
                  {stats.streams.sessions.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
                      <div>
                        <p className="text-white text-sm font-medium">{s.filename || s.sessionId}</p>
                        <p className="text-zinc-500 text-xs">{s.peers || 0} peers • {((s.progress || 0) * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== USERS TAB ==================== */}
        {tab === 'users' && (
          <div className="animate-fade-in">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un utilisateur..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-sp-red/50 transition-all" />
            </div>

            {/* Users table */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-3 text-zinc-500 text-xs font-medium">Utilisateur</th>
                      <th className="text-left px-4 py-3 text-zinc-500 text-xs font-medium hidden md:table-cell">Email</th>
                      <th className="text-left px-4 py-3 text-zinc-500 text-xs font-medium">Rôle</th>
                      <th className="text-left px-4 py-3 text-zinc-500 text-xs font-medium hidden sm:table-cell">Stats</th>
                      <th className="text-left px-4 py-3 text-zinc-500 text-xs font-medium hidden lg:table-cell">Inscrit</th>
                      <th className="text-right px-4 py-3 text-zinc-500 text-xs font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sp-red to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                              {user.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white text-sm font-medium">{user.username}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-sm hidden md:table-cell">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            user.role === 'admin' ? 'bg-yellow-500/10 text-yellow-400' :
                            user.role === 'disabled' ? 'bg-red-500/10 text-red-400' :
                            'bg-green-500/10 text-green-400'
                          }`}>
                            {user.role === 'admin' ? '👑 Admin' : user.role === 'disabled' ? '🚫 Désactivé' : '✓ User'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-zinc-500 text-xs">{user.stats?.watched || 0} vus • {user.stats?.completed || 0} terminés</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">{timeAgo(user.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {user.role !== 'admin' && (
                              <>
                                <button onClick={() => handleRoleChange(user.id, 'admin')} title="Promouvoir admin" className="p-1.5 rounded-lg text-zinc-600 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all">
                                  <Crown className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleToggle(user.id)} title={user.role === 'disabled' ? 'Activer' : 'Désactiver'} className="p-1.5 rounded-lg text-zinc-600 hover:text-orange-400 hover:bg-orange-500/10 transition-all">
                                  {user.role === 'disabled' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                </button>
                              </>
                            )}
                            {user.role !== 'admin' && (
                              <button onClick={() => handleDelete(user.id)} title="Supprimer" className={`p-1.5 rounded-lg transition-all ${confirm === user.id ? 'text-red-400 bg-red-500/10' : 'text-zinc-600 hover:text-red-400 hover:bg-red-500/10'}`}>
                                {confirm === user.id ? <AlertTriangle className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && <div className="p-8 text-center text-zinc-500">Aucun utilisateur trouvé</div>}
            </div>
          </div>
        )}

        {/* ==================== STREAMS TAB ==================== */}
        {tab === 'streams' && (
          <div className="animate-fade-in">
            {streams.length === 0 ? (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-12 text-center">
                <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500">Aucun stream actif</p>
              </div>
            ) : (
              <div className="space-y-3">
                {streams.map((s, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{s.filename || s.sessionId}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span>{s.peers || 0} peers</span>
                        <span>{((s.progress || 0) * 100).toFixed(1)}%</span>
                        <span>{formatBytes(s.downloadSpeed || 0)}/s</span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(s.progress || 0) * 100}%` }} />
                      </div>
                    </div>
                    <button onClick={() => handleKillStream(s.sessionId)} className="p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TV QR TAB ==================== */}
        {tab === 'tv' && (
          <div className="animate-fade-in">
            <AdminQRAuth />
          </div>
        )}

        {/* ==================== SYSTEM TAB ==================== */}
        {tab === 'system' && system && (
          <div className="animate-fade-in space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Server info */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Server className="w-4 h-4 text-zinc-500" /> Serveur</h3>
                <div className="space-y-3">
                  {[
                    ['Hostname', system.hostname],
                    ['Plateforme', `${system.platform} (${system.arch})`],
                    ['CPUs', `${system.cpus} cœurs`],
                    ['Node.js', system.nodeVersion],
                    ['Uptime OS', formatUptime(system.uptime)],
                    ['Uptime Process', formatUptime(system.processUptime)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-zinc-500">{k}</span>
                      <span className="text-white font-mono text-xs">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Memory */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Cpu className="w-4 h-4 text-zinc-500" /> Mémoire</h3>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-500">RAM utilisée</span>
                    <span className="text-white">{memUsed}%</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${memUsed > 80 ? 'bg-red-500' : memUsed > 60 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${memUsed}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-zinc-600 mt-1">
                    <span>{formatBytes(system.totalMemory - system.freeMemory)} utilisé</span>
                    <span>{formatBytes(system.totalMemory)} total</span>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <h4 className="text-zinc-400 text-xs font-medium">Processus Node.js</h4>
                  {[
                    ['Heap utilisé', formatBytes(system.processMemory?.heapUsed)],
                    ['Heap total', formatBytes(system.processMemory?.heapTotal)],
                    ['RSS', formatBytes(system.processMemory?.rss)],
                    ['Externe', formatBytes(system.processMemory?.external)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-zinc-500">{k}</span>
                      <span className="text-white font-mono text-xs">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Load average */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-zinc-500" /> Charge CPU</h3>
              <div className="flex gap-6">
                {['1 min', '5 min', '15 min'].map((label, i) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl font-bold text-white">{system.loadAvg?.[i]?.toFixed(2)}</p>
                    <p className="text-zinc-500 text-xs">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
