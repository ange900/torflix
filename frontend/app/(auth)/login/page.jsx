'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Play, Loader2, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';

const BACKDROPS = [
  'https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
  'https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg',
  'https://image.tmdb.org/t/p/original/3V4kLQg0kSqPLctI5ziYWabAZYF.jpg',
];

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ emailOrUsername: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setBgIndex(p => (p + 1) % BACKDROPS.length), 8000);
    return () => clearInterval(i);
  }, []);

  const handle = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.emailOrUsername || !form.password) { setError('Remplissez tous les champs'); return; }
    setLoading(true);
    try {
      await authApi.login(form);
      router.push('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-black">
      {/* Animated backdrop */}
      {BACKDROPS.map((url, i) => (
        <div
          key={i}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ${i === bgIndex ? 'opacity-30' : 'opacity-0'}`}
          style={{ backgroundImage: `url(${url})` }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-sp-red/10" />

      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 bg-sp-red/20 rounded-full animate-pulse-slow" style={{
            top: `${15 + i * 15}%`, left: `${10 + i * 12}%`,
            animationDelay: `${i * 0.5}s`, width: `${2 + i}px`, height: `${2 + i}px`,
          }} />
        ))}
      </div>

      {/* Left branding (desktop) */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10">
        <div className="max-w-md text-center px-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-sp-red flex items-center justify-center shadow-lg glow-red">
              <Play className="w-7 h-7 text-white fill-white ml-0.5" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight">Stream<span className="text-sp-red">Panel</span></h1>
          </div>
          <p className="text-zinc-400 text-lg leading-relaxed">Votre plateforme de streaming personnelle. Films, séries, sans limites.</p>
          <div className="flex items-center justify-center gap-6 mt-8 text-zinc-500 text-sm">
            <span className="flex items-center gap-1.5">🎬 Films</span>
            <span className="flex items-center gap-1.5">📺 Séries</span>
            <span className="flex items-center gap-1.5">⚡ Temps réel</span>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-sp-red flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
              <h1 className="text-3xl font-black text-white">Stream<span className="text-sp-red">Panel</span></h1>
            </div>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Connexion</h2>
            <p className="text-zinc-500 text-sm mb-6">Connectez-vous à votre compte</p>

            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Email ou nom d'utilisateur</label>
                <input
                  name="emailOrUsername" value={form.emailOrUsername} onChange={handle} required autoFocus
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-sp-red/50 focus:ring-1 focus:ring-sp-red/20 transition-all"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handle} required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-sp-red/50 focus:ring-1 focus:ring-sp-red/20 transition-all pr-11"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setRemember(r => !r)} className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${remember ? 'bg-sp-red border-sp-red' : 'border-zinc-600'}`}>
                    {remember && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className="text-zinc-500 text-xs">Se souvenir de moi</span>
                </label>
                <Link href="/forgot-password" className="text-xs text-sp-red hover:text-red-400 transition-colors">Mot de passe oublié ?</Link>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 bg-sp-red hover:bg-red-500 text-white font-semibold text-sm rounded-xl transition-all hover:scale-[1.02] btn-press disabled:opacity-50 disabled:hover:scale-100 glow-red mt-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Se connecter'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-zinc-500 text-sm">Pas encore de compte ? </span>
              <Link href="/register" className="text-sp-red hover:text-red-400 text-sm font-medium transition-colors">Créer un compte</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
