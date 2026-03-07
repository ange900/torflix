import { useState, useEffect, useRef } from 'react';
import { Bell, X, Trash2, Check, CheckCheck, Sparkles, Tv, Film, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStoredAuth } from '../services/auth';
import { img } from '../services/tmdb';

const API = 'https://torfix.xyz';

function getToken() {
  const auth = getStoredAuth();
  return auth?.tokens?.refreshToken || '';
}

export default function NotifBell() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const panelRef = useRef(null);

  const headers = { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };

  const fetchNotifs = async () => {
    try {
      const res = await fetch(`${API}/api/notifications?limit=30`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifs(data.notifications || []);
        setUnread(data.unread_count || 0);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markRead = async (id) => {
    await fetch(`${API}/api/notifications/${id}/read`, { method: 'PUT', headers });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch(`${API}/api/notifications/read-all`, { method: 'PUT', headers });
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const deleteNotif = async (id) => {
    await fetch(`${API}/api/notifications/${id}`, { method: 'DELETE', headers });
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const generateRecs = async () => {
    setGenLoading(true);
    try {
      await fetch(`${API}/api/notifications/generate-recommendations`, { method: 'POST', headers });
      await fetch(`${API}/api/notifications/check-new-episodes`, { method: 'POST', headers });
      await fetchNotifs();
    } catch {}
    setGenLoading(false);
  };

  const handleClick = (n) => {
    if (!n.is_read) markRead(n.id);
    if (n.link) {
      const match = n.link.match(/\/watch\/(movie|tv)\/(\d+)/);
      if (match) nav(`/details/${match[1]}/${match[2]}`);
    }
    setOpen(false);
  };

  const typeIcon = (type) => {
    if (type === 'recommendation') return <Sparkles className="w-4 h-4 text-yellow-500" />;
    if (type === 'new_episode') return <Tv className="w-4 h-4 text-blue-500" />;
    return <Film className="w-4 h-4 text-zinc-500" />;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
        <Bell className="w-5 h-5 text-zinc-400" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[320px] max-h-[70vh] bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-sm font-bold text-white">Notifications</span>
            <div className="flex gap-2">
              <button onClick={generateRecs} disabled={genLoading}
                className="text-[10px] text-yellow-500 hover:text-yellow-400 flex items-center gap-1">
                {genLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Suggestions
              </button>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <CheckCheck className="w-3 h-3" /> Tout lu
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[55vh]">
            {notifs.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Aucune notification</p>
                <button onClick={generateRecs} disabled={genLoading}
                  className="mt-3 px-4 py-2 bg-red-600/15 text-red-400 rounded-lg text-xs font-medium">
                  {genLoading ? 'Génération...' : 'Générer des recommandations'}
                </button>
              </div>
            ) : (
              notifs.map(n => (
                <div key={n.id} onClick={() => handleClick(n)}
                  className={`flex gap-3 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${!n.is_read ? 'bg-red-600/5' : ''}`}>
                  <div className="flex-shrink-0 mt-0.5">{typeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${!n.is_read ? 'text-white' : 'text-zinc-400'}`}>{n.title}</p>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[9px] text-zinc-600 mt-1">{new Date(n.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                    className="flex-shrink-0 p-1 text-zinc-700 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
