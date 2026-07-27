# 🚀 Setup & Local Development Guide - Tracen Academy

Dokumentasi lengkap untuk menginstal, menjalankan, dan mengonfigurasi proyek **Tracen Academy** di lingkungan lokal maupun Cloudflare Stack (Pages / Worker / D1 / Supabase Realtime).

---

## 🏛️ Arsitektur Proyek

Aplikasi **Tracen Academy** dibangun dengan arsitektur server-side proxy + realtime hybrid:

```
+-----------------------------------------------------------------------+
|                            FRONTEND (React)                           |
|       (UI Views, ProfileContext, Badge Themes, Recharts, Lucide)     |
+-----------------------------------++----------------------------------+
                                    || (REST / API v1)
                                    \/
+-----------------------------------------------------------------------+
|                 BACKEND SERVICE / WORKER (Express / Node)             |
|   Handles /api/v1/ REST Endpoints, Coin Mutation, Shop & Badges Logic  |
+-----------------------------------++----------------------------------+
                                    || (SQL Query & Execution)
                                    \/
+-----------------------------------------------------------------------+
|                      SOURCE OF TRUTH: CLOUDFLARE D1                   |
| (SQLite Engine: Users, User Badges, Shop Products, Orders, History)   |
+-----------------------------------++----------------------------------+
                                    || (Broadcast Event Trigger)
                                    \/
+-----------------------------------------------------------------------+
|                    REALTIME LAYER: SUPABASE REALTIME                  |
|    Broadcast Channels: Global Chat, Live Duel, Presence, Notifications|
+-----------------------------------------------------------------------+
```

### Data Flow
`Frontend` ➔ `Worker / Server API (/api/v1/*)` ➔ `Cloudflare D1 Database (Source of Truth)` ➔ `Supabase Realtime Channel` ➔ `All Frontend Clients`

---

## 📋 Prasyarat Sistem

- **Node.js**: v18.0.0+ (Disarankan v20 LTS)
- **npm**: v9.0.0+
- **Wrangler CLI** (Opsional untuk deploy Worker/D1): `npm install -g wrangler`
- **Browser**: Google Chrome, Mozilla Firefox, atau Safari modern dengan dukungan WebAssembly.

---

## ⚙️ Environment Variables

Buat file `.env` di root direktori berdasarkan `.env.example`:

```env
# Server Port
PORT=3000

# Supabase Realtime Credentials
VITE_SUPABASE_URL=https://liecstkcclpkjkdqkvga.supabase.co
VITE_SUPABASE_KEY=sb_publishable_1BE8rNRK67AGBnt2jGT6iw_iIPHWXLz

# Cloudflare D1 Credentials (Optional for local emulation)
CLOUDFLARE_D1_DATABASE_ID=d1-tracen-db
```

---

## 🛠️ Langkah Instalasi & Jalankan Lokal

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Jalankan Development Server**
   ```bash
   npm run dev
   ```
   Aplikasi akan dapat diakses di `http://localhost:3000`. Backend Express dan Vite dev middleware berjalan bersama secara seamless di port 3000.

3. **Inisialisasi Database D1 Local**
   D1 database local (`d1_database.sqlite`) diinisialisasi otomatis saat server berjalan berdasarkan `schema.sql`.

---

## 🧪 Validasi Codebase

```bash
# Type Check
npm run build

# Linting
npm run lint
```
