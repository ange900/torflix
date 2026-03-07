-- Phase 5: Watch History & Playback Tracking
-- Run: psql -U streampanel -d streampanel -f 005_watch_history.sql

-- Watch history with resume support
CREATE TABLE IF NOT EXISTS watch_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('movie', 'tv')),
    season_number INTEGER,
    episode_number INTEGER,
    title VARCHAR(500),
    poster_path VARCHAR(500),
    backdrop_path VARCHAR(500),
    duration_seconds INTEGER DEFAULT 0,
    position_seconds INTEGER DEFAULT 0,
    progress DECIMAL(5,2) DEFAULT 0.00,
    completed BOOLEAN DEFAULT FALSE,
    magnet_uri TEXT,
    torrent_title VARCHAR(1000),
    quality VARCHAR(20),
    language VARCHAR(20),
    file_index INTEGER DEFAULT 0,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tmdb_id, media_type, COALESCE(season_number, 0), COALESCE(episode_number, 0))
);

-- Index for fast resume lookups
CREATE INDEX IF NOT EXISTS idx_watch_history_user_recent ON watch_history(user_id, last_watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_tmdb ON watch_history(user_id, tmdb_id, media_type);
CREATE INDEX IF NOT EXISTS idx_watch_history_incomplete ON watch_history(user_id, completed, last_watched_at DESC) WHERE completed = FALSE;

-- Favorites / My List
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('movie', 'tv')),
    title VARCHAR(500),
    poster_path VARCHAR(500),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tmdb_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, added_at DESC);

-- Active streaming sessions
CREATE TABLE IF NOT EXISTS streaming_sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    magnet_uri TEXT NOT NULL,
    info_hash VARCHAR(100),
    file_index INTEGER DEFAULT 0,
    file_name VARCHAR(1000),
    file_size BIGINT DEFAULT 0,
    download_speed BIGINT DEFAULT 0,
    upload_speed BIGINT DEFAULT 0,
    progress DECIMAL(5,2) DEFAULT 0.00,
    peers INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'initializing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_active ON streaming_sessions(status, last_active_at DESC);
