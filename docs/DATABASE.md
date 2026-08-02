# 🗄️ Database Architecture & Cloudflare D1 Schema Documentation

Cloudflare D1 bertindak sebagai **Single Source of Truth** untuk seluruh state pengguna, produk toko, transaksi, koleksi badge, pesan, serta riwayat di **Tracen Academy**.

---

## 📐 Schema SQL Lengkap (`schema.sql`)

```sql
-- Cloudflare D1 Database Schema Migration for Oguri Cap Web App
-- Database Binding: DB
-- API Route Prefix: /api/v1/

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'Trainer',
  avatar TEXT,
  coins INTEGER DEFAULT 0,
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
  sender_badge TEXT,
  sender_badge_name TEXT,
  text TEXT NOT NULL,
  is_duel_answer INTEGER DEFAULT 0,
  time TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 10. User Badges Table (Badge Shop & Collection)
CREATE TABLE IF NOT EXISTS user_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  custom_name TEXT DEFAULT '',
  is_active INTEGER DEFAULT 0,
  bought_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, badge_id)
);

-- 11. Shop Products Table
CREATE TABLE IF NOT EXISTS shop_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration TEXT NOT NULL,
  coins INTEGER NOT NULL,
  stock INTEGER DEFAULT 100,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 12. Shop Orders Table
CREATE TABLE IF NOT EXISTS shop_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  wibuku_name TEXT NOT NULL,
  wibuku_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  duration TEXT NOT NULL,
  coins INTEGER NOT NULL,
  status TEXT DEFAULT 'Pending',
  timestamp INTEGER NOT NULL
);

-- 13. Coin History Table
CREATE TABLE IF NOT EXISTS coin_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  detail TEXT,
  timestamp INTEGER NOT NULL
);
```

---

## 🔌 Endpoint API Utama (`/api/v1/*`)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/api/v1/users/register-or-login` | Registrasi / Login user & inisialisasi koin (New user = 0, Dev = 999999999) |
| `POST` | `/api/v1/users/update` | Memperbarui profil, koin, & statistik game |
| `GET`  | `/api/v1/users/list` | Mendapatkan daftar seluruh user terdaftar & status presence |
| `GET`  | `/api/v1/badges/user` | Mendapatkan daftar badge yang dimiliki & badge aktif |
| `POST` | `/api/v1/badges/buy` | Membeli badge di Shop dengan koin |
| `POST` | `/api/v1/badges/set-active` | Memasang / melepas badge aktif |
| `POST` | `/api/v1/badges/rename` | Mengubah nama tampilan kustom badge (max 7 kata) |
| `GET`  | `/api/v1/shop/products` | Mendapatkan katalog paket Premium Wibuku |
| `POST` | `/api/v1/shop/orders/create` | Membuat pesanan penarikan paket Premium Wibuku |
| `GET`  | `/api/v1/shop/orders/list` | Mendapatkan riwayat pesanan penarikan |
| `GET`  | `/api/v1/shop/coin-history` | Mendapatkan log mutasi koin |
| `GET`  | `/api/v1/chat/global` | Mendapatkan histori pesan Global Chat |
| `POST` | `/api/v1/chat/global/send` | Mengirim pesan ke Global Chat |
