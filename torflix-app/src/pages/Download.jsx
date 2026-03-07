import { useState, useEffect } from 'react';
import { ArrowLeft, Smartphone, Monitor, Tv, Apple, Download, ExternalLink, ChevronDown, CheckCircle2, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DOMAIN = 'torfix.xyz';

export default function DownloadPage() {
  const nav = useNavigate();
  const [expanded, setExpanded] = useState(null);
  const [platform, setPlatform] = useState('');

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) setPlatform('ios');
    else if (/Android/.test(ua)) setPlatform('android');
    else if (/Tizen|SMART-TV|SmartTV/.test(ua)) setPlatform('tv');
    else setPlatform('desktop');
  }, []);

  const platforms = [
    {
      id: 'android',
      icon: '🤖',
      name: 'Android',
      subtitle: 'Téléphone & Tablette',
      color: 'from-green-600 to-green-800',
      badge: 'APK',
      action: { label: 'Télécharger APK', href: '/torflix.apk', download: true },
      steps: [
        'Téléchargez le fichier APK ci-dessus',
        'Ouvrez le fichier téléchargé',
        'Si demandé, autorisez "Sources inconnues" dans les paramètres',
        'Appuyez sur Installer',
        'L\'app TorFlix apparaît sur votre écran d\'accueil !'
      ],
    },
    {
      id: 'ios',
      icon: '🍎',
      name: 'iPhone / iPad',
      subtitle: 'iOS 14+',
      color: 'from-zinc-600 to-zinc-800',
      badge: 'PWA',
      action: null,
      steps: [
        `Ouvrez Safari et allez sur ${DOMAIN}`,
        'Appuyez sur l\'icône Partager (⬆️) en bas de l\'écran',
        'Faites défiler et appuyez sur "Sur l\'écran d\'accueil"',
        'Confirmez en appuyant "Ajouter"',
        'TorFlix est maintenant sur votre écran d\'accueil comme une vraie app !'
      ],
      note: '⚠️ Utilisez Safari uniquement (Chrome iOS ne supporte pas les PWA)',
    },
    {
      id: 'android-tv',
      icon: '📺',
      name: 'Android TV',
      subtitle: 'Smart TV / Box Android / Chromecast',
      color: 'from-blue-600 to-blue-800',
      badge: 'APK',
      action: { label: 'Télécharger APK TV', href: '/torflix.apk', download: true },
      steps: [
        'Sur votre TV, installez "Downloader" depuis le Play Store',
        `Dans Downloader, entrez: ${DOMAIN}/torflix.apk`,
        'Le téléchargement commence automatiquement',
        'Appuyez sur Installer quand demandé',
        'Ou: envoyez le APK via clé USB et ouvrez-le avec un gestionnaire de fichiers'
      ],
    },
    {
      id: 'samsung',
      icon: '📡',
      name: 'Samsung TV (Tizen)',
      subtitle: 'Smart TV Samsung 2017+',
      color: 'from-purple-600 to-purple-800',
      badge: 'Web App',
      action: null,
      steps: [
        'Sur votre Samsung TV, ouvrez le navigateur Internet',
        `Allez sur ${DOMAIN}`,
        'Appuyez sur ⭐ (Favoris) puis "Ajouter aux signets"',
        'Ou: allez dans Menu → Ajouter à l\'écran d\'accueil',
        'L\'interface s\'adapte automatiquement à votre TV avec la télécommande'
      ],
      action: { label: 'Guide d\'installation', href: '/tv-guide', download: false },
      note: 'Méthode rapide: ouvrez torfix.xyz dans le navigateur Samsung',
    },
    {
      id: 'lg',
      icon: '📡',
      name: 'LG TV (WebOS)',
      subtitle: 'Smart TV LG 2018+',
      color: 'from-red-700 to-red-900',
      badge: 'Web App',
      action: null,
      steps: [
        'Sur votre LG TV, ouvrez le navigateur Web',
        `Allez sur ${DOMAIN}`,
        'Appuyez sur ⭐ puis "Ajouter aux favoris"',
        'Accédez rapidement depuis vos favoris à chaque fois',
      ],
    },
    {
      id: 'desktop',
      icon: '💻',
      name: 'PC / Mac',
      subtitle: 'Chrome, Edge, Firefox',
      color: 'from-cyan-600 to-cyan-800',
      badge: 'PWA',
      action: { label: 'Ouvrir TorFlix', href: '/', download: false },
      steps: [
        `Ouvrez Chrome/Edge et allez sur ${DOMAIN}`,
        'Cliquez sur l\'icône ⊕ dans la barre d\'adresse (à droite)',
        'Cliquez "Installer TorFlix"',
        'L\'app s\'ouvre dans sa propre fenêtre, sans barre d\'adresse'
      ],
    },
  ];

  // Sort: detected platform first
  const sorted = [...platforms].sort((a, b) => {
    if (a.id === platform) return -1;
    if (b.id === platform) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/30 via-bg/80 to-bg" />
        <div className="relative px-4 pt-4 pb-8 safe-top">
          <button onClick={() => nav(-1)} className="p-2 rounded-full bg-white/10 mb-4">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <img src="/icons/icon-128x128.png" alt="TorFlix" className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-lg shadow-red-600/20" />
            <h1 className="text-2xl font-extrabold mb-1">Télécharger TorFlix</h1>
            <p className="text-zinc-400 text-sm">Disponible sur tous vos appareils</p>
          </div>
        </div>
      </div>

      {/* Platform cards */}
      <div className="px-4 pb-24 space-y-3">
        {sorted.map((p) => {
          const isDetected = p.id === platform;
          const isExpanded = expanded === p.id;

          return (
            <div key={p.id}
              className={`rounded-2xl overflow-hidden border transition-all ${isDetected ? 'border-red-600/50 ring-1 ring-red-600/20' : 'border-white/5'}`}>

              {/* Card header */}
              <div
                className={`bg-gradient-to-r ${p.color} p-4 cursor-pointer`}
                onClick={() => setExpanded(isExpanded ? null : p.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{p.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold">{p.name}</h3>
                      <span className="px-1.5 py-0.5 bg-white/20 rounded text-[9px] font-bold">{p.badge}</span>
                      {isDetected && (
                        <span className="px-2 py-0.5 bg-red-600 rounded-full text-[9px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Votre appareil
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-xs mt-0.5">{p.subtitle}</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-white/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="bg-surface p-4">
                  {/* Download button */}
                  {p.action && (
                    <a href={p.action.href} download={p.action.download || undefined}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 text-white font-bold rounded-xl text-sm mb-4 active:scale-95 transition-transform">
                      <Download className="w-5 h-5" />
                      {p.action.label}
                    </a>
                  )}

                  {/* Steps */}
                  <div className="space-y-3">
                    {p.steps.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-red-600/20 text-red-400 text-xs font-bold rounded-full flex items-center justify-center">{i + 1}</span>
                        <p className="text-xs text-zinc-300 leading-relaxed pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>

                  {/* Note */}
                  {p.note && (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <p className="text-[11px] text-amber-400">{p.note}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* QR Code section */}
        <div className="mt-6 p-4 bg-surface rounded-2xl border border-white/5 text-center">
          <Wifi className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
          <p className="text-sm font-bold mb-1">Partager avec un autre appareil</p>
          <p className="text-xs text-zinc-500 mb-3">Scannez ce QR code ou partagez le lien</p>
          <div className="bg-white p-3 rounded-xl inline-block mb-3">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://${DOMAIN}/download&bgcolor=ffffff&color=000000`}
              alt="QR Code" className="w-[150px] h-[150px]" />
          </div>
          <p className="text-xs text-zinc-400">https://{DOMAIN}</p>
        </div>
      </div>
    </div>
  );
}
