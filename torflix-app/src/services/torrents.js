function detectLanguage(title) {
  const t = title.toUpperCase();
  if (/\b(MULTI)\b/.test(t)) return { label: 'MULTI', color: 'text-purple-400 border-purple-400' };
  if (/\b(TRUEFRENCH|FRENCH|VFF|VFQ|VF)\b/.test(t)) return { label: 'FR', color: 'text-blue-400 border-blue-400' };
  if (/\bVOSTFR\b/.test(t)) return { label: 'VOSTFR', color: 'text-cyan-400 border-cyan-400' };
  return { label: 'VO', color: 'text-zinc-400 border-zinc-400' };
}

function detectQuality(title) {
  const t = title.toUpperCase();
  if (/2160P|4K|UHD/.test(t)) return '2160p';
  if (/1080P/.test(t)) return '1080p';
  if (/720P/.test(t)) return '720p';
  if (/DVDRIP|BDRIP/.test(t)) return 'DVDRip';
  if (/HDLIGHT/.test(t)) return 'HDLight';
  if (/WEBRIP|WEB-DL|WEBDL/.test(t)) return 'WEB-DL';
  return 'SD';
}

async function searchYTS(query) {
  try {
    const res = await fetch('https://torfix.xyz/yts-api/list_movies.json?query_term=' + encodeURIComponent(query) + '&limit=20&sort_by=seeds');
    const data = await res.json();
    if (!data.data || !data.data.movies) return [];
    return data.data.movies.flatMap(m =>
      (m.torrents || []).map(t => {
        const title = m.title + ' (' + m.year + ') [' + t.quality + '] [' + t.type + ']';
        const lang = detectLanguage(title);
        return {
          title,
          magnet: 'magnet:?xt=urn:btih:' + t.hash + '&dn=' + encodeURIComponent(m.title) + '&tr=udp://tracker.opentrackr.org:1337&tr=udp://open.stealth.si:80/announce',
          quality: t.quality,
          size: t.size,
          seeders: t.seeds,
          leechers: t.peers,
          source: 'YTS',
          year: m.year,
          hash: t.hash,
          lang: lang.label,
          langColor: lang.color,
        };
      })
    );
  } catch (e) { return []; }
}

async function searchJackett(query) {
  try {
    const res = await fetch('https://torfix.xyz/jackett-api/?q=' + encodeURIComponent(query));
    const data = await res.json();
    return (data.results || []).map(r => {
      const lang = detectLanguage(r.title);
      const quality = detectQuality(r.title);
      return {
        title: r.title,
        magnet: r.magnet || '',
        downloadUrl: r.downloadUrl || '',
        quality,
        size: r.size,
        seeders: r.seeders,
        leechers: r.leechers,
        source: r.source,
        lang: lang.label,
        langColor: lang.color,
      };
    });
  } catch (e) { return []; }
}

export async function searchTorrents(query, type) {
  const [yts, jackett] = await Promise.all([searchYTS(query), searchJackett(query)]);
  const all = [...yts, ...jackett];
  const langOrder = { FR: 0, MULTI: 1, VOSTFR: 2, VO: 3 };
  return all.sort((a, b) => {
    const la = langOrder[a.lang] !== undefined ? langOrder[a.lang] : 3;
    const lb = langOrder[b.lang] !== undefined ? langOrder[b.lang] : 3;
    if (la !== lb) return la - lb;
    return b.seeders - a.seeders;
  });
}

export function buildMagnet(hash, title) {
  return 'magnet:?xt=urn:btih:' + hash + '&dn=' + encodeURIComponent(title) + '&tr=udp://tracker.opentrackr.org:1337/announce';
}
