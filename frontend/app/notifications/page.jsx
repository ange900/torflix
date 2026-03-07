'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Sparkles, Tv, CheckCheck, Trash2, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { notifApi } from '@/lib/notifications';

const TYPE_CONFIG = {
  recommendation: { icon: Sparkles, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Recommandation' },
  new_episode: { icon: Tv, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Nouvel épisode' },
  welcome: { icon: Bell, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Bienvenue' },
  system: { icon: Bell, color: 'text-zinc-400', bg: 'bg-zinc-500/10', label: 'Système' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    try {
      const data = await notifApi.getAll(100);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleClick = async (notif) => {
    if (!notif.is_read) {
      await notifApi.markRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    }
    if (notif.link) router.push(notif.link);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const r1 = await notifApi.generateRecommendations();
      const r2 = await notifApi.checkNewEpisodes();
      await load();
    } catch {}
    setGenerating(false);
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'recommendations') return n.type === 'recommendation';
    if (filter === 'episodes') return n.type === 'new_episode';
    return true;
  });

  const formatDate = (d) => {
    if (!d) return '';
    const diff = (Date.now() - new Date(d).getTime()) / 1000;
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <MainLayout><div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-sp-red animate-spin" /></div></MainLayout>;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"><ArrowLeft className="w-4 h-4 text-white" /></button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Bell className="w-6 h-6" /> Notifications</h1>
            {unreadCount > 0 && <span className="px-2 py-0.5 bg-sp-red rounded-full text-white text-xs font-bold">{unreadCount}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 px-3 py-2 bg-sp-red/10 text-sp-red text-sm rounded-xl hover:bg-sp-red/20 transition-all disabled:opacity-50">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Actualiser
            </button>
            {unreadCount > 0 && (
              <button onClick={async () => { await notifApi.markAllRead(); load(); }} className="flex items-center gap-2 px-3 py-2 bg-white/5 text-zinc-400 text-sm rounded-xl hover:bg-white/10 transition-all">
                <CheckCheck className="w-4 h-4" /> Tout lu
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {[['all','Tout'],['unread','Non lus'],['recommendations','Recommandations'],['episodes','Épisodes']].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${filter === k ? 'bg-sp-red text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>{l}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-lg">{notifications.length === 0 ? 'Aucune notification' : 'Aucune notification pour ce filtre'}</p>
            <button onClick={handleGenerate} disabled={generating} className="mt-4 px-6 py-3 bg-sp-red hover:bg-red-500 text-white rounded-xl transition-all">
              {generating ? 'Chargement...' : '✨ Obtenir des recommandations'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(notif => {
              const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
              const Icon = config.icon;
              return (
                <div key={notif.id} onClick={() => handleClick(notif)} className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${!notif.is_read ? 'bg-white/[0.03] border-white/10 hover:border-white/20' : 'bg-white/[0.01] border-white/5 hover:border-white/10'}`}>
                  {notif.image_url ? (
                    <img src={notif.image_url} alt="" className="w-12 h-18 rounded-lg object-cover flex-shrink-0 bg-zinc-800" />
                  ) : (
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${config.bg} ${config.color}`}>{config.label}</span>
                      {!notif.is_read && <span className="w-2 h-2 rounded-full bg-sp-red" />}
                    </div>
                    <p className={`text-sm ${!notif.is_read ? 'text-white font-medium' : 'text-zinc-300'}`}>{notif.title}</p>
                    {notif.message && <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{notif.message}</p>}
                    <p className="text-zinc-600 text-xs mt-2">{formatDate(notif.created_at)}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); notifApi.remove(notif.id); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }} className="p-2 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {notifications.length > 0 && (
          <div className="mt-6 text-center">
            <button onClick={async () => { await notifApi.clearAll(); setNotifications([]); setUnreadCount(0); }} className="text-zinc-600 text-sm hover:text-red-400 transition-colors">
              Supprimer toutes les notifications
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
