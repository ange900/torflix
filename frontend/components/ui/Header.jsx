'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, User, Settings, LogOut, Menu, X, ChevronDown } from 'lucide-react';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { authApi } from '@/lib/api';
import ModeSelector from '@/components/ui/ModeSelector';
import { useUIStore } from '@/stores/uiStore';

function SearchSuggestions({ query, results, onSelect, onClose, loading }) {
  if (!query || query.length < 2) return null;
  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-sp-darker/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
      {loading ? (
        <div className="p-6 text-center"><div className="w-6 h-6 border-2 border-sp-red border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-zinc-500 text-sm mt-2">Recherche...</p></div>
      ) : results.length > 0 ? (
        <>
          <div className="px-4 py-2 border-b border-white/5"><span className="text-xs text-zinc-500 font-medium">{results.length} résultats</span></div>
          {results.map((item) => (
            <button key={`${item.media_type}-${item.id}`} onClick={() => onSelect(item)} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors text-left">
              <div className="w-12 h-16 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                {item.poster_path ? <img src={`https://image.tmdb.org/t/p/w92${item.poster_path}`} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{item.media_type === 'tv' ? '📺' : '🎬'}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{item.title || item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-zinc-500">{(item.release_date || item.first_air_date || '').slice(0, 4)}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">{item.media_type === 'tv' ? 'Série' : 'Film'}</span>
                  {item.vote_average > 0 && <span className="text-xs text-yellow-500">★ {item.vote_average.toFixed(1)}</span>}
                </div>
              </div>
            </button>
          ))}
          <button onClick={() => onClose(query)} className="w-full px-4 py-3 text-sm text-sp-red hover:bg-white/5 transition-colors border-t border-white/5 font-medium">Voir tous les résultats →</button>
        </>
      ) : (
        <div className="p-6 text-center"><p className="text-zinc-400 text-sm">Aucun résultat pour "{query}"</p></div>
      )}
    </div>
  );
}

export default function Header({ user, onMenuClick }) {
  const router = useRouter();
  const { toggleSidebar, sidebarCollapsed } = useUIStore();
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/movies/search?query=${encodeURIComponent(searchQuery)}`);
        if (res.ok) { const data = await res.json(); setSearchResults((data.results || []).slice(0, 8)); }
      } catch (err) { console.error('Search error:', err); }
      finally { setSearchLoading(false); }
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    function handleClick(e) { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocused(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectResult = (item) => { router.push(`/watch/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`); setSearchQuery(''); setSearchFocused(false); };
  const handleViewAll = (q) => { router.push(`/search?q=${encodeURIComponent(q)}`); setSearchQuery(''); setSearchFocused(false); };
  const handleLogout = async () => {
    try { await authApi.logout(); } catch (e) { console.error(e); }
    finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('torflix_mode');
      localStorage.removeItem('torflix_lang');
      router.push('/login');
    }
  };
  const handleSearchSubmit = (e) => { e.preventDefault(); if (searchQuery.trim()) { router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setSearchFocused(false); } };

  return (
    <header className="sticky top-0 z-40 h-16 bg-sp-darker/80 backdrop-blur-xl border-b border-white/5">
      <div style={{display:"flex", alignItems:"center", height:"100%", padding:"0 12px", gap:"8px"}}>
        <button onClick={onMenuClick || toggleSidebar} className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"><Menu className="w-5 h-5" /></button>
        <div ref={searchRef} style={{position:"relative", width:"260px", flexShrink:0, marginLeft:"8px"}}>
          <form onSubmit={handleSearchSubmit}>
            <div className={`relative flex items-center transition-all duration-300 ${searchFocused ? 'scale-[1.02]' : ''}`}>
              <Search className="absolute left-4 w-4 h-4 text-zinc-500" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setSearchFocused(true)} placeholder="Rechercher un film, une série..." className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sp-red/50 focus:bg-white/8 transition-all" />
              {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 p-1 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>}
            </div>
          </form>
          {searchFocused && searchQuery.length >= 2 && <SearchSuggestions query={searchQuery} results={searchResults} loading={searchLoading} onSelect={handleSelectResult} onClose={handleViewAll} />}
        </div>
        <div style={{display:"flex", alignItems:"center", gap:"6px", flexShrink:0, marginLeft:"auto", paddingRight:"8px"}}>
          <ModeSelector compact={true} />
          <NotificationDropdown />
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sp-red to-red-700 flex items-center justify-center text-sm font-bold">{user?.username?.charAt(0).toUpperCase() || 'U'}</div>
              <span className="hidden md:block text-sm text-zinc-300">{user?.username}</span>
              <ChevronDown className="hidden md:block w-4 h-4 text-zinc-500" />
            </button>
            {showMenu && (
              <><div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-sp-darker border border-white/10 rounded-2xl shadow-2xl shadow-black/50 z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5"><p className="text-sm font-medium text-white">{user?.username}</p><p className="text-xs text-zinc-500">{user?.email}</p></div>
                <div className="py-1">
                  <button onClick={() => { setShowMenu(false); router.push('/settings'); }} className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-white/5 flex items-center gap-3"><User className="w-4 h-4 text-zinc-500" /> Profil</button>
                  <button onClick={() => { setShowMenu(false); router.push('/settings'); }} className="w-full px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-white/5 flex items-center gap-3"><Settings className="w-4 h-4 text-zinc-500" /> Paramètres</button>
                  <div className="border-t border-white/5 my-1" />
                  <button onClick={handleLogout} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3"><LogOut className="w-4 h-4" /> Déconnexion</button>
                </div>
              </div></>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
 
 
 
 
 
