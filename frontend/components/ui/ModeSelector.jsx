'use client';
import { useState, useEffect } from 'react';

export default function ModeSelector() {
  const [mode, setModeState] = useState('all');
  const [lang, setLangState] = useState('fr');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setModeState(localStorage.getItem('torflix_mode') || 'all');
    setLangState(localStorage.getItem('torflix_lang') || 'fr');
  }, []);

  const applyMode = (m) => {
    setModeState(m); localStorage.setItem('torflix_mode', m);
    const token = localStorage.getItem('token');
    if (token) fetch('/api/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content_mode: m }) });
    window.dispatchEvent(new CustomEvent('torflix-mode-change', { detail: { mode: m } }));
    setOpen(false);
  };

  const applyLang = (l) => {
    setLangState(l); localStorage.setItem('torflix_lang', l);
    const token = localStorage.getItem('token');
    if (token) fetch('/api/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ language_pref: l }) });
    window.dispatchEvent(new CustomEvent('torflix-lang-change', { detail: { lang: l } }));
    setOpen(false);
  };

  const modes = [
    { id: 'all', icon: '\ud83c\udf10', label: 'Tous publics', desc: 'Tout le contenu' },
    { id: 'kids', icon: '\ud83d\udc76', label: 'Mode Enfants', desc: 'Contenu familial uniquement' },
    { id: 'adult', icon: '\ud83d\udd1e', label: 'Mode Adulte', desc: 'Contenu +18 inclus' },
  ];
  const langs = [
    { id: 'fr', label: '\ud83c\uddeb\ud83c\uddf7 Fran\u00e7ais' },
    { id: 'en', label: '\ud83c\uddec\ud83c\udde7 Anglais' },
    { id: 'all', label: '\ud83c\udf0d Toutes langues' },
  ];
  const currentMode = modes.find(m => m.id === mode);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-all">
        <span>{currentMode?.icon}</span>
        <span className="hidden lg:block text-xs">{currentMode?.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Contenu</p>
              {modes.map(m => (
                <button key={m.id} onClick={() => applyMode(m.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-all text-left ${mode === m.id ? 'bg-rose-600/20 border border-rose-500/30' : 'hover:bg-white/5'}`}>
                  <span className="text-lg">{m.icon}</span>
                  <div>
                    <p className={`text-xs font-semibold ${mode === m.id ? 'text-rose-400' : 'text-white'}`}>{m.label}</p>
                    <p className="text-[10px] text-white/40">{m.desc}</p>
                  </div>
                  {mode === m.id && <div className="ml-auto w-2 h-2 rounded-full bg-rose-500" />}
                </button>
              ))}
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Langue</p>
              {langs.map(l => (
                <button key={l.id} onClick={() => applyLang(l.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg mb-1 text-xs transition-all ${lang === l.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-white hover:bg-white/5'}`}>
                  {l.label}
                  {lang === l.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
