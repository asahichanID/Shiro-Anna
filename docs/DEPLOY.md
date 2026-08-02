# 🚀 Production Deployment & Debugging Guide

Dokumentasi lengkap untuk merilis, mendeploy, dan melakukan debugging pada aplikasi **Tracen Academy** ke Cloudflare Stack (Pages / Worker / D1).

---

## 🏗️ Production Build Command

Proyek ini menggunakan kompilasi ganda untuk client React SPA dan backend Node Express / Cloudflare Worker API.

Perintah utama:
```bash
npm run build
```

Langkah kompilasi yang dijalankan:
1. `vite build` — Menghasilkan bundle SPA terkompresi di folder `dist/`.
2. `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs` — Membundel backend Express ke `dist/server.cjs`.

---

## ☁️ Deploy ke Cloudflare Pages & D1

### 1. Inisialisasi Cloudflare D1 Database
```bash
npx wrangler d1 create d1-tracen-db
```
Catat `database_id` yang dihasilkan dan tambahkan ke `wrangler.toml`:

```toml
name = "tracen-academy"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "d1-tracen-db"
database_id = "YOUR_D1_DATABASE_ID"
```

### 2. Eksekusi Schema ke Cloudflare D1 Production
```bash
npx wrangler d1 execute d1-tracen-db --remote --file=./schema.sql
```

### 3. Deploy Frontend ke Cloudflare Pages
```bash
npx wrangler pages deploy dist --project-name=tracen-academy
```

---

## 🔍 Debugging & Troubleshooting

### 1. Reset Database D1 Local
Apabila terjadi error disk image malformed pada database SQLite lokal:
```bash
rm -f d1_database.sqlite
npm run dev
```
Backend akan secara otomatis meregenerasi database SQLite bersih berdasarkan `schema.sql`.

### 2. Memeriksa Logs Server API
Jalankan server dengan variabel log terperinci:
```bash
NODE_ENV=development npm run dev
```

---

## ✅ Deployment Checklist

- [x] **Type Check**: Passed (`npm run build`).
- [x] **Linting**: Passed (`npm run lint`).
- [x] **Schema Compliance**: `schema.sql` sudah mencakup seluruh tabel (`users`, `user_badges`, `shop_products`, `shop_orders`, `coin_history`, dll).
- [x] **New User Default Coins**: 0 Coins.
- [x] **Developer Coins**: Unlimited (999,999,999 Coins).
- [x] **Realtime Integration**: Supabase Realtime broadcast channels verified.
