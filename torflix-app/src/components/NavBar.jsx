import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Film, Tv, Settings } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'Accueil' },
  { path: '/movies', icon: Film, label: 'Films' },
  { path: '/series', icon: Tv, label: 'Séries' },
  { path: '/search', icon: Search, label: 'Recherche' },
  { path: '/settings', icon: Settings, label: 'Réglages' },
];

export default function NavBar() {
  const nav = useNavigate();
  const loc = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-xl border-t border-white/5 safe-bottom z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(path);
          return (
            <button key={path} onClick={() => nav(path)}
              className={`flex flex-col items-center gap-1 px-2 py-1 transition-all ${active ? 'text-red' : 'text-zinc-500'}`}>
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
