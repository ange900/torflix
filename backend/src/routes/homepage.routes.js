import { Router } from 'express';
import axios from 'axios';
import pg from 'pg';

const router = Router();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

// Cache TMDB 30min
const cache = new Map();
async function tmdb(endpoint, params = {}) {
  const k = `${endpoint}:${JSON.stringify(params)}`;
  const c = cache.get(k);
  if (c && Date.now() - c.ts < 1800000) return c.data;
  try {
    const { data } = await axios.get(`${TMDB}${endpoint}`, {
      params: { api_key: TMDB_KEY, language: 'fr-FR', ...params }, timeout: 8000
    });
    cache.set(k, { data, ts: Date.now() });
    return data;
  } catch (e) { console.error(`TMDB ${endpoint}:`, e.message); return null; }
}

function enrich(item, type = 'movie') {
  return {
    id: item.id, tmdb_id: item.id, type,
    title: item.title || item.name,
    original_title: item.original_title || item.original_name,
    overview: item.overview,
    poster: item.poster_path ? `${IMG}/w342${item.poster_path}` : null,
    poster_lg: item.poster_path ? `${IMG}/w500${item.poster_path}` : null,
    backdrop: item.backdrop_path ? `${IMG}/w1280${item.backdrop_path}` : null,
    backdrop_full: item.backdrop_path ? `${IMG}/original${item.backdrop_path}` : null,
    rating: item.vote_average, vote_count: item.vote_count,
    release_date: item.release_date || item.first_air_date,
    year: (item.release_date || item.first_air_date || '').substring(0, 4),
    genre_ids: item.genre_ids || [], popularity: item.popularity,
    media_type: type
  };
}

async function getContinueWatching(userId) {
  try {
    const { rows } = await pool.query(`
      SELECT tmdb_id, media_type, title, poster_path, backdrop_path,
             progress, duration, updated_at, season_number, episode_number
      FROM watch_history WHERE user_id = $1 AND progress < 0.95 AND progress > 0.05
      ORDER BY updated_at DESC LIMIT 20
    `, [userId]);
    return rows.map(r => ({
      id: r.tmdb_id, tmdb_id: r.tmdb_id, type: r.media_type, title: r.title,
      poster: r.poster_path ? `${IMG}/w342${r.poster_path}` : null,
      backdrop: r.backdrop_path ? `${IMG}/w780${r.backdrop_path}` : null,
      progress: r.progress, duration: r.duration,
      season: r.season_number, episode: r.episode_number, updated_at: r.updated_at
    }));
  } catch (e) { if (e.code === '42P01') return []; console.error('CW:', e.message); return []; }
}

// GET /api/homepage
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const [tr, pm, ps, top, up, act, com, dra, hor, sci, doc, ani, cw] = await Promise.all([
      tmdb('/trending/all/week'), tmdb('/movie/popular'), tmdb('/tv/popular'),
      tmdb('/movie/top_rated'), tmdb('/movie/upcoming', { region: 'FR' }),
      tmdb('/discover/movie', { with_genres: '28', sort_by: 'popularity.desc' }),
      tmdb('/discover/movie', { with_genres: '35', sort_by: 'popularity.desc' }),
      tmdb('/discover/movie', { with_genres: '18', sort_by: 'popularity.desc' }),
      tmdb('/discover/movie', { with_genres: '27', sort_by: 'popularity.desc' }),
      tmdb('/discover/movie', { with_genres: '878', sort_by: 'popularity.desc' }),
      tmdb('/discover/movie', { with_genres: '99', sort_by: 'popularity.desc' }),
      tmdb('/discover/movie', { with_genres: '16', sort_by: 'popularity.desc' }),
      userId ? getContinueWatching(userId) : []
    ]);

    const hero = (tr?.results || []).filter(i => i.backdrop_path && i.overview)
      .slice(0, 5).map(i => enrich(i, i.media_type || 'movie'));

    const sections = [];
    if (cw.length > 0) sections.push({ id: 'continue-watching', title: 'Reprendre la lecture', icon: '▶️', items: cw, type: 'continue' });

    const defs = [
      { d: tr, id: 'trending', t: 'Tendances de la semaine', i: '🔥', tp: 'large', mt: null },
      { d: pm, id: 'popular-movies', t: 'Films populaires', i: '🎬', tp: 'standard', mt: 'movie' },
      { d: ps, id: 'popular-series', t: 'Séries du moment', i: '📺', tp: 'standard', mt: 'tv' },
      { d: up, id: 'upcoming', t: 'Prochaines sorties', i: '🆕', tp: 'standard', mt: 'movie' },
      { d: top, id: 'top-rated', t: 'Les mieux notés', i: '⭐', tp: 'numbered', mt: 'movie' },
      { d: act, id: 'action', t: 'Action & Aventure', i: '💥', tp: 'standard', mt: 'movie' },
      { d: com, id: 'comedy', t: 'Comédies', i: '😂', tp: 'standard', mt: 'movie' },
      { d: dra, id: 'drama', t: 'Drames', i: '🎭', tp: 'standard', mt: 'movie' },
      { d: hor, id: 'horror', t: 'Horreur & Thriller', i: '👻', tp: 'standard', mt: 'movie' },
      { d: sci, id: 'scifi', t: 'Science-Fiction', i: '🚀', tp: 'standard', mt: 'movie' },
      { d: doc, id: 'documentary', t: 'Documentaires', i: '📖', tp: 'standard', mt: 'movie' },
      { d: ani, id: 'animation', t: 'Animation', i: '🎨', tp: 'standard', mt: 'movie' },
    ];
    for (const s of defs) {
      if (s.d?.results?.length) sections.push({
        id: s.id, title: s.t, icon: s.i, type: s.tp,
        items: s.d.results.slice(0, 20).map(x => enrich(x, s.mt || x.media_type || 'movie'))
      });
    }

    const genres = await tmdb('/genre/movie/list');
    res.json({ hero, sections, genres: genres?.genres || [] });
  } catch (e) { console.error('Homepage:', e); res.status(500).json({ error: 'Erreur homepage' }); }
});

// GET /api/homepage/section/:id
router.get('/section/:id', async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const map = {
    'trending': () => tmdb('/trending/all/week', { page }),
    'popular-movies': () => tmdb('/movie/popular', { page }),
    'popular-series': () => tmdb('/tv/popular', { page }),
    'top-rated': () => tmdb('/movie/top_rated', { page }),
    'upcoming': () => tmdb('/movie/upcoming', { page, region: 'FR' }),
    'action': () => tmdb('/discover/movie', { with_genres: '28', page }),
    'comedy': () => tmdb('/discover/movie', { with_genres: '35', page }),
    'drama': () => tmdb('/discover/movie', { with_genres: '18', page }),
    'horror': () => tmdb('/discover/movie', { with_genres: '27', page }),
    'scifi': () => tmdb('/discover/movie', { with_genres: '878', page }),
    'documentary': () => tmdb('/discover/movie', { with_genres: '99', page }),
    'animation': () => tmdb('/discover/movie', { with_genres: '16', page }),
  };
  if (!map[id]) return res.status(404).json({ error: 'Section inconnue' });
  try {
    const data = await map[id]();
    const tp = id === 'popular-series' ? 'tv' : 'movie';
    res.json({ items: (data?.results || []).map(i => enrich(i, i.media_type || tp)), page: data?.page, total_pages: data?.total_pages });
  } catch (e) { res.status(500).json({ error: 'Erreur section' }); }
});

// POST /api/homepage/watch-progress
router.post('/watch-progress', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Non authentifié' });
  const { tmdb_id, media_type, title, poster_path, backdrop_path, progress, duration, watch_position, season_number, episode_number, torrent_hash, quality } = req.body;
  try {
    await pool.query(`
      INSERT INTO watch_history (user_id, tmdb_id, media_type, title, poster_path, backdrop_path, progress, duration, watch_position, season_number, episode_number, torrent_hash, quality)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (user_id, tmdb_id, media_type, COALESCE(season_number,0), COALESCE(episode_number,0))
      DO UPDATE SET progress=$7, duration=$8, watch_position=$9, torrent_hash=COALESCE($12,watch_history.torrent_hash), quality=COALESCE($13,watch_history.quality)
    `, [userId, tmdb_id, media_type||'movie', title, poster_path, backdrop_path, progress, duration, watch_position, season_number||null, episode_number||null, torrent_hash||null, quality||null]);
    res.json({ success: true });
  } catch (e) { console.error('Watch progress:', e); res.status(500).json({ error: 'Erreur sauvegarde' }); }
});

export default router;

// GET /api/homepage/mode/:mode
router.get('/mode/:mode', async (req, res) => {
  const { mode } = req.params;
  try {
    let data;
    if (mode === 'kids') {
      const [ani, fam, doc] = await Promise.all([
        tmdb('/discover/movie', { with_genres: '16', sort_by: 'popularity.desc', certification_country: 'FR', 'certification.lte': 'U' }),
        tmdb('/discover/movie', { with_genres: '10751', sort_by: 'popularity.desc' }),
        tmdb('/discover/tv', { with_genres: '16', sort_by: 'popularity.desc' }),
      ]);
      const items = [
        ...(ani?.results || []).map(i => enrich(i, 'movie')),
        ...(fam?.results || []).map(i => enrich(i, 'movie')),
        ...(doc?.results || []).map(i => enrich(i, 'tv')),
      ].filter(i => i.poster);
      data = {
        hero: items.slice(0, 5),
        sections: [
          { id: 'anime', title: '🎌 Dessins Animés', items: (ani?.results || []).map(i => enrich(i, 'movie')).filter(i => i.poster) },
          { id: 'family', title: '👨‍👩‍👧 Films Famille', items: (fam?.results || []).map(i => enrich(i, 'movie')).filter(i => i.poster) },
          { id: 'kidsTV', title: '📺 Séries Enfants', items: (doc?.results || []).map(i => enrich(i, 'tv')).filter(i => i.poster) },
        ]
      };
    } else if (mode === 'adult') {
      const [hot, thriller, romance] = await Promise.all([
        tmdb('/discover/movie', { with_genres: '27,53', sort_by: 'popularity.desc', 'vote_average.gte': 5, include_adult: true }),
        tmdb('/discover/movie', { with_genres: '53', sort_by: 'popularity.desc', include_adult: true }),
        tmdb('/discover/movie', { with_genres: '10749', sort_by: 'popularity.desc', include_adult: true }),
      ]);
      data = {
        hero: (hot?.results || []).slice(0, 5).map(i => enrich(i, 'movie')),
        sections: [
          { id: 'hot', title: '🔥 Populaires +18', items: (hot?.results || []).map(i => enrich(i, 'movie')).filter(i => i.poster) },
          { id: 'thriller', title: '😱 Thrillers', items: (thriller?.results || []).map(i => enrich(i, 'movie')).filter(i => i.poster) },
          { id: 'romance', title: '💋 Romance', items: (romance?.results || []).map(i => enrich(i, 'movie')).filter(i => i.poster) },
        ]
      };
    } else {
      return res.redirect('/api/homepage');
    }
    res.json(data);
  } catch(e) {
    console.error('[homepage/mode]', e.message);
    res.status(500).json({ error: e.message });
  }
});
