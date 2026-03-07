'use client';
import { Suspense, useEffect, useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import MobileNav from '@/components/ui/MobileNav';
import NavProgress from '@/components/ui/NavProgress';
import PageTransition from '@/components/ui/PageTransition';
import { authApi } from '@/lib/api';
import { Home, Film, Tv, Search, Heart, Clock, User, Settings, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

function TVDrawer({ open, onClose }) {
  const router = useRouter();
  const items = [
    { href: '/', icon: Home, label: 'Accueil' },
    { href: '/films', icon: Film, label: 'Films' },
    { href: '/series', icon: Tv, label: 'Séries' },
    { href: '/search', icon: Search, label: 'Recherche' },
    { href: '/watchlist', icon: Heart, label: 'Favoris' },
    { href: '/history', icon: Clock, label: 'Continuer' },
    { href: '/profile', icon: User, label: 'Mon espace' },
    { href: '/settings', icon: Settings, label: 'Paramètres' },
  ];
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex'}}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.7)'}} onClick={onClose} />
      <div style={{position:'relative',width:280,background:'#111',height:'100%',padding:'24px 0',display:'flex',flexDirection:'column',gap:4,boxShadow:'4px 0 32px rgba(0,0,0,0.8)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px 20px'}}>
          <span style={{color:'#fff',fontSize:22,fontWeight:'bold'}}>🎬 TorFlix</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#aaa',cursor:'pointer'}}><X size={24}/></button>
        </div>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.href}
              onClick={() => { router.push(item.href); onClose(); }}
              style={{display:'flex',alignItems:'center',gap:16,padding:'14px 24px',background:'none',border:'none',color:'#ccc',cursor:'pointer',fontSize:16,textAlign:'left',width:'100%',transition:'background 0.15s'}}>
              <Icon size={22} color="#e50914"/>
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MainLayout({ children }) {
  const [isTV, setIsTV] = useState(false);
  const [user, setUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const tv = navigator.userAgent.includes('TorFlixTV');
    setIsTV(tv);
    authApi.getCurrentUser().then(data => setUser(data.user)).catch(() => {});
    if (tv) {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.addEventListener('contextmenu', e => e.preventDefault());
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-sp-darker">
      <NavProgress />
      {!isTV && <Sidebar />}
      {isTV && <TVDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
      <div className={`flex-1 flex flex-col min-h-screen ${!isTV ? 'lg:ml-20' : ''}`}>
        <Header user={user} onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 pt-16 pb-20 lg:pb-4">
          <Suspense fallback={
            <div className="flex items-center justify-center h-[50vh]">
              <div className="w-10 h-10 border-2 border-sp-red border-t-transparent rounded-full animate-spin"/>
            </div>
          }>
            <PageTransition>{children}</PageTransition>
          </Suspense>
        </main>
        {!isTV && <MobileNav />}
      </div>
    </div>
  );
}
