-- Delta Sync Upgrade Migration
-- Run once against an existing SQLite/D1 database.

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
