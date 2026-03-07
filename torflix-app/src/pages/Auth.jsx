import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { login, register, storeAuth } from '../services/auth';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!username || !email || !password) throw new Error('Tous les champs sont requis');
        if (password.length < 6) throw new Error('Mot de passe: 6 caracteres minimum');
        await register(username, email, password);
        const data = await login(email, password);
        storeAuth(data.user, data.tokens);
        onAuth(data.user);
      } else {
        if (!email || !password) throw new Error('Email et mot de passe requis');
        const data = await login(email, password);
        storeAuth(data.user, data.tokens);
        onAuth(data.user);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="flex items-center justify-center mb-8">
        <img src="/icons/icon-192x192.png" alt="TorFix" className="w-24 h-24" />
      </div>
      <div className="w-full max-w-sm">
        <h2 className="text-xl font-bold text-white mb-6 text-center">
          {mode === 'login' ? 'Connexion' : 'Inscription'}
        </h2>
        {error && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600/30 rounded-xl text-red-400 text-xs text-center">{error}</div>
        )}
        <div className="space-y-3">
          {mode === 'register' && (
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Nom d'utilisateur"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-red-600" />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-red-600" />
          <div className="relative">
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" type={showPw ? 'text' : 'password'}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-red-600 pr-12" />
            <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-zinc-500">
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="w-full mt-5 py-3 bg-red-600 text-white font-bold rounded-xl text-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>
        <p className="text-center text-zinc-500 text-xs mt-4">
          {mode === 'login' ? "Pas de compte ? " : "Deja inscrit ? "}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-red-500 font-semibold">
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  );
}
