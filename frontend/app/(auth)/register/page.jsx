'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Play, Loader2, AlertCircle, Check } from 'lucide-react';
import { authApi } from '@/lib/api';
import { getPasswordStrength } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handle = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(''); };
  const pw = getPasswordStrength(form.password);
  const pwMatch = form.confirmPassword && form.password === form.confirmPassword;
  const pwMismatch = form.confirmPassword && form.password !== form.confirmPassword;
  const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas'); return; }
    if (pw.score < 2) { setError('Mot de passe trop faible'); return; }
    setLoading(true);
    try {
      await authApi.register(form);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || "Erreur lors de l'inscription");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center animate-bounce-in">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Compte créé !</h2>
          <p className="text-zinc-400">Redirection vers la connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: 'url(https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-sp-blue/10" />

      {/* Left branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10">
        <div className="max-w-md text-center px-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-sp-red flex items-center justify-center shadow-lg glow-red">
              <Play className="w-7 h-7 text-white fill-white ml-0.5" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight">Stream<span className="text-sp-red">Panel</span></h1>
          </div>
          <p className="text-zinc-400 text-lg leading-relaxed">Rejoignez StreamPanel et accédez à des milliers de films et séries en streaming.</p>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">∞</p>
              <p className="text-zinc-500 text-xs">Contenus</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">4K</p>
              <p className="text-zinc-500 text-xs">Qualité max</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
              <p className="text-2xl font-bold text-white">0€</p>
              <p className="text-zinc-500 text-xs">Gratuit</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-sp-red flex items-center justify-center"><Play className="w-5 h-5 text-white fill-white ml-0.5" /></div>
              <h1 className="text-3xl font-black text-white">Stream<span className="text-sp-red">Panel</span></h1>
            </div>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-1">Créer un compte</h2>
            <p className="text-zinc-500 text-sm mb-6">Inscrivez-vous gratuitement</p>

            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Nom d'utilisateur</label>
                <input name="username" value={form.username} onChange={handle} required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-sp-red/50 focus:ring-1 focus:ring-sp-red/20 transition-all"
                  placeholder="MonPseudo" />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Email</label>
                <input name="email" type="email" value={form.email} onChange={handle} required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-sp-red/50 focus:ring-1 focus:ring-sp-red/20 transition-all"
                  placeholder="votre@email.com" />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handle} required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-sp-red/50 focus:ring-1 focus:ring-sp-red/20 transition-all pr-11"
                    placeholder="6 caractères minimum" />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= pw.score ? strengthColors[pw.score] : 'bg-zinc-800'}`} />
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">Force : <span className={pw.score >= 3 ? 'text-green-400' : pw.score >= 2 ? 'text-yellow-400' : 'text-red-400'}>{pw.label}</span></p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-medium mb-1.5">Confirmer le mot de passe</label>
                <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handle} required
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none transition-all ${pwMatch ? 'border-green-500/50' : pwMismatch ? 'border-red-500/50' : 'border-white/10 focus:border-sp-red/50'}`}
                  placeholder="••••••••" />
                {pwMismatch && <p className="text-red-400 text-[11px] mt-1">Les mots de passe ne correspondent pas</p>}
                {pwMatch && <p className="text-green-400 text-[11px] mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Mots de passe identiques</p>}
              </div>

              <button type="submit" disabled={loading || pwMismatch || pw.score < 2} className="w-full py-3 bg-sp-red hover:bg-red-500 text-white font-semibold text-sm rounded-xl transition-all hover:scale-[1.02] btn-press disabled:opacity-40 disabled:hover:scale-100 glow-red mt-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Créer mon compte'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-zinc-500 text-sm">Déjà un compte ? </span>
              <Link href="/login" className="text-sp-red hover:text-red-400 text-sm font-medium transition-colors">Se connecter</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
