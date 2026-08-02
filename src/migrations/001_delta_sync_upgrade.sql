-- Delta Sync Upgrade Migration
-- Run once against an existing SQLite/D1 database.

ALTER TABLE users ADD COLUMN account_code TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN session_token TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN session_active INTEGER DEFAULT 0;
ALTER TABLE activity_logs ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE notifications ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE global_messages ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE duel_history ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE presence ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE coin_history ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE jukebox_playlist ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE jukebox_favorites ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE jukebox_history ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE jukebox_last_played ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE jukebox_layout_settings ADD COLUMN updated_at INTEGER DEFAULT 0;

UPDATE activity_logs SET updated_at = COALESCE(updated_at, created_at, timestamp, strftime('%s','now') * 1000) WHERE updated_at IS NULL OR updated_at = 0;
UPDATE notifications SET updated_at = COALESCE(updated_at, created_at, timestamp, strftime('%s','now') * 1000) WHERE updated_at IS NULL OR updated_at = 0;
UPDATE global_messages SET updated_at = COALESCE(updated_at, created_at, timestamp, strftime('%s','now') * 1000) WHERE updated_at IS NULL OR updated_at = 0;
UPDATE duel_history SET updated_at = COALESCE(updated_at, created_at, timestamp, strftime('%s','now') * 1000) WHERE updated_at IS NULL OR updated_at = 0;
UPDATE presence SET updated_at = COALESCE(updated_at, last_active, strftime('%s','now') * 1000) WHERE updated_at IS NULL OR updated_at = 0;
UPDATE coin_history SET updated_at = COALESCE(updated_at, created_at, timestamp, strftime('%s','now') * 1000) WHERE updated_at IS NULL OR updated_at = 0;
UPDATE jukebox_playlist SET updated_at = COALESCE(updated_at, created_at, timestamp, last_played_at, strftime('%s','now') * 1000) WHERE updated_at IS NULL OR updated_at = 0;
UPDATE jukebox_favorites SET updated_at = COALESCE(updated_at, created_at, timestamp, last_played_at, strftime('%s','now') * 1000) WHERE updated_at IS NULL OR updated_at = 0;
UPDATE jukebox_history SET updated_at = COALESCE(updated_at, created_at, timestamp, strftime('%s','now') * 1000) WHERE updated_at IS NULL OR updated_at = 0;
UPDATE jukebox_last_played SET updated_at = COALESCE(updated_at, created_at, last_played_at, strftime('%s','now') * 1000) WHERE updated_at IS NULL OR updated_at = 0;
UPDATE jukebox_layout_settings SET updated_at = COALESCE(updated_at, strftime('%s','now') * 1000) WHERE updated_at IS NULL OR updated_at = 0;


CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_token TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  device TEXT,
  browser TEXT,
  started_at INTEGER DEFAULT 0,
  last_heartbeat_at INTEGER DEFAULT 0,
  ended_at INTEGER,
  created_at INTEGER DEFAULT 0,
  updated_at INTEGER DEFAULT 0,
  UNIQUE(user_id, session_token),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

UPDATE users
SET account_code = CASE
  WHEN id = '#1' THEN '00000001'
  WHEN account_code IS NULL OR account_code = '' THEN printf('%08d', abs(random()) % 90000000 + 10000000)
  ELSE account_code
END,
session_active = COALESCE(session_active, 0),
updated_at = COALESCE(updated_at, created_at, strftime('%s','now') * 1000)
WHERE 1 = 1;

UPDATE developer_settings SET setting_value = '1000' WHERE setting_key = 'max_polling_ms';
