-- ═══════════════════════════════════════════════
-- TorFlix — Database Schema
-- ═══════════════════════════════════════════════

-- Users table (compte obligatoire)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    avatar_url TEXT,
    preferred_lang VARCHAR(10) DEFAULT 'VF',
    preferred_quality VARCHAR(10) DEFAULT '1080p',
    totp_secret VARCHAR(100),
    totp_enabled BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Watch progress (reprise de lecture)
CREATE TABLE IF NOT EXISTS watch_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    media_type VARCHAR(10) DEFAULT 'movie' CHECK (media_type IN ('movie', 'tv')),
    season_number INTEGER,
    episode_number INTEGER,
    current_time_seconds INTEGER DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    progress DECIMAL(5,4) DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    torrent_source VARCHAR(100),
    quality VARCHAR(10),
    lang VARCHAR(10),
    last_watched_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tmdb_id, season_number, episode_number)
);

-- Favorites / Ma Liste
CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    media_type VARCHAR(10) DEFAULT 'movie',
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tmdb_id)
);

-- Torrent accounts (YGG, Torrent9, etc.)
CREATE TABLE IF NOT EXISTS torrent_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    site_name VARCHAR(50) NOT NULL,
    username_encrypted TEXT,
    password_encrypted TEXT,
    cookies_encrypted TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_check_at TIMESTAMP,
    ratio DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'unknown',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Search history
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    query VARCHAR(255) NOT NULL,
    filters JSONB,
    searched_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_progress_user ON watch_progress(user_id, last_watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_lookup ON watch_progress(user_id, tmdb_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON torrent_accounts(user_id);

-- Create default admin user (password: admin123)
-- $2a$12$ hash of "admin123"
INSERT INTO users (username, email, password_hash, role)
VALUES ('admin', 'admin@torflix.local', '$2a$12$LQv3c1yqBo9SkvXS7QTJPOoI5S.YqBqFpGn8nSZMCOlLNjDB0tMVu', 'admin')
ON CONFLICT (username) DO NOTHING;
