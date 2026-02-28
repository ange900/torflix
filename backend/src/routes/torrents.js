const router = require('express').Router();
const axios = require('axios');
const cheerio = require('cheerio');
const { requireAuth } = require('../middleware/auth');
const { getCache, setCache } = require('../utils/redis');

// ── Torrent language detection from filename ──
function detectLang(name) {
  const n = name.toUpperCase();
  if (n.includes('MULTI')) return 'MULTI';
  if (n.includes('VOSTFR') || n.includes('SUBFRENCH')) return 'VOSTFR';
  if (n.includes('FRENCH') || n.includes('TRUEFRENCH') || n.includes('.VF.') || n.includes(' VF ')) return 'VF';
  if (n.includes('ENGLISH') || n.includes('.EN.')) return 'VO';
  return 'VO';
}

// ── Quality detection from filename ──
function detectQuality(name) {
  const n = name.toUpperCase();
  if (n.includes('2160P') || n.includes('4K') || n.includes('UHD')) return '4K';
  if (n.includes('1080P') || n.includes('FULLHD')) return '1080p';
  if (n.includes('720P') || n.includes('HD')) return '720p';
  if (n.includes('480P')) return '480p';
  return '720p';
}

// ── Seed health indicator ──
function seedHealth(seeds) {
  if (seeds > 100) return 'healthy';
  if (seeds > 10) return 'medium';
  return 'low';
}

// ═══════════════════════════════════════════════
// TRACKER: 1337x (public, no account needed)
// ═══════════════════════════════════════════════
async function search1337x(query) {
  try {
    const { data } = await axios.get(`https://1337x.to/search/${encodeURIComponent(query)}/1/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000,
    });
    const $ = cheerio.load(data);
    const results = [];

    $('table.table-list tbody tr').each((i, el) => {
      if (i >= 15) return; // Limit results
      const $el = $(el);
      const name = $el.find('.name a:nth-child(2)').text().trim();
      const seeds = parseInt($el.find('.seeds').text()) || 0;
      const leechers = parseInt($el.find('.leeches').text()) || 0;
      const size = $el.find('.size').clone().children().remove().end().text().trim();
      const link = $el.find('.name a:nth-child(2)').attr('href');

      if (name) {
        results.push({
          name, seeds, leechers, size,
          source: '1337x',
          lang: detectLang(name),
          quality: detectQuality(name),
          health: seedHealth(seeds),
          detailUrl: `https://1337x.to${link}`,
          magnet: null, // Need detail page for magnet
        });
      }
    });

    return results;
  } catch (err) {
    console.error('[1337x] Search error:', err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════
// TRACKER: Torrent9 (public, scraping)
// ═══════════════════════════════════════════════
async function searchTorrent9(query) {
  try {
    const { data } = await axios.get(`https://www.torrent9.fm/search_torrent/${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 10000,
    });
    const $ = cheerio.load(data);
    const results = [];

    $('table tbody tr').each((i, el) => {
      if (i >= 15) return;
      const $el = $(el);
      const name = $el.find('a').first().text().trim();
      const seeds = parseInt($el.find('.seed_ok, td:nth-child(4)').text()) || 0;
      const leechers = parseInt($el.find('td:nth-child(5)').text()) || 0;
      const size = $el.find('td:nth-child(2)').text().trim();
      const link = $el.find('a').first().attr('href');

      if (name && name.length > 3) {
        results.push({
          name, seeds, leechers, size,
          source: 'Torrent9',
          lang: detectLang(name),
          quality: detectQuality(name),
          health: seedHealth(seeds),
          detailUrl: link ? `https://www.torrent9.fm${link}` : null,
          magnet: null,
        });
      }
    });

    return results;
  } catch (err) {
    console.error('[Torrent9] Search error:', err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════
// AGGREGATE: Search all trackers in parallel
// ═══════════════════════════════════════════════
async function searchAllTrackers(query, filters = {}) {
  const cacheKey = `torrents:${query}:${JSON.stringify(filters)}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  // Search all trackers in parallel
  const [results1337x, resultsTorrent9] = await Promise.allSettled([
    search1337x(query),
    searchTorrent9(query),
  ]);

  let allResults = [
    ...(results1337x.status === 'fulfilled' ? results1337x.value : []),
    ...(resultsTorrent9.status === 'fulfilled' ? resultsTorrent9.value : []),
  ];

  // Apply language filter
  if (filters.lang && filters.lang !== 'Toutes') {
    allResults = allResults.filter(r => r.lang === filters.lang);
  }

  // Apply quality filter
  if (filters.quality && filters.quality !== 'Toutes') {
    allResults = allResults.filter(r => r.quality === filters.quality);
  }

  // Sort by seeds (best first)
  allResults.sort((a, b) => b.seeds - a.seeds);

  // Mark best choice
  if (allResults.length > 0) {
    allResults[0].recommended = true;
  }

  await setCache(cacheKey, allResults, 900); // 15min cache
  return allResults;
}

// ── GET /api/torrents/search?q=&lang=&quality= ──
router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const { q, lang, quality } = req.query;
    if (!q) return res.status(400).json({ error: 'Requête manquante.' });

    const results = await searchAllTrackers(q, { lang, quality });

    res.json({
      results,
      total: results.length,
      sources: {
        '1337x': results.filter(r => r.source === '1337x').length,
        'Torrent9': results.filter(r => r.source === 'Torrent9').length,
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/torrents/magnet/:source ── (get magnet from detail page)
router.get('/magnet', requireAuth, async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL manquante.' });

    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    });
    const $ = cheerio.load(data);

    // Look for magnet link
    let magnet = $('a[href^="magnet:"]').attr('href');

    if (!magnet) {
      return res.status(404).json({ error: 'Magnet non trouvé.' });
    }

    res.json({ magnet });
  } catch (err) { next(err); }
});

module.exports = router;
