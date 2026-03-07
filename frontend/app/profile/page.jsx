'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Calendar, Shield, Clock, Film, Tv, Heart, LogOut, Edit3, Check, X, Loader2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { authApi } from '@/lib/api';
import { playbackApi } from '@/lib/streaming';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ watched: 0, favorites: 0, watching: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const u = await authApi.getCurrentUser();
        setUser(u);
        // Load stats
        const [history, favs, cont] = await Promise.allSettled([
          playbackApi.getHistory(1, 1000),
          playbackApi.getFavorites(),
          playbackApi.getContinueWatching(100),
        ]);
        setStats({
          watched: history.status === 'fulfilled' ? (history.value.results?.length || 0) : 0,
          favorites: favs.status === 'fulfilled' ? (favs.value.items?.length || 0) : 0,
          watching: cont.status === 'fulfilled' ? (cont.value.results?.length || 0) : 0,
        });
      } catch { router.push('/login'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <MainLayout><div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-sp-red animate-spin" /></div></MainLayout>;
  if (!user) return null;

  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const lastLogin = user.last_login ? new Date(user.last_login).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Jamais';
  const initials = (user.username || 'U').slice(0, 2).toUpperCase();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="relative mb-8">
          <div className="h-32 rounded-2xl bg-gradient-to-r from-sp-red/30 via-sp-blue/20 to-purple-600/20" />
          <div className="flex items-end gap-5 -mt-12 px-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sp-red to-red-700 flex items-center justify-center text-3xl font-bold text-white ring-4 ring-sp-darker shadow-xl">
              {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" /> : initials}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-white">{user.username}</h1>
              <p className="text-zinc-400 text-sm">{user.email}</p>
            </div>
            <div className="flex-1" />
            <button onClick={() => router.push('/settings')} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm rounded-xl transition-all mb-1">
              <Edit3 className="w-4 h-4" /> Modifier
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center hover:border-white/10 transition-all">
            <Film className="w-6 h-6 text-sp-red mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.watched}</p>
            <p className="text-zinc-500 text-xs mt-1">Visionnés</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center hover:border-white/10 transition-all">
            <Heart className="w-6 h-6 text-pink-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.favorites}</p>
            <p className="text-zinc-500 text-xs mt-1">Favoris</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center hover:border-white/10 transition-all">
            <Clock className="w-6 h-6 text-sp-blue mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.watching}</p>
            <p className="text-zinc-500 text-xs mt-1">En cours</p>
          </div>
        </div>

        {/* Infos */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Informations</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3"><User className="w-4 h-4 text-zinc-500" /><span className="text-zinc-400 text-sm w-32">Nom d'utilisateur</span><span className="text-white text-sm">{user.username}</span></div>
            <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-zinc-500" /><span className="text-zinc-400 text-sm w-32">Email</span><span className="text-white text-sm">{user.email}</span></div>
            <div className="flex items-center gap-3"><Shield className="w-4 h-4 text-zinc-500" /><span className="text-zinc-400 text-sm w-32">Rôle</span><span className="text-white text-sm capitalize">{user.role || 'Utilisateur'}</span></div>
            <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-zinc-500" /><span className="text-zinc-400 text-sm w-32">Membre depuis</span><span className="text-white text-sm">{memberSince}</span></div>
            <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-zinc-500" /><span className="text-zinc-400 text-sm w-32">Dernière connexion</span><span className="text-white text-sm">{lastLogin}</span></div>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button onClick={() => router.push('/history')} className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-white/10 transition-all text-left">
            <Clock className="w-5 h-5 text-sp-blue" /><div><p className="text-white text-sm font-medium">Historique</p><p className="text-zinc-500 text-xs">Voir tout ce que vous avez regardé</p></div>
          </button>
          <button onClick={() => router.push('/watchlist')} className="flex items-center gap-3 p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:border-white/10 transition-all text-left">
            <Heart className="w-5 h-5 text-pink-500" /><div><p className="text-white text-sm font-medium">Ma Liste</p><p className="text-zinc-500 text-xs">Vos films et séries favoris</p></div>
          </button>
        </div>

        {/* Danger zone */}
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Session</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => authApi.logout()} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm rounded-xl transition-all"><LogOut className="w-4 h-4" /> Déconnexion</button>
            <button onClick={() => { if (confirm('Déconnecter toutes les sessions ?')) authApi.logoutAll(); }} className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-xl transition-all"><LogOut className="w-4 h-4" /> Déconnecter partout</button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
