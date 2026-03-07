import { useState } from 'react';
import { ArrowLeft, Tv, Wifi, Monitor, Download, CheckCircle2, AlertTriangle, ChevronRight, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TizenGuide() {
  const nav = useNavigate();
  const [copied, setCopied] = useState('');

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="min-h-screen bg-bg text-white pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-bg/80 to-bg" />
        <div className="relative px-4 pt-4 pb-6 safe-top">
          <button onClick={() => nav(-1)} className="p-2 rounded-full bg-white/10 mb-4">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 flex items-center justify-center">
              <Tv className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Samsung TV (Tizen)</h1>
              <p className="text-zinc-400 text-xs">Guide d'installation de l'app</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">

        {/* Prérequis */}
        <Section title="📋 Prérequis" color="amber">
          <Item n="1" text="Un PC Windows (ou Linux/Mac)" />
          <Item n="2" text="Samsung TV connectée au même Wi-Fi que le PC" />
          <Item n="3" text="Tizen Studio installé sur le PC" />
        </Section>

        {/* Étape 1 */}
        <Section title="🔧 Étape 1 — Activer le mode développeur sur la TV" color="blue">
          <Item n="1" text="Sur la TV, ouvrez le menu Applications" />
          <Item n="2" text="Avec la télécommande, appuyez: 1 → 2 → 3 → 4 → 5 (rapidement)" />
          <Item n="3" text='Un popup "Developer Mode" apparaît' />
          <Item n="4" text="Activez le switch ON" />
          <Item n="5" text="Entrez l'adresse IP de votre PC:" />
          <div className="ml-9 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-xs text-blue-400 mb-2">Pour trouver l'IP du PC, ouvrez CMD et tapez:</p>
            <CodeBlock text="ipconfig" onCopy={copy} copied={copied} />
            <p className="text-[10px] text-zinc-500 mt-1">Prenez l'adresse IPv4 (ex: 192.168.1.xx)</p>
          </div>
          <Item n="6" text="Redémarrez la TV" />
        </Section>

        {/* Étape 2 */}
        <Section title="💻 Étape 2 — Installer Tizen Studio sur le PC" color="green">
          <Item n="1" text="Téléchargez Tizen Studio:" />
          <div className="ml-9">
            <a href="https://developer.tizen.org/development/tizen-studio/download"
              target="_blank" rel="noopener"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-xl text-xs font-medium">
              <Download className="w-4 h-4" /> developer.tizen.org <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          <Item n="2" text="Installez (acceptez tous les defaults)" />
          <Item n="3" text='Ouvrez "Package Manager" et installez:' />
          <div className="ml-9 p-3 bg-surface rounded-xl space-y-1">
            <p className="text-xs text-zinc-300">✅ Tizen SDK Tools</p>
            <p className="text-xs text-zinc-300">✅ TV Extensions (Samsung)</p>
            <p className="text-xs text-zinc-300">✅ Samsung Certificate Extension</p>
          </div>
        </Section>

        {/* Étape 3 */}
        <Section title="🔗 Étape 3 — Connecter la TV" color="cyan">
          <Item n="1" text="Trouvez l'IP de la TV:" />
          <div className="ml-9 p-3 bg-surface rounded-xl">
            <p className="text-xs text-zinc-400">TV → Paramètres → Général → Réseau → État du réseau → Paramètres IP</p>
          </div>
          <Item n="2" text="Ouvrez Device Manager dans Tizen Studio" />
          <Item n="3" text='Cliquez "Remote Device Manager" → "Scan"' />
          <Item n="4" text="Ou ajoutez manuellement avec l'IP de la TV:" />
          <div className="ml-9">
            <CodeBlock text="sdb connect <IP_TV>" onCopy={copy} copied={copied} />
          </div>
          <Item n="5" text='La TV doit afficher "Connecté"' />
        </Section>

        {/* Étape 4 */}
        <Section title="📜 Étape 4 — Créer un certificat Samsung" color="yellow">
          <Item n="1" text='Tizen Studio → Tools → Certificate Manager' />
          <Item n="2" text='Cliquez "+" → Samsung → TV' />
          <Item n="3" text='Device type: choisissez votre TV connectée' />
          <Item n="4" text='Créez un certificat auteur (Author Certificate)' />
          <Item n="5" text='Puis un certificat distributeur (Distributor Certificate)' />
          <div className="ml-9 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-[10px] text-amber-400">⚠️ Le DUID de votre TV doit être dans le certificat. Tizen Studio le détecte automatiquement si la TV est connectée.</p>
          </div>
        </Section>

        {/* Étape 5 */}
        <Section title="📦 Étape 5 — Télécharger et installer l'app" color="red">
          <Item n="1" text="Téléchargez le fichier .wgt:" />
          <div className="ml-9">
            <a href="/torflix-tv.wgt" download
              className="inline-flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform">
              <Download className="w-5 h-5" /> torflix-tv.wgt
            </a>
          </div>
          <Item n="2" text="Dans Tizen Studio, ouvrez le terminal et lancez:" />
          <div className="ml-9 space-y-2">
            <CodeBlock text="cd C:\Users\VOTRE_NOM\Downloads" onCopy={copy} copied={copied} />
            <CodeBlock text="tizen install -n torflix-tv.wgt -t <NOM_TV>" onCopy={copy} copied={copied} />
          </div>
          <Item n="3" text="Ou utilisez Device Manager: clic droit sur la TV → Install Application → choisir le .wgt" />
          <Item n="4" text="L'app TorFlix apparaît dans les applications de la TV ! 🎉" />
        </Section>

        {/* Alternative rapide */}
        <div className="p-4 bg-surface rounded-2xl border border-white/5">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Alternative rapide (sans Tizen Studio)
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-3">
            Si vous ne voulez pas installer Tizen Studio, utilisez simplement le navigateur de la TV:
          </p>
          <div className="space-y-2">
            <Item n="1" text="Sur la TV, ouvrez Internet (le navigateur Samsung)" />
            <Item n="2" text="Tapez torfix.xyz dans la barre d'adresse" />
            <Item n="3" text='Ajoutez aux favoris (⭐) pour un accès rapide' />
          </div>
        </div>

        {/* Dépannage */}
        <div className="p-4 bg-surface rounded-2xl border border-white/5">
          <h3 className="text-sm font-bold mb-3">🔧 Dépannage</h3>
          <div className="space-y-3 text-xs text-zinc-400">
            <div>
              <p className="text-zinc-300 font-medium">La TV ne se connecte pas</p>
              <p>Vérifiez que TV et PC sont sur le même Wi-Fi. Redémarrez la TV après avoir activé le mode dev.</p>
            </div>
            <div>
              <p className="text-zinc-300 font-medium">Erreur de certificat</p>
              <p>Supprimez l'ancien certificat et recréez-en un avec le DUID correct de la TV.</p>
            </div>
            <div>
              <p className="text-zinc-300 font-medium">L'app s'installe mais écran noir</p>
              <p>Vérifiez que la TV a accès à internet et que torfix.xyz est accessible.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function Section({ title, color, children }) {
  const colors = { amber: 'border-amber-600/20', blue: 'border-blue-600/20', green: 'border-green-600/20',
    cyan: 'border-cyan-600/20', yellow: 'border-yellow-600/20', red: 'border-red-600/20' };
  return (
    <div className={`p-4 bg-surface rounded-2xl border ${colors[color] || 'border-white/5'} space-y-3`}>
      <h3 className="text-sm font-bold">{title}</h3>
      {children}
    </div>
  );
}

function Item({ n, text }) {
  return (
    <div className="flex gap-3 ml-1">
      <span className="flex-shrink-0 w-5 h-5 bg-red-600/20 text-red-400 text-[10px] font-bold rounded-full flex items-center justify-center mt-0.5">{n}</span>
      <p className="text-xs text-zinc-300 leading-relaxed">{text}</p>
    </div>
  );
}

function CodeBlock({ text, onCopy, copied }) {
  return (
    <div className="flex items-center gap-2 p-2.5 bg-black/50 rounded-lg font-mono">
      <code className="flex-1 text-[11px] text-green-400 break-all">{text}</code>
      <button onClick={() => onCopy(text)}
        className={`flex-shrink-0 p-1.5 rounded-md ${copied === text ? 'bg-green-600/20 text-green-400' : 'bg-white/5 text-zinc-500 hover:text-white'}`}>
        {copied === text ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
