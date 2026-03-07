'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Film, Search, Tv, User, Heart, Clock, Grid, BookMarked } from 'lucide-react';

const TABS = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/films', icon: Film, label: 'Films' },
  { href: '/series', icon: Tv, label: 'Séries' },
  { href: '/search', icon: Search, label: 'Recherche' },
  { href: '/watchlist', icon: Heart, label: 'Favoris' },
  { href: '/history', icon: Clock, label: 'Continuer' },
  { href: '/profile', icon: User, label: 'Profil' },
];

export default function MobileNav() {
  const pathname = usePathname();

  if (pathname.startsWith('/player') || pathname.startsWith('/watch/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-sp-darker/95 backdrop-blur-xl border-t border-white/5">
      <div className="flex items-center justify-around px-1 pt-2 pb-2 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href} href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all flex-shrink-0 ${isActive ? 'text-sp-red' : 'text-zinc-500'}`}
            >
              <Icon className={`w-5 h-5 transition-all ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[9px] font-medium whitespace-nowrap">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
