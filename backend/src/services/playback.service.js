import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://streampanel:streampanel@localhost:5432/streampanel',
});

// Save or update playback position
export async function savePlaybackPosition(userId, data) {
  const {
    tmdbId,
    mediaType,
    seasonNumber = null,
    episodeNumber = null,
    title = '',
    posterPath = '',
    backdropPath = '',
    durationSeconds = 0,
    positionSeconds = 0,
    magnetUri = null,
    torrentTitle = null,
    quality = null,
    language = null,
    fileIndex = 0,
  } = data;

  const progress = durationSeconds > 0 ? Math.round((positionSeconds / durationSeconds) * 10000) / 100 : 0;
  const completed = progress >= 90;

  const query = `
    INSERT INTO watch_history (
      user_id, tmdb_id, media_type, season_number, episode_number,
      title, poster_path, backdrop_path, duration_seconds, position_seconds,
      progress, completed, magnet_uri, torrent_title, quality, language, file_index,
      last_watched_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
    ON CONFLICT (user_id, tmdb_id, media_type, COALESCE(season_number, 0), COALESCE(episode_number, 0))
    DO UPDATE SET
      position_seconds = EXCLUDED.position_seconds,
      duration_seconds = COALESCE(NULLIF(EXCLUDED.duration_seconds, 0), watch_history.duration_seconds),
      progress = EXCLUDED.progress,
      completed = EXCLUDED.completed,
      magnet_uri = COALESCE(EXCLUDED.magnet_uri, watch_history.magnet_uri),
      torrent_title = COALESCE(EXCLUDED.torrent_title, watch_history.torrent_title),
      quality = COALESCE(EXCLUDED.quality, watch_history.quality),
      language = COALESCE(EXCLUDED.language, watch_history.language),
      file_index = COALESCE(EXCLUDED.file_index, watch_history.file_index),
      title = COALESCE(NULLIF(EXCLUDED.title, ''), watch_history.title),
      poster_path = COALESCE(NULLIF(EXCLUDED.poster_path, ''), watch_history.poster_path),
      backdrop_path = COALESCE(NULLIF(EXCLUDED.backdrop_path, ''), watch_history.backdrop_path),
      last_watched_at = NOW(),
      updated_at = NOW()
    RETURNING *;
  `;

  const result = await pool.query(query, [
    userId, tmdbId, mediaType, seasonNumber, episodeNumber,
    title, posterPath, backdropPath, durationSeconds, positionSeconds,
    progress, completed, magnetUri, torrentTitle, quality, language, fileIndex,
  ]);

  return result.rows[0];
}

// Get playback position for a specific content
export async function getPlaybackPosition(userId, tmdbId, mediaType, seasonNumber = null, episodeNumber = null) {
  const query = `
    SELECT * FROM watch_history
    WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3
      AND COALESCE(season_number, 0) = COALESCE($4, 0)
      AND COALESCE(episode_number, 0) = COALESCE($5, 0)
  `;

  const result = await pool.query(query, [userId, tmdbId, mediaType, seasonNumber, episodeNumber]);
  return result.rows[0] || null;
}

// Get "Continue Watching" list (incomplete items)
export async function getContinueWatching(userId, limit = 20) {
  const query = `
    SELECT * FROM watch_history
    WHERE user_id = $1 AND completed = FALSE AND position_seconds > 30
    ORDER BY last_watched_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [userId, limit]);
  return result.rows;
}

// Get recently watched (completed items)
export async function getRecentlyWatched(userId, limit = 20) {
  const query = `
    SELECT * FROM watch_history
    WHERE user_id = $1 AND completed = TRUE
    ORDER BY last_watched_at DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [userId, limit]);
  return result.rows;
}

// Get full watch history
export async function getWatchHistory(userId, page = 1, limit = 50) {
  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) FROM watch_history WHERE user_id = $1`;
  const dataQuery = `
    SELECT * FROM watch_history
    WHERE user_id = $1
    ORDER BY last_watched_at DESC
    LIMIT $2 OFFSET $3
  `;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery, [userId]),
    pool.query(dataQuery, [userId, limit, offset]),
  ]);

  return {
    items: dataResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    totalPages: Math.ceil(countResult.rows[0].count / limit),
  };
}

// Delete watch history item
export async function deleteWatchHistoryItem(userId, historyId) {
  const result = await pool.query(
    'DELETE FROM watch_history WHERE id = $1 AND user_id = $2 RETURNING *',
    [historyId, userId]
  );
  return result.rows[0] || null;
}

// Mark as completed
export async function markAsCompleted(userId, tmdbId, mediaType, seasonNumber = null, episodeNumber = null) {
  const query = `
    UPDATE watch_history
    SET completed = TRUE, progress = 100, updated_at = NOW()
    WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3
      AND COALESCE(season_number, 0) = COALESCE($4, 0)
      AND COALESCE(episode_number, 0) = COALESCE($5, 0)
    RETURNING *
  `;

  const result = await pool.query(query, [userId, tmdbId, mediaType, seasonNumber, episodeNumber]);
  return result.rows[0] || null;
}

// --- FAVORITES ---

export async function addFavorite(userId, data) {
  const { tmdbId, mediaType, title = '', posterPath = '' } = data;

  const result = await pool.query(
    `INSERT INTO favorites (user_id, tmdb_id, media_type, title, poster_path)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, tmdb_id, media_type) DO NOTHING
     RETURNING *`,
    [userId, tmdbId, mediaType, title, posterPath]
  );

  return result.rows[0];
}

export async function removeFavorite(userId, tmdbId, mediaType) {
  const result = await pool.query(
    'DELETE FROM favorites WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3 RETURNING *',
    [userId, tmdbId, mediaType]
  );
  return result.rows[0] || null;
}

export async function getFavorites(userId, limit = 100) {
  const result = await pool.query(
    'SELECT * FROM favorites WHERE user_id = $1 ORDER BY added_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

export async function isFavorite(userId, tmdbId, mediaType) {
  const result = await pool.query(
    'SELECT id FROM favorites WHERE user_id = $1 AND tmdb_id = $2 AND media_type = $3',
    [userId, tmdbId, mediaType]
  );
  return result.rows.length > 0;
}

// Get next episode to watch for a TV show
export async function getNextEpisode(userId, tmdbId) {
  const query = `
    SELECT season_number, episode_number, completed, position_seconds, duration_seconds
    FROM watch_history
    WHERE user_id = $1 AND tmdb_id = $2 AND media_type = 'tv'
    ORDER BY season_number DESC, episode_number DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [userId, tmdbId]);
  if (result.rows.length === 0) return { season: 1, episode: 1 };

  const last = result.rows[0];
  if (last.completed) {
    // Return next episode
    return {
      season: last.season_number,
      episode: last.episode_number + 1,
      isNext: true,
    };
  }

  // Return current (incomplete) episode
  return {
    season: last.season_number,
    episode: last.episode_number,
    positionSeconds: last.position_seconds,
    durationSeconds: last.duration_seconds,
    isResume: true,
  };
}

export default {
  savePlaybackPosition,
  getPlaybackPosition,
  getContinueWatching,
  getRecentlyWatched,
  getWatchHistory,
  deleteWatchHistoryItem,
  markAsCompleted,
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorite,
  getNextEpisode,
};
