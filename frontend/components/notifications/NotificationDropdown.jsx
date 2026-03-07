'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Trash2, Sparkles, Tv, Film, X, RefreshCw, Loader2 } from 'lucide-react';
import { notifApi } from '@/lib/notifications';

const TYPE_CONFIG = {
  recommendation: { icon: Sparkles, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  new_episode: { icon: Tv, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  welcome: { icon: Bell, color: 'text-green-400', bg: 'bg-green-500/10' },
  system: { icon: Bell, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
};

function timeAgo(date) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function NotificationDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const ref = useRef(null);

  // Load notifications
  const load = async () => {
    try {
      const data = await notifApi.getAll(30);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {}
  };

  // Poll every 60s
  useEffect(() => {
    load();
    const i = setInterval(load, 60000);
    return () => clearInterval(i);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = async (notif) => {
    if (!notif.is_read) {
      await notifApi.markRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    }
    if (notif.link) { router.push(notif.link); setOpen(false); }
  };

  const handleMarkAllRead = async () => {
    await notifApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleRemove = async (e, id) => {
    e.stopPropagation();
    await notifApi.remove(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    load();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await notifApi.generateRecommendations();
      await notifApi.checkNewEpisodes();
      await load();
    } catch {}
    setGenerating(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-sp-red rounded-full flex items-center justify-center">
            <span className="text-[10px] font-bold text-white leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-sp-darker border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h3 className="text-white font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-1">
              <button onClick={handleGenerate} disabled={generating} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all" title="Actualiser">
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </button>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all" title="Tout marquer comme lu">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">Aucune notification</p>
                <button onClick={handleGenerate} disabled={generating} className="mt-3 px-4 py-2 bg-sp-red/10 text-sp-red text-xs rounded-lg hover:bg-sp-red/20 transition-all">
                  {generating ? 'Chargement...' : '✨ Obtenir des recommandations'}
                </button>
              </div>
            ) : (
              notifications.map(notif => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                const Icon = config.icon;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`flex items-start gap-3 p-3 hover:bg-white/[0.03] transition-all cursor-pointer border-b border-white/[0.03] last:border-b-0 ${!notif.is_read ? 'bg-white/[0.02]' : ''}`}
                  >
                    {/* Icon or image */}
                    {notif.image_url ? (
                      <img src={notif.image_url} alt="" className="w-10 h-14 rounded-lg object-cover flex-shrink-0 bg-zinc-800" />
                    ) : (
                      <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!notif.is_read ? 'text-white font-medium' : 'text-zinc-400'}`}>{notif.title}</p>
                      {notif.message && <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{notif.message}</p>}
                      <p className="text-zinc-600 text-[10px] mt-1">{timeAgo(notif.created_at)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      {!notif.is_read && <div className="w-2 h-2 rounded-full bg-sp-red" />}
                      <button onClick={(e) => handleRemove(e, notif.id)} className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-white/5 flex justify-between items-center">
              <button onClick={() => { router.push('/notifications'); setOpen(false); }} className="text-sp-red text-xs hover:underline">
                Voir tout
              </button>
              <button onClick={async () => { await notifApi.clearAll(); setNotifications([]); setUnreadCount(0); }} className="text-zinc-600 text-xs hover:text-red-400 transition-colors">
                Tout supprimer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
