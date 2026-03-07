import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotifBell from './NotifBell';
import { Home, Search, Film, Tv, Settings, Download, User, ChevronLeft, ChevronRight, LogOut, TrendingUp, Clock, Heart, Wifi, Shield } from 'lucide-react';
import { clearAuth } from '../services/auth';

const mainMenu = [
  { path: '/', icon: Home, label: 'Accueil' },
  { path: '/trending', icon: TrendingUp, label: 'Tendances' },
  { path: '/movies', icon: Film, label: 'Films' },
  { path: '/series', icon: Tv, label: 'Séries' },
  { path: '/search', icon: Search, label: 'Recherche' },
];

const libraryMenu = [
  { path: '/mylist', icon: Heart, label: 'Ma Liste' },
  { path: '/history', icon: Clock, label: 'Historique' },
];

const systemMenu = [
  { path: '/trackers', icon: Wifi, label: 'Trackers' },
  { path: '/admin', icon: Shield, label: 'Admin' },
  { path: '/download', icon: Download, label: 'Télécharger' },
    { path: '/settings', icon: Settings, label: 'Paramètres' },
    { path: '/profile', icon: User, label: 'Profil' },
];

function MenuSection({ items, label, collapsed, nav, loc }) {

  return (
    <div>
      {!collapsed && label && <p className="px-4 text-[10px] uppercase tracking-widest text-zinc-600 mb-1 mt-4">{label}</p>}
      {collapsed && label && <div className="border-t border-white/5 my-2 mx-3" />}
      {items.map(({ path, icon: Icon, label }) => {
        const active = path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(path);
        return (
          <button key={path} onClick={() => nav(path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group
              ${active ? 'bg-red-600/15 text-red-500' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
            <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-red-500' : 'text-zinc-500 group-hover:text-white'}`}
              strokeWidth={active ? 2.5 : 1.5} />
            {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}

// TV Mode detection
function isTVMode() {
  try { return window.__TV_MODE__ || window.location.search.indexOf("tv=1") !== -1; } catch(e) { return false; }
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  
  return (
    <aside className={`hidden md:flex flex-col fixed left-0 top-0 h-full bg-[#111]/95 backdrop-blur-xl border-r border-white/5 z-50 transition-all duration-300 ${collapsed ? 'w-[70px]' : 'w-[220px]'}`}>
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/5">
        <img src="/icons/icon-192x192.png" alt="TorFlix" className="w-8 h-8 rounded-lg flex-shrink-0" />
        {!collapsed && <span className="text-lg font-bold text-white tracking-wide">TorFlix</span>}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1">
        <MenuSection items={mainMenu} collapsed={collapsed} nav={nav} loc={loc} />
        <MenuSection items={libraryMenu} label="Bibliothèque" collapsed={collapsed} nav={nav} loc={loc} />
        <MenuSection items={systemMenu} label="Système" collapsed={collapsed} nav={nav} loc={loc} />
      </div>

      <div className="px-2 pb-3 border-t border-white/5 pt-2">
        <button onClick={() => { clearAuth(); window.location.reload(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-500 hover:bg-red-600/10 hover:text-red-400 transition-all">
          <LogOut className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
          {!collapsed && <span className="text-sm font-medium">Déconnexion</span>}
        </button>
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-600 hover:bg-white/5 hover:text-zinc-400 transition-all">
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="text-xs">Réduire</span>}
        </button>
      </div>
    </aside>
  );
}
