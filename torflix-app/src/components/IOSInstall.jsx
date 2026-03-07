import { useState, useEffect } from 'react';
import { X, Share, Plus, ArrowDown } from 'lucide-react';

export default function IOSInstall() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    const dismissed = localStorage.getItem('torflix_pwa_dismissed');
    if (dismissed) return;

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (isStandalone) return; // Already installed

    if (isIOS) { setPlatform('ios'); setShow(true); }
    else if (isAndroid) { setPlatform('android'); setShow(true); }
    else if (!window.matchMedia('(display-mode: standalone)').matches) {
      // Desktop Chrome/Edge
      setPlatform('desktop'); setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('torflix_pwa_dismissed', Date.now().toString());
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9999] animate-slide-up">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/50">
        <button onClick={dismiss} className="absolute top-3 right-3 p-1 text-zinc-500">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <img src="/icons/icon-96x96.png" alt="TorFlix" className="w-12 h-12 rounded-xl" />
          <div>
            <h3 className="text-white font-bold text-sm">Installer TorFlix</h3>
            <p className="text-zinc-500 text-[10px]">Accès rapide depuis l'écran d'accueil</p>
          </div>
        </div>

        {platform === 'ios' && (
          <div className="space-y-2.5">
            <Step n="1" icon="🔗" text={<>Appuyez sur <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-blue-500/20 rounded text-blue-400 text-[10px]"><Share className="w-3 h-3 mr-1" />Partager</span> en bas de Safari</>} />
            <Step n="2" icon="➕" text={<>Faites défiler et appuyez sur <span className="inline-flex items-center mx-1 px-1.5 py-0.5 bg-white/10 rounded text-white text-[10px]"><Plus className="w-3 h-3 mr-1" />Sur l'écran d'accueil</span></>} />
            <Step n="3" icon="✅" text="Confirmez en appuyant «Ajouter»" />
          </div>
        )}

        {platform === 'android' && (
          <div className="space-y-2">
            <a href="/torflix.apk" download
              className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 text-white font-bold rounded-xl text-sm active:scale-95 transition-transform">
              <ArrowDown className="w-5 h-5" /> Télécharger l'APK Android
            </a>
            <p className="text-[10px] text-zinc-500 text-center">ou ajoutez à l'écran d'accueil depuis le menu ⋮ de Chrome</p>
          </div>
        )}

        {platform === 'desktop' && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400">Cliquez sur l'icône <span className="px-1.5 py-0.5 bg-white/10 rounded text-white text-[10px]">⊕ Installer</span> dans la barre d'adresse de Chrome</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-up { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.4s ease-out; }
      `}</style>
    </div>
  );
}

function Step({ n, icon, text }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex-shrink-0 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{n}</span>
      <p className="text-xs text-zinc-300 leading-relaxed">{text}</p>
    </div>
  );
}
