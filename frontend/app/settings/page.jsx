'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, User, Lock, Bell, Monitor, Palette, Save, Check, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { authApi, api } from '@/lib/api';

function SettingsSection({ icon: Icon, title, children }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2"><Icon className="w-5 h-5 text-zinc-400" /> {title}</h2>
      {children}
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, disabled, rightIcon }) {
  return (
    <div className="mb-4">
      <label className="block text-zinc-400 text-sm mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-sp-red/50 focus:ring-1 focus:ring-sp-red/20 disabled:opacity-50 transition-all"
        />
        {rightIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightIcon}</div>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Profile fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Preferences
  const [autoplay, setAutoplay] = useState(true);
  const [defaultQuality, setDefaultQuality] = useState('1080p');
  const [defaultLang, setDefaultLang] = useState('VF');
  const [autoSubtitles, setAutoSubtitles] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const u = await authApi.getCurrentUser();
        setUser(u);
        setUsername(u.username || '');
        setEmail(u.email || '');
        // Load preferences from localStorage
        if (typeof window !== 'undefined') {
          setAutoplay(localStorage.getItem('sp_autoplay') !== 'false');
          setDefaultQuality(localStorage.getItem('sp_quality') || '1080p');
          setDefaultLang(localStorage.getItem('sp_lang') || 'VF');
          setAutoSubtitles(localStorage.getItem('sp_autosub') !== 'false');
        }
      } catch { router.push('/login'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const body = {};
      if (username !== user.username) body.username = username;
      if (email !== user.email) body.email = email;
      if (Object.keys(body).length === 0) { showMsg('Aucun changement', 'info'); setSaving(false); return; }
      const res = await api.put('/api/auth/me', body);
      setUser(res.data.user);
      showMsg('Profil mis à jour');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erreur', 'error');
    }
    setSaving(false);
  };

  const savePassword = async () => {
    if (!currentPassword) { showMsg('Mot de passe actuel requis', 'error'); return; }
    if (newPassword.length < 6) { showMsg('6 caractères minimum', 'error'); return; }
    if (newPassword !== confirmPassword) { showMsg('Les mots de passe ne correspondent pas', 'error'); return; }
    setSaving(true);
    try {
      await api.put('/api/auth/me', { currentPassword, newPassword });
      showMsg('Mot de passe mis à jour');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      showMsg(err.response?.data?.error || 'Erreur', 'error');
    }
    setSaving(false);
  };

  const savePreferences = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sp_autoplay', autoplay);
      localStorage.setItem('sp_quality', defaultQuality);
      localStorage.setItem('sp_lang', defaultLang);
      localStorage.setItem('sp_autosub', autoSubtitles);
    }
    showMsg('Préférences sauvegardées');
  };

  if (loading) return <MainLayout><div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 text-sp-red animate-spin" /></div>      {/* Tracker accounts link */}
        <div className="mt-6 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">🏴‍☠️ Comptes Torrent</h2>
          <p className="text-zinc-400 text-sm mb-3">Gérez vos comptes de trackers torrent (YGG, Torrent9, Sharewood)</p>
          <a href="/trackers" className="inline-flex items-center gap-2 px-4 py-2 bg-sp-red/10 text-sp-red text-sm rounded-xl hover:bg-sp-red/20 transition-all">
            Gérer mes comptes →
          </a>
        </div>
    </MainLayout>;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Settings className="w-6 h-6" /> Paramètres</h1>
        </div>

        {/* Toast message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm animate-fade-in ${
            message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' :
            message.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
            'bg-blue-500/10 border border-blue-500/20 text-blue-400'
          }`}>
            {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* PROFILE */}
        <SettingsSection icon={User} title="Profil">
          <Input label="Nom d'utilisateur" value={username} onChange={setUsername} placeholder="username" />
          <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="email@example.com" />
          <button onClick={saveProfile} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-sp-red hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Sauvegarder le profil
          </button>
        </SettingsSection>

        {/* PASSWORD */}
        <SettingsSection icon={Lock} title="Mot de passe">
          <Input
            label="Mot de passe actuel" type={showCurrentPw ? 'text' : 'password'}
            value={currentPassword} onChange={setCurrentPassword} placeholder="••••••••"
            rightIcon={<button onClick={() => setShowCurrentPw(s => !s)} className="text-zinc-500 hover:text-white">{showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
          />
          <Input
            label="Nouveau mot de passe" type={showNewPw ? 'text' : 'password'}
            value={newPassword} onChange={setNewPassword} placeholder="6 caractères minimum"
            rightIcon={<button onClick={() => setShowNewPw(s => !s)} className="text-zinc-500 hover:text-white">{showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
          />
          <Input label="Confirmer le mot de passe" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" />
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-red-400 text-xs mb-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Les mots de passe ne correspondent pas</p>
          )}
          <button onClick={savePassword} disabled={saving || !currentPassword || !newPassword} className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-30">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Changer le mot de passe
          </button>
        </SettingsSection>

        {/* PREFERENCES */}
        <SettingsSection icon={Monitor} title="Lecture">
          {/* Autoplay */}
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div><p className="text-white text-sm">Lecture automatique</p><p className="text-zinc-500 text-xs">Lancer automatiquement le meilleur torrent</p></div>
            <button onClick={() => setAutoplay(a => !a)} className={`w-11 h-6 rounded-full transition-all ${autoplay ? 'bg-sp-red' : 'bg-zinc-700'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoplay ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
            </button>
          </div>

          {/* Default quality */}
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div><p className="text-white text-sm">Qualité préférée</p><p className="text-zinc-500 text-xs">Qualité par défaut pour la sélection automatique</p></div>
            <select value={defaultQuality} onChange={e => setDefaultQuality(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-sp-red/50">
              <option value="4K" className="bg-zinc-900">4K</option>
              <option value="1080p" className="bg-zinc-900">1080p</option>
              <option value="720p" className="bg-zinc-900">720p</option>
            </select>
          </div>

          {/* Default language */}
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div><p className="text-white text-sm">Langue préférée</p><p className="text-zinc-500 text-xs">Langue prioritaire pour les torrents</p></div>
            <select value={defaultLang} onChange={e => setDefaultLang(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-sp-red/50">
              <option value="VF" className="bg-zinc-900">VF</option>
              <option value="VOSTFR" className="bg-zinc-900">VOSTFR</option>
              <option value="MULTI" className="bg-zinc-900">MULTI</option>
              <option value="VO" className="bg-zinc-900">VO</option>
            </select>
          </div>

          {/* Auto subtitles */}
          <div className="flex items-center justify-between py-3">
            <div><p className="text-white text-sm">Sous-titres automatiques</p><p className="text-zinc-500 text-xs">Activer les sous-titres si disponibles</p></div>
            <button onClick={() => setAutoSubtitles(a => !a)} className={`w-11 h-6 rounded-full transition-all ${autoSubtitles ? 'bg-sp-red' : 'bg-zinc-700'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoSubtitles ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
            </button>
          </div>

          <button onClick={savePreferences} className="flex items-center gap-2 px-5 py-2.5 bg-sp-red hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-all mt-4">
            <Save className="w-4 h-4" /> Sauvegarder les préférences
          </button>
        </SettingsSection>

        {/* APP INFO */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center">
          <p className="text-zinc-500 text-sm">StreamPanel <span className="text-white">v2.0</span></p>
          <p className="text-zinc-600 text-xs mt-1">Powered by Next.js + Express + WebTorrent</p>
        </div>
      </div>
          {/* Tracker accounts link */}
        <div className="mt-6 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">🏴‍☠️ Comptes Torrent</h2>
          <p className="text-zinc-400 text-sm mb-3">Gérez vos comptes de trackers torrent (YGG, Torrent9, Sharewood)</p>
          <a href="/trackers" className="inline-flex items-center gap-2 px-4 py-2 bg-sp-red/10 text-sp-red text-sm rounded-xl hover:bg-sp-red/20 transition-all">
            Gérer mes comptes →
          </a>
        </div>
    </MainLayout>
  );
}
