# 🗄️ Database Architecture & D1 Schema Documentation

Dokumentasi terperinci mengenai struktur database Cloudflare D1 / SQLite untuk aplikasi **Tracen Academy**.

---

## 📊 Overview Database D1

Database D1 menggunakan SQLite engine (via `sql.js` WebAssembly di backend Express). Seluruh tabel dan index didefinisikan dalam file `schema.sql`.

---

## 📐 Skema Tabel Database

### 1. Tabel `users`
Menyimpan data pengguna, koin, poin kemenangan, dan status role.

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  avatar TEXT,
  role TEXT DEFAULT 'Trainer',
  status TEXT DEFAULT 'Online',
  coins INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  max_win_streak INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  total_game INTEGER DEFAULT 0,
  win INTEGER DEFAULT 0,
  lose INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_online TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Tabel `user_badges` (Fitur Koleksi Badge)
Menyimpan kepemilikan badge, nama kustom badge (maksimal 7 kata), dan status badge aktif.

```sql
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
```

### 3. Tabel `shop_products`
Katalog paket produk Premium yang tersedia di Shop.

```sql
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
```

### 4. Tabel `shop_orders`
Riwayat penarikan paket Premium Wibuku oleh Trainer.

```sql
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
```

### 5. Tabel `coin_history`
Catatan mutasi penambahan dan pengurangan Carrot Coin.

```sql
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

### 6. Tabel `global_chat_messages`
Pesan diskusi real-time di Global Chat.

```sql
CREATE TABLE IF NOT EXISTS global_chat_messages (
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
  timestamp INTEGER NOT NULL
);
```

---

## 🎖 Master Tier Badge & Harga

- **Common (2.000 Coin)**: `badge_common_red`, `badge_common_blue`, `badge_common_green`, `badge_common_yellow` (Warna polos tanpa efek).
- **Rare (5.000 Coin)**: `badge_rare_red_blue`, `badge_rare_yellow_green`, `badge_rare_purple_blue`, `badge_rare_red_purple`, `badge_rare_cyan_blue` (Gradien 2 warna elegan).
- **Epic (20.000 Coin)**: `badge_epic_red`, `badge_epic_blue`, `badge_epic_green`, `badge_epic_yellow`, `badge_epic_purple` (Gradien mewah + efek kilatan/shine setiap ±2 detik).
- **Legendary (45.000 Coin)**: `badge_legendary_rainbow` (Rainbow Pulse 5 warna dengan animasi infinity loop menyebar dari tengah).

---

## 🛡️ Pemulihan Malformed Database Error

Jika terjadi masalah disk image malformed pada file sqlite local:
1. Hapus file `database.sqlite` / `game.db` lokal di directory app.
2. Restart backend server (`npm run dev`). Server akan otomatis membuat ulang database SQLite bersih dari `schema.sql`.
