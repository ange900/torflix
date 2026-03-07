import axios from 'axios';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const TMDB_KEY = process.env.TMDB_API_KEY || 'af8e4dcd14c8e141b9757afaa86ccd05';
const BASE = 'https://api.themoviedb.org/3';
const TTL = 3600;

async function tmdbGet(path, params = {}) {
  const cacheKey = `tmdb:${path}:${JSON.stringify(params)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const { data } = await axios.get(`${BASE}${path}`, {
    params: { api_key: TMDB_KEY, language: 'fr-FR', ...params },
    timeout: 10000,
  });
  await redis.setex(cacheKey, TTL, JSON.stringify(data));
  return data;
}

export async function getTrending(type, timeWindow = 'week') {
  return tmdbGet(`/trending/${type}/${timeWindow}`);
}

export async function getPopular(type, page = 1) {
  return tmdbGet(`/${type}/popular`, { page });
}

export async function searchMovies(query, page = 1) {
  return tmdbGet('/search/movie', { query, page });
}

export async function searchTV(query, page = 1) {
  return tmdbGet('/search/tv', { query, page });
}

export async function getMovieDetails(id) {
  return tmdbGet(`/movie/${id}`, { append_to_response: 'credits,videos,similar' });
}

export async function getTVDetails(id) {
  return tmdbGet(`/tv/${id}`, { append_to_response: 'credits,videos,similar' });
}

export async function getTVSeasonDetails(tvId, seasonNumber) {
  return tmdbGet(`/tv/${tvId}/season/${seasonNumber}`);
}

export async function getNowPlaying(page = 1) {
  return tmdbGet('/movie/now_playing', { page });
}

export async function getTopRated(type, page = 1) {
  return tmdbGet(`/${type}/top_rated`, { page });
}

export async function getUpcoming(page = 1) {
  return tmdbGet('/movie/upcoming', { page });
}

export async function getAiringToday(page = 1) {
  return tmdbGet('/tv/airing_today', { page });
}

export async function getOnTheAir(page = 1) {
  return tmdbGet('/tv/on_the_air', { page });
}

export async function discoverMovies(params = {}) {
  return tmdbGet('/discover/movie', { sort_by: 'popularity.desc', ...params });
}

export async function discoverTV(params = {}) {
  return tmdbGet('/discover/tv', { sort_by: 'popularity.desc', ...params });
}

export async function getGenres(type = 'movie') {
  return tmdbGet(`/genre/${type}/list`);
}

export async function searchMulti(query, page = 1) {
  return tmdbGet('/search/multi', { query, page });
}
