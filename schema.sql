-- Cloudflare D1 Database Schema Migration for Oguri Cap Web App
-- Database Binding: DB
-- API Route Prefix: /api/v1/

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'Trainer',
  avatar TEXT,
  coins INTEGER DEFAULT 1000,
  totalGame INTEGER DEFAULT 0,
  win INTEGER DEFAULT 0,
  lose INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Online',
  lastSeen INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  device TEXT,
  browser TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 2. Friends Table
CREATE TABLE IF NOT EXISTS friends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  status TEXT DEFAULT 'Offline',
  role TEXT DEFAULT 'Trainer',
  isOnline INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Messages / Chat Table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  text TEXT NOT NULL,
  time TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  status TEXT DEFAULT 'sent',
  is_read INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 4. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  time TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 5. Bot Profile Table
CREATE TABLE IF NOT EXISTS bot_profile (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'Oguri Cap 🐎',
  avatar TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT 'Siap membantu Trainer dalam Tebak Kata & Musik Tracen Academy! 🥕',
  status TEXT NOT NULL DEFAULT 'Online',
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 6. Developer Settings & Auto Replies Table
CREATE TABLE IF NOT EXISTS developer_settings (
  id TEXT PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 7. Developer Badge Table
CREATE TABLE IF NOT EXISTS developer_badge (
  id TEXT PRIMARY KEY DEFAULT 'dev_badge_main',
  user_id TEXT DEFAULT '#1',
  badge_name TEXT NOT NULL DEFAULT 'Ruby Developer',
  theme_id TEXT NOT NULL DEFAULT 'ruby',
  icon TEXT DEFAULT '🔥',
  effect TEXT DEFAULT 'Shine & Glow',
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 9. Global Messages Table
CREATE TABLE IF NOT EXISTS global_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT DEFAULT 'Trainer',
  sender_avatar TEXT,
  text TEXT NOT NULL,
  is_duel_answer INTEGER DEFAULT 0,
  time TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 10. Live Duel Table
CREATE TABLE IF NOT EXISTS duel (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'idle', -- idle, countdown, question, answer_correct, scores, finished
  challenger_id TEXT NOT NULL,
  challenger_name TEXT NOT NULL,
  opponent_id TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  current_round INTEGER DEFAULT 1,
  total_rounds INTEGER DEFAULT 3,
  score_p1 INTEGER DEFAULT 0,
  score_p2 INTEGER DEFAULT 0,
  current_question TEXT,
  winner_id TEXT,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 11. Duel History Table
CREATE TABLE IF NOT EXISTS duel_history (
  id TEXT PRIMARY KEY,
  winner_id TEXT NOT NULL,
  winner_name TEXT NOT NULL,
  loser_id TEXT NOT NULL,
  loser_name TEXT NOT NULL,
  score TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 12. Presence Table
CREATE TABLE IF NOT EXISTS presence (
  user_id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'Online',
  last_active INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Initial Seeds for Developer & Default Bot
INSERT OR IGNORE INTO users (id, username, role, avatar, coins, totalGame, win, lose, status, lastSeen)
VALUES ('#1', 'Shiro Anna', 'Developer', 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1', 100000, 0, 0, 0, 'Online', (strftime('%s', 'now') * 1000));

INSERT OR IGNORE INTO bot_profile (id, name, avatar, bio, status)
VALUES ('default', 'Oguri Cap 🐎', 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1', 'Siap membantu Trainer dalam Tebak Kata & Musik Tracen Academy! 🥕', 'Online');

INSERT OR IGNORE INTO developer_badge (id, user_id, badge_name, theme_id, icon, effect)
VALUES ('dev_badge_main', '#1', 'Ruby Developer', 'ruby', '🔥', 'Shine & Glow');

-- Initial Developer Settings
INSERT OR IGNORE INTO developer_settings (id, setting_key, setting_value) VALUES ('ds_1', 'global_chat_enabled', 'true');
INSERT OR IGNORE INTO developer_settings (id, setting_key, setting_value) VALUES ('ds_2', 'live_duel_enabled', 'true');
INSERT OR IGNORE INTO developer_settings (id, setting_key, setting_value) VALUES ('ds_3', 'auto_duel_enabled', 'true');
INSERT OR IGNORE INTO developer_settings (id, setting_key, setting_value) VALUES ('ds_4', 'min_streak_banner', '5');
INSERT OR IGNORE INTO developer_settings (id, setting_key, setting_value) VALUES ('ds_5', 'min_streak_marquee', '5');
INSERT OR IGNORE INTO developer_settings (id, setting_key, setting_value) VALUES ('ds_6', 'max_polling_ms', '3000');
INSERT OR IGNORE INTO developer_settings (id, setting_key, setting_value) VALUES ('ds_7', 'duel_reward_coins', '5000');
INSERT OR IGNORE INTO developer_settings (id, setting_key, setting_value) VALUES ('ds_8', 'duel_cooldown_sec', '10');

