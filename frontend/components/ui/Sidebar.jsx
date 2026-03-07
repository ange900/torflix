'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home, Film, Tv, Search, Heart, Settings,
  ChevronLeft, ChevronRight, TrendingUp, Clock,
  Shield, Database, Download, Grid, User
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

const navItems = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/films', icon: Film, label: 'Films' },
  { href: '/series', icon: Tv, label: 'Séries' },
  { href: '/search', icon: Search, label: 'Recherche' },
  { href: '/trending', icon: TrendingUp, label: 'Tendances' },
  { href: '/history', icon: Clock, label: 'Continuer à regarder' },
];

const secondaryItems = [
  { href: '/watchlist', icon: Heart, label: 'Favoris' },
  { href: '/profile', icon: User, label: 'Mon espace' },
  { href: '/telecharger', icon: Download, label: 'Télécharger' },
  { href: '/trackers', icon: Database, label: 'Trackers' },
  { href: '/admin', icon: Shield, label: 'Admin', adminOnly: true },
  { href: '/settings', icon: Settings, label: 'Paramètres' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <>
      {!sidebarCollapsed && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={toggleSidebar} />
      )}
      <aside className={`fixed top-0 left-0 h-full z-50 bg-sp-darker/95 backdrop-blur-xl border-r border-white/5 transition-all duration-300 ease-out flex flex-col ${sidebarCollapsed ? 'w-20' : 'w-64'} ${sidebarCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}`}>
        <div className="flex items-center h-16 px-4 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sp-red to-red-700 flex items-center justify-center flex-shrink-0">
              <Film className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold text-white whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>TorFlix</span>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          <div className={`text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 ${sidebarCollapsed ? 'text-center' : 'px-3'}`}>
            {sidebarCollapsed ? '•••' : 'Menu'}
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-sp-red/15 text-sp-red' : 'text-zinc-400 hover:text-white hover:bg-white/5'} ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={sidebarCollapsed ? item.label : ''}>
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-sp-red' : 'group-hover:text-white'}`} />
                <span className={`text-sm font-medium whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? 'hidden' : 'block'}`}>{item.label}</span>
                {isActive && !sidebarCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sp-red" />}
              </Link>
            );
          })}

          <div className="my-4 border-t border-white/5" />
          <div className={`text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 ${sidebarCollapsed ? 'text-center' : 'px-3'}`}>
            {sidebarCollapsed ? '•••' : 'Bibliothèque'}
          </div>
          {secondaryItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive ? 'bg-sp-red/15 text-sp-red' : 'text-zinc-400 hover:text-white hover:bg-white/5'} ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={sidebarCollapsed ? item.label : ''}>
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-sp-red' : 'group-hover:text-white'}`} />
                <span className={`text-sm font-medium whitespace-nowrap transition-opacity duration-200 ${sidebarCollapsed ? 'hidden' : 'block'}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block p-3 border-t border-white/5">
          <button onClick={toggleSidebar} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <><ChevronLeft className="w-5 h-5" /><span className="text-sm">Réduire</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}
