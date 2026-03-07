'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, RefreshCw, Loader2, Check, X, Eye, EyeOff,
  Shield, AlertCircle, Activity, Database, Zap, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { trackerApi } from '@/lib/trackers';

const STATUS_MAP = {
  active:   { label: 'Actif',      color: 'text-green-400',  bg: 'bg-green-500/10',  icon: Check },
  inactive: { label: 'Inactif',    color: 'text-zinc-400',   bg: 'bg-zinc-500/10',   icon: X },
  pending:  { label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Activity },
  error:    { label: 'Erreur',     color: 'text-red-400',    bg: 'bg-red-500/10',    icon: AlertCircle },
  expired:  { label: 'Expiré',     color: 'text-orange-400', bg: 'bg-orange-500/10', icon: AlertCircle },
};

const TRACKER_ICONS = {
  ygg:      { emoji: '🏴‍☠️', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  torrent9: { emoji: '9️⃣',  color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  sharewood:{ emoji: '🌲',  color: 'text-green-400',  bg: 'bg-green-500/10'  },
};

export default function TrackersPage() {
  const router = useRouter();

  // Comptes privés
  const [accounts, setAccounts]   = useState([]);
  const [supported, setSupported] = useState([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [addForm, setAddForm]     = useState({ trackerType: '', username: '', password: '' });
  const [showPw, setShowPw]       = useState(false);
  const [adding, setAdding]       = useState(false);
  const [testing, setTesting]     = useState(null);

  // Indexeurs Jackett
  const [jackettIndexers, setJackettIndexers]       = useState([]);
  const [availableIndexers, setAvailableIndexers]   = useState([]);
  const [jackettLoading, setJackettLoading]         = useState(true);
  const [showAvailable, setShowAvailable]           = useState(false);
  const [searchFilter, setSearchFilter]             = useState('');
  const [actionLoading, setActionLoading]           = useState(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const notify = (type, text) => { setMessage({ type, text }); setTimeout(() => setMessage(null), 5000); };

  const load = async () => {
    try {
      const [acc, sup] = await Promise.all([trackerApi.getAccounts(), trackerApi.getSupported()]);
      setAccounts(acc.accounts || []);
      setSupported(sup.trackers || []);
    } catch {}
    setLoading(false);
  };

  const loadJackett = async () => {
    setJackettLoading(true);
    try {
      const { indexers } = await trackerApi.getJackettIndexers();
      setJackettIndexers(indexers || []);
    } catch {}
    setJackettLoading(false);
  };

  const loadAvailable = async () => {
    try {
      const { indexers } = await trackerApi.getAvailableIndexers();
      setAvailableIndexers(indexers || []);
    } catch {}
  };

  useEffect(() => { load(); loadJackett(); loadAvailable(); }, []);

  // ── Comptes privés ───────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addForm.trackerType || !addForm.username || !addForm.password) return;
    setAdding(true);
    try {
      const res = await trackerApi.addAccount(addForm.trackerType, addForm.username, addForm.password);
      if (res.error) notify('error', res.error);
      else { notify('success', 'Compte ajouté !'); setShowAdd(false); setAddForm({ trackerType: '', username: '', password: '' }); }
      await load();
    } catch { notify('error', "Erreur lors de l'ajout"); }
    setAdding(false);
  };

  const handleTest = async (type) => {
    setTesting(type);
    try {
      const res = await trackerApi.testLogin(type);
      if (res.success) notify('success', `Connexion ${type.toUpperCase()} réussie${res.ratio ? ` — Ratio: ${res.ratio}` : ''}`);
      else notify('error', res.error || 'Échec de connexion');
      await load();
    } catch { notify('error', 'Erreur de connexion'); }
    setTesting(null);
  };

  const handleRemoveAccount = async (id) => {
    await trackerApi.removeAccount(id);
    load();
  };

  // ── Jackett indexers ─────────────────────────────────────────────
  const handleAddJackett = async (id) => {
    setActionLoading(id);
    try {
      const res = await trackerApi.addJackettIndexer(id);
      if (res.success) { notify('success', `${id} ajouté ! Jackett redémarre...`); await loadJackett(); await loadAvailable(); }
      else notify('error', res.error || 'Erreur');
    } catch (e) { notify('error', e.message); }
    setActionLoading(null);
  };

  const handleRemoveJackett = async (id) => {
    if (!confirm(`Supprimer l'indexeur "${id}" de Jackett ?`)) return;
    setActionLoading(id);
    try {
      const res = await trackerApi.removeJackettIndexer(id);
      if (res.success) { notify('success', `${id} supprimé !`); await loadJackett(); await loadAvailable(); }
      else notify('error', res.error || 'Erreur');
    } catch (e) { notify('error', e.message); }
    setActionLoading(null);
  };

  const filteredAvailable = availableIndexers.filter(i =>
    !i.configured && i.id.toLowerCase().includes(searchFilter.toLowerCase())
  );
  const configuredTypes = accounts.map(a => a.tracker_type);

  if (loading) return (
    <MainLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-sp-red animate-spin" />
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <Database className="w-7 h-7 text-sp-red" />
            <h1 className="text-2xl font-bold text-white">Sources & Trackers</h1>
          </div>
        </div>

        {/* Toast */}
        {message && (
          <div className={`p-3 rounded-xl flex items-center gap-2 text-sm animate-fade-in ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {message.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {message.text}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1 — Indexeurs Jackett
        ════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-sp-red" />
              <h2 className="text-lg font-semibold text-white">Indexeurs Jackett</h2>
              <span className="px-2 py-0.5 rounded-full bg-sp-red/20 text-sp-red text-xs font-bold">
                {jackettIndexers.length}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={loadJackett} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all" title="Rafraîchir">
                <RefreshCw className={`w-4 h-4 text-zinc-400 ${jackettLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => { setShowAvailable(s => !s); }}
                className="flex items-center gap-2 px-4 py-2 bg-sp-red hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                Ajouter un indexeur
                {showAvailable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Panel ajout indexeur */}
          {showAvailable && (
            <div className="mb-4 bg-white/[0.03] border border-white/10 rounded-2xl p-5 animate-fade-in">
              <h3 className="text-white font-semibold mb-3">Indexeurs publics disponibles</h3>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Rechercher un indexeur..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-sp-red/50 transition-all"
                />
              </div>
              {availableIndexers.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-sm">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Chargement des indexeurs disponibles...
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                  {filteredAvailable.map(idx => (
                    <button
                      key={idx.id}
                      onClick={() => handleAddJackett(idx.id)}
                      disabled={actionLoading === idx.id}
                      className="flex items-center justify-between px-3 py-2.5 bg-white/[0.02] border border-white/5 rounded-xl hover:border-sp-red/30 hover:bg-sp-red/5 transition-all text-left group disabled:opacity-50"
                    >
                      <span className="text-zinc-300 text-sm font-medium truncate">{idx.id}</span>
                      {actionLoading === idx.id
                        ? <Loader2 className="w-3.5 h-3.5 text-sp-red animate-spin flex-shrink-0" />
                        : <Plus className="w-3.5 h-3.5 text-zinc-600 group-hover:text-sp-red flex-shrink-0 transition-colors" />
                      }
                    </button>
                  ))}
                  {filteredAvailable.length === 0 && (
                    <p className="col-span-3 text-center text-zinc-600 text-sm py-4">Aucun résultat pour "{searchFilter}"</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Liste indexeurs configurés */}
          {jackettLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-7 h-7 text-sp-red animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {jackettIndexers.map(idx => (
                <div key={idx.id} className="flex items-center justify-between px-5 py-3.5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${idx.status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-white font-medium text-sm">{idx.id}</span>
                    {idx.status === 'ok' && (
                      <span className="text-zinc-500 text-xs">{idx.results} résultats</span>
                    )}
                    {idx.status === 'error' && (
                      <span className="text-red-400/70 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Erreur
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveJackett(idx.id)}
                    disabled={actionLoading === idx.id}
                    className="p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="Supprimer cet indexeur"
                  >
                    {actionLoading === idx.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              ))}
              {jackettIndexers.length === 0 && (
                <div className="text-center py-10 text-zinc-600">
                  <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Aucun indexeur Jackett configuré</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2 — Comptes privés (YGG, Sharewood...)
        ════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-sp-red" />
              <h2 className="text-lg font-semibold text-white">Comptes privés</h2>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 text-xs font-bold">{accounts.length}</span>
            </div>
            <button
              onClick={() => setShowAdd(s => !s)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 text-sm font-medium rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" /> Ajouter un compte
            </button>
          </div>

          {/* Formulaire ajout compte */}
          {showAdd && (
            <div className="mb-4 bg-white/[0.03] border border-white/10 rounded-2xl p-6 animate-fade-in">
              <h3 className="text-white font-semibold mb-4">Ajouter un compte tracker</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5">Tracker</label>
                  <div className="grid grid-cols-3 gap-2">
                    {supported.filter(t => t.needsAccount).map(t => {
                      const icon = TRACKER_ICONS[t.key] || { emoji: '📦' };
                      const isSelected = addForm.trackerType === t.key;
                      const isConfigured = configuredTypes.includes(t.key);
                      return (
                        <button key={t.key} onClick={() => setAddForm({ ...addForm, trackerType: t.key })}
                          className={`p-3 rounded-xl border text-left transition-all ${isSelected ? 'border-sp-red/50 bg-sp-red/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'} ${isConfigured ? 'opacity-50' : ''}`}>
                          <span className="text-lg">{icon.emoji}</span>
                          <p className="text-white text-sm font-medium mt-1">{t.name}</p>
                          {isConfigured && <p className="text-zinc-500 text-[10px]">Déjà configuré</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 text-xs font-medium mb-1.5">Identifiant</label>
                    <input value={addForm.username} onChange={e => setAddForm({ ...addForm, username: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-sp-red/50 transition-all"
                      placeholder="Nom d'utilisateur" />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-xs font-medium mb-1.5">Mot de passe</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-sp-red/50 transition-all pr-10"
                        placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                  <Shield className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <p className="text-yellow-400/80 text-xs">Identifiants chiffrés en AES-256.</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowAdd(false); setAddForm({ trackerType: '', username: '', password: '' }); }}
                    className="px-4 py-2 bg-white/5 text-zinc-400 text-sm rounded-xl hover:bg-white/10 transition-all">Annuler</button>
                  <button onClick={handleAdd} disabled={adding || !addForm.trackerType || !addForm.username || !addForm.password}
                    className="px-4 py-2 bg-sp-red text-white text-sm font-medium rounded-xl hover:bg-red-500 transition-all disabled:opacity-40 flex items-center gap-2">
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ajouter
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Liste comptes */}
          {accounts.length === 0 && !showAdd ? (
            <div className="text-center py-10 bg-white/[0.02] border border-white/5 rounded-2xl">
              <Shield className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 mb-1">Aucun compte privé configuré</p>
              <p className="text-zinc-600 text-sm">YGG, Sharewood... nécessitent un compte</p>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map(acc => {
                const icon = TRACKER_ICONS[acc.tracker_type] || { emoji: '📦', bg: 'bg-zinc-500/10' };
                const status = STATUS_MAP[acc.status] || STATUS_MAP.inactive;
                const StatusIcon = status.icon;
                return (
                  <div key={acc.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${icon.bg} flex items-center justify-center text-2xl flex-shrink-0`}>{icon.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-semibold">{acc.tracker_type.toUpperCase()}</h3>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${status.bg} ${status.color}`}>
                            <StatusIcon className="w-3 h-3" /> {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-zinc-500 text-xs">
                          <span>👤 {acc.username}</span>
                          {acc.ratio != null && <span>📊 Ratio: {acc.ratio?.toFixed(2)}</span>}
                          {acc.last_check && <span>🕐 {new Date(acc.last_check).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleTest(acc.tracker_type)} disabled={testing === acc.tracker_type}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white/5 text-zinc-400 text-xs rounded-xl hover:bg-white/10 transition-all disabled:opacity-50">
                          {testing === acc.tracker_type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Tester
                        </button>
                        <button onClick={() => handleRemoveAccount(acc.id)}
                          className="p-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </MainLayout>
  );
}
