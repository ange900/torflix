const KEY = 'af8e4dcd14c8e141b9757afaa86ccd05';
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

const cache = new Map();

async function get(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_key', KEY);
  const prefs = (() => { try { const p = JSON.parse(localStorage.getItem('torflix_prefs') || '{}'); return p; } catch { return {}; } })();
  const langMap = {'fr':'fr-FR','en':'en-US','it':'it-IT','es':'es-ES','de':'de-DE','pt':'pt-PT','pt-br':'pt-BR','nl':'nl-NL','ru':'ru-RU','ar':'ar-SA','zh':'zh-CN','ja':'ja-JP','ko':'ko-KR','hi':'hi-IN','tr':'tr-TR','pl':'pl-PL','uk':'uk-UA','ro':'ro-RO','el':'el-GR','hu':'hu-HU','cs':'cs-CZ','sv':'sv-SE','da':'da-DK','no':'no-NO','fi':'fi-FI','he':'he-IL','th':'th-TH','vi':'vi-VN','id':'id-ID','tl':'tl-PH','sq':'sq-AL','bg':'bg-BG','sr':'sr-RS','hr':'hr-HR','sk':'sk-SK','ca':'ca-ES','ms':'ms-MY','fa':'fa-IR','bn':'bn-BD','ta':'ta-IN','te':'te-IN','ml':'ml-IN','ur':'ur-PK','ka':'ka-GE','hy':'hy-AM','az':'az-AZ','is':'is-IS','sl':'sl-SI','mk':'mk-MK','bs':'bs-BA','mt':'mt-MT','sw':'sw-KE','af':'af-ZA','zh-tw':'zh-TW','lb':'lb-LU','eu':'eu-ES','gl':'gl-ES','et':'et-EE','lt':'lt-LT','lv':'lv-LV','kk':'kk-KZ','uz':'uz-UZ','mn':'mn-MN','ne':'ne-NP','si':'si-LK','pa':'pa-IN','gu':'gu-IN','kn':'kn-IN','mr':'mr-IN','lo':'lo-LA','km':'km-KH','my':'my-MM','am':'am-ET','zu':'zu-ZA'};
  const tmdbLang = langMap[prefs.lang || 'fr'] || 'fr-FR';
  url.searchParams.set('language', tmdbLang);
  Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));

  const cacheKey = url.toString();
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  cache.set(cacheKey, data);
  return data;
}

export const tmdb = {
  get,
  trending: (type = 'all') => get(`/trending/${type}/week`),
  popular: (type, page = 1) => get(`/${type}/popular`, { page }),
  search: (query, page = 1) => get('/search/multi', { query, page }),
  searchMovies: (query, page = 1) => get('/search/movie', { query, page }),
  searchTV: (query, page = 1) => get('/search/tv', { query, page }),
  movie: (id) => get(`/movie/${id}`, { append_to_response: 'credits,videos,similar' }),
  tv: (id) => get(`/tv/${id}`, { append_to_response: 'credits,videos,similar' }),
  season: (id, num) => get(`/tv/${id}/season/${num}`),
  genres: (type) => get(`/genre/${type}/list`),
};

export const img = (path, size = 'w342') => path ? `${IMG}/${size}${path}` : null;
export const backdrop = (path) => path ? `${IMG}/w1280${path}` : null;

// Generic GET for any TMDB endpoint
tmdb.get = async (path) => {
  const url = new URL('https://api.themoviedb.org/3' + path);
  url.searchParams.set('api_key', 'af8e4dcd14c8e141b9757afaa86ccd05');
  const prefs = (() => { try { return JSON.parse(localStorage.getItem('torflix_prefs') || '{}'); } catch { return {}; } })();
  const langMap = {'fr':'fr-FR','en':'en-US','it':'it-IT','es':'es-ES','de':'de-DE','pt':'pt-PT','ja':'ja-JP','ko':'ko-KR','ar':'ar-SA','zh':'zh-CN','ru':'ru-RU','tr':'tr-TR','pl':'pl-PL','nl':'nl-NL'};
  url.searchParams.set('language', langMap[prefs.lang || 'fr'] || 'fr-FR');
  const res = await fetch(url);
  return res.json();
};
