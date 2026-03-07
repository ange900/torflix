'use client';
import { useState } from 'react';
import { Download, ExternalLink, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';

const APPS = [
  {
    id: 'android',
    icon: '📱',
    title: 'Application Android',
    subtitle: 'Smartphones et tablettes Android',
    color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20',
    file: '/torflix.apk', size: '~15 MB', version: '1.0.0',
    features: ['Lecture vidéo native ExoPlayer', 'Mode hors-ligne', 'Notifications push', 'Interface tactile optimisée'],
    steps: ['Téléchargez le fichier .apk', 'Allez dans Paramètres → Sécurité', 'Activez "Sources inconnues"', 'Ouvrez le fichier .apk téléchargé', 'Suivez l\'installation'],
  },
  {
    id: 'androidtv',
    icon: '📦',
    title: 'Boîtier Android TV',
    subtitle: 'Android TV Box, Nvidia Shield, Mi Box...',
    color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20',
    file: '/torflix.apk', size: '~15 MB', version: '1.0.0',
    features: ['Interface TV optimisée', 'Télécommande compatible', 'Navigation D-pad', 'Qualité 4K/HDR'],
    steps: [
      'Sur votre box Android TV, ouvrez le navigateur ou ES File Explorer',
      'Allez dans Paramètres → Sécurité → Sources inconnues : Activer',
      'Téléchargez le .apk depuis torfix.xyz/telecharger',
      'Ouvrez le fichier téléchargé et installez',
      'Alternative : utilisez ADB — adb connect [IP-BOX] puis adb install torflix.apk',
    ],
  },
  {
    id: 'apple',
    icon: '🍎',
    title: 'iPhone / iPad (iOS)',
    subtitle: 'Via PWA — aucune app store requise',
    color: 'text-zinc-300', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20',
    file: null, version: null, size: null,
    features: ['Installation directe Safari', 'Aucun jailbreak requis', 'Mise à jour automatique', 'Accès hors-ligne partiel'],
    steps: [
      'Ouvrez torfix.xyz dans Safari (pas Chrome)',
      'Appuyez sur le bouton Partager □↑',
      'Sélectionnez "Sur l\'écran d\'accueil"',
      'Confirmez l\'ajout → TorFlix apparaît comme une app native',
    ],
  },
  {
    id: 'appletv',
    icon: '🖥️',
    title: 'Apple TV / Mac',
    subtitle: 'Via navigateur web — Safari compatible',
    color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
    file: null, version: null, size: null,
    features: ['Accès via navigateur', 'Qualité adaptative', 'Interface responsive', 'Aucune installation'],
    steps: [
      'Sur Apple TV : ouvrez l\'app Navigateur ou utilisez AirPlay depuis iPhone',
      'Sur Mac : ouvrez torfix.xyz dans Safari ou Chrome',
      'Pour Mac — installez comme PWA : Safari → Fichier → "Ajouter au dock"',
      'Ou utilisez Chrome : ⋮ → "Installer TorFlix"',
    ],
  },
  {
    id: 'samsung',
    icon: '📺',
    title: 'Samsung Smart TV',
    subtitle: 'Pour Samsung Smart TV (Tizen 4.0+)',
    color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
    file: '/torflix.wgt', size: '~5 MB', version: '1.0.0',
    features: ['Interface TV optimisée', 'Télécommande Samsung', 'Qualité 4K/HDR', 'Navigation D-pad'],
    steps: [
      'Téléchargez le fichier .wgt sur votre PC',
      'Installez Tizen Studio sur votre PC',
      'Activez le mode développeur sur votre TV : Apps → 12345 → Activer',
      'Connectez : sdb connect [IP-TV]',
      'Installez : tizen install -s [DUID] -n torflix.wgt',
    ],
    guideUrl: '/tv-guide',
  },
  {
    id: 'pwa',
    icon: '🌐',
    title: 'Application Web (PWA)',
    subtitle: 'Tous appareils — directement depuis le navigateur',
    color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20',
    file: null, version: null, size: null,
    features: ['Aucun téléchargement', 'Toujours à jour', 'Tous navigateurs', 'Accès hors-ligne partiel'],
    steps: [
      'Ouvrez torfix.xyz dans Chrome ou Edge',
      'Cliquez sur ⋮ → "Installer l\'application"',
      'L\'app s\'installe comme une app native',
      'Retrouvez-la dans vos applications installées',
    ],
  },
];

export default function TelechargerPage() {
  const [openSteps, setOpenSteps] = useState({});
  const toggle = (id) => setOpenSteps(s => ({ ...s, [id]: !s[id] }));

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-sp-red/10 flex items-center justify-center mx-auto mb-4">
            <Download className="w-8 h-8 text-sp-red" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Télécharger TorFlix</h1>
          <p className="text-zinc-400">Disponible sur toutes vos plateformes</p>
        </div>

        <div className="space-y-4">
          {APPS.map(app => (
            <div key={app.id} className={`bg-white/[0.02] border ${app.border} rounded-2xl overflow-hidden`}>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${app.bg} flex items-center justify-center text-3xl flex-shrink-0`}>
                      {app.icon}
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-lg">{app.title}</h2>
                      <p className="text-zinc-400 text-sm">{app.subtitle}</p>
                      {app.version && <p className="text-zinc-600 text-xs mt-1">v{app.version} · {app.size}</p>}
                    </div>
                  </div>
                  {app.file ? (
                    <a href={app.file} download className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-sp-red hover:bg-red-500 text-white font-medium rounded-xl transition-all text-sm">
                      <Download className="w-4 h-4" /> Télécharger
                    </a>
                  ) : (
                    <a href="https://torfix.xyz" target="_blank" className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 ${app.bg} ${app.color} font-medium rounded-xl transition-all text-sm border ${app.border}`}>
                      <ExternalLink className="w-4 h-4" /> Ouvrir
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-5">
                  {app.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-zinc-400 text-sm">
                      <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${app.color}`} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
              <div className={`border-t ${app.border}`}>
                <button onClick={() => toggle(app.id)} className="w-full flex items-center justify-between px-6 py-3 text-zinc-400 hover:text-white text-sm transition-colors">
                  <span>Guide d'installation</span>
                  {openSteps[app.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {openSteps[app.id] && (
                  <div className="px-6 pb-5">
                    <ol className="space-y-2">
                      {app.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                          <span className={`flex-shrink-0 w-5 h-5 rounded-full ${app.bg} ${app.color} flex items-center justify-center text-xs font-bold`}>{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                    {app.guideUrl && (
                      <a href={app.guideUrl} target="_blank" className={`inline-flex items-center gap-2 mt-4 text-sm ${app.color} hover:underline`}>
                        <ExternalLink className="w-3.5 h-3.5" /> Voir le guide complet
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-zinc-600 text-xs mt-8">TorFlix est un projet personnel. Utilisez-le de manière responsable.</p>
      </div>
    </MainLayout>
  );
}
