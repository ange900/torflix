'use client';
import { useState } from 'react';

const LC = { VF: 'bg-blue-600', VOSTFR: 'bg-purple-600', MULTI: 'bg-green-600', VO: 'bg-zinc-600' };
const QC = { '4K': 'bg-amber-600', '1080p': 'bg-green-700', '720p': 'bg-blue-700', DVD: 'bg-zinc-600', CAM: 'bg-red-800' };

function SeedBadge({ count }) {
  let color = count > 100 ? 'text-green-400' : count > 10 ? 'text-orange-400' : 'text-red-400';
  return <span className={`${color} font-mono font-bold`}>⬆ {count}</span>;
}

export default function TorrentList({ torrents = [], onSelect, selectedIndex = -1, isLoading = false }) {
  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /><span className="ml-3 text-zinc-400">Recherche des sources...</span></div>;
  if (!torrents.length) return <div className="text-center py-12 text-zinc-500"><p className="text-4xl mb-3">🔍</p><p>Aucun torrent trouvé</p></div>;

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">Sources disponibles <span className="text-zinc-500 text-sm">({torrents.length})</span></h3>
      <div className="space-y-2">
        {torrents.map((t, i) => {
          const hasSource = t.magnet || t.downloadUrl;
          return (
            <button key={i} onClick={() => hasSource && onSelect?.(t, i)} className={`w-full text-left p-4 rounded-xl border transition-all ${!hasSource ? 'opacity-40 cursor-not-allowed border-zinc-800 bg-zinc-900/30' : t.isBest ? 'border-red-500/50 bg-red-500/10 hover:bg-red-500/20' : selectedIndex === i ? 'border-blue-500/50 bg-blue-500/10' : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/70'}`}>
              {t.isBest && <div className="mb-2"><span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">★ Meilleur choix</span></div>}
              <p className="text-white text-sm font-medium leading-tight mb-2 line-clamp-2">{t.title}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${LC[t.language]||'bg-zinc-700'} text-white text-xs px-2 py-0.5 rounded font-semibold`}>{t.language}</span>
                <span className={`${QC[t.quality]||'bg-zinc-700'} text-white text-xs px-2 py-0.5 rounded`}>{t.quality}</span>
                <span className="text-zinc-400 text-xs">{t.size}</span>
                <span className="text-zinc-500 text-xs">{t.source}</span>
                {!t.magnet && t.downloadUrl && <span className="text-yellow-500/70 text-xs">📦 .torrent</span>}
                <div className="flex-1" />
                <SeedBadge count={t.seeders} />
                {t.leechers > 0 && <span className="text-orange-400/60 text-xs font-mono">⬇ {t.leechers}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
