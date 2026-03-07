import axios from 'axios';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const CACHE_TTL = 7200;
const JACKETT_URL = process.env.JACKETT_URL || 'http://jackett:9117';
const JACKETT_KEY = process.env.JACKETT_API_KEY || '1gu7miltp8zwwoxakpyho2qelhsna0vg';

function detectLanguage(title) {
  const t = title.toUpperCase();
  if (/\bMULTI\b/.test(t)) return 'MULTI';
  if (/\bTRUEFRENCH\b|\bFRENCH\b|\b(VFF|VFQ|VF2|VFI)\b/.test(t)) return 'VF';
  if (/\bVOSTFR\b|\bSUBFRENCH\b/.test(t)) return 'VOSTFR';
  if (/\bVF\b/.test(t)) return 'VF';
  return 'VO';
}

function detectQuality(title) {
  const t = title.toUpperCase();
  if (/\b4K\b|\b2160P?\b|\bUHD\b/.test(t)) return '4K';
  if (/\b1080P?\b|\bFULLHD\b/.test(t)) return '1080p';
  if (/\b720P?\b|\bHD\b/.test(t)) return '720p';
  if (/\bHDRIP\b|\bBDRIP\b|\bBLURAY\b|\bWEBRIP\b|\bWEB-?DL\b/.test(t)) return '1080p';
  if (/\bDVDRIP\b|\bDVD\b/.test(t)) return 'DVD';
  if (/\bCAM\b|\bTS\b|\bTELESYNC\b/.test(t)) return 'CAM';
  return 'Unknown';
}

function formatSize(bytes) {
  if (!bytes) return 'N/A';
  if (bytes >= 1024**3) return (bytes / 1024**3).toFixed(1) + ' GB';
  if (bytes >= 1024**2) return (bytes / 1024**2).toFixed(0) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}


// Résout un lien Jackett /dl/ → redirect magnet:
async function resolveMagnetFromUrl(url) {
  if (!url) return null;
  if (url.startsWith('magnet:')) return url;
  try {
    await axios.get(url, { maxRedirects: 0, validateStatus: s => s >= 200 && s < 400, timeout: 5000 });
    return null;
  } catch (err) {
    const loc = err.response?.headers?.location;
    if (loc?.startsWith('magnet:')) return loc;
    return null;
  }
}

async function searchJackett(query, categories) {
  try {
    console.log('[Jackett] Searching:', query);
    const { data } = await axios.get(JACKETT_URL + '/api/v2.0/indexers/all/results', {
      params: { apikey: JACKETT_KEY, Query: query, 'Category[]': categories },
      timeout: 35000,
    });
    const rawResults = (data.Results || []).map(item => ({
      title: item.Title || '',
      seeders: item.Seeders || 0,
      leechers: item.Peers ? item.Peers - (item.Seeders || 0) : 0,
      size: formatSize(item.Size || 0),
      sizeBytes: item.Size || 0,
      quality: detectQuality(item.Title || ''),
      language: detectLanguage(item.Title || ''),
      source: item.Tracker || 'Jackett',
      magnet: item.MagnetUri || null,
      downloadUrl: item.Link || null,
      detailUrl: item.Details || null,
    }));
    // Résoudre seulement les top 15 par seeders (évite 100+ requêtes)
    const withMagnet = rawResults.filter(r => r.magnet);
    const withoutMagnet = rawResults.filter(r => !r.magnet && r.downloadUrl)
      .sort((a,b) => b.seeders - a.seeders)
      .slice(0, 15);
    
    const resolved = await Promise.all(withoutMagnet.map(async r => {
      const mag = await resolveMagnetFromUrl(r.downloadUrl);
      if (mag) r.magnet = mag;
      return r;
    }));
    const results = [...withMagnet, ...resolved];
    const filtered = results.filter(r => r.seeders > 0 && (r.magnet || r.downloadUrl));
    console.log('[Jackett] Found', filtered.length, 'results');
    return filtered;
  } catch (err) {
    console.error('[Jackett] Error:', err.message);
    return [];
  }
}

export async function searchTorrents(query, options = {}) {
  const { category = 'Movies', language, quality, minSeeders = 0 } = options;
  const cacheKey = 'torrent:search:' + query + ':' + category;
  const cached = await redis.get(cacheKey);
  if (cached) return applyFilters(JSON.parse(cached), { language, quality, minSeeders });

  const cats = category === 'TV' ? [5000, 5070] : [2000, 2010, 2020, 2030, 2040, 2045, 2050];
  let results = await searchJackett(query, cats);

  const seen = new Set();
  results = results.filter(r => {
    const k = r.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Sort: magnet first, then by seeders
  results.sort((a, b) => {
    if (a.magnet && !b.magnet) return -1;
    if (!a.magnet && b.magnet) return 1;
    return b.seeders - a.seeders;
  });

  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results));
  return applyFilters(results, { language, quality, minSeeders });
}

function applyFilters(results, { language, quality, minSeeders }) {
  let filtered = results.filter(r => {
    if (quality && quality !== 'all' && r.quality !== quality) return false;
    if (minSeeders && r.seeders < minSeeders) return false;
    return true;
  });

  // Filtre langue — si aucun résultat, retourner tout
  if (language && language !== 'all') {
    const langFiltered = filtered.filter(r => r.language === language || r.language === 'MULTI');
    if (langFiltered.length > 0) return langFiltered;
    // Fallback : retourner tous les résultats si pas de source dans la langue demandée
  }
  return filtered;
}

export function selectBestTorrent(torrents, preferredLang) {
  preferredLang = preferredLang || 'VF';
  // Only consider torrents with magnet
  const withMagnet = (torrents || []).filter(function(t) { return t.magnet; });
  if (!withMagnet.length) return null;

  var best = null;
  var bestScore = -999;
  for (var i = 0; i < withMagnet.length; i++) {
    var t = withMagnet[i];
    var score = 0;
    if (t.language === preferredLang) score += 100;
    if (t.language === 'MULTI') score += 80;
    if (t.language === 'VOSTFR') score += 50;
    if (t.quality === '4K') score += 40;
    else if (t.quality === '1080p') score += 35;
    else if (t.quality === '720p') score += 25;
    else if (t.quality === 'DVD') score += 10;
    else if (t.quality === 'CAM') score -= 50;
    score += Math.min(Math.log2(t.seeders + 1) * 5, 30);
    if (t.sizeBytes > 20 * 1024 * 1024 * 1024) score -= 10;
    // Penalize x265/HEVC (needs heavy transcoding)
    var tUp = t.title.toUpperCase();
    if (tUp.includes('X265') || tUp.includes('HEVC') || tUp.includes('H.265')) score -= 30;
    // Bonus for MP4 (no transcoding needed)
    if (tUp.includes('.MP4') || tUp.includes('X264') || tUp.includes('H.264')) score += 15;
    // Penalize 4K (too big, needs transcoding)
    if (t.quality === '4K') score -= 20;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

export async function get1337xMagnet(detailUrl) { return null; }
