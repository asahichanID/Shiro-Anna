# 🚀 Setup & Local Development Guide - Tracen Academy App

Panduan lengkap untuk menginstal, menjalankan, dan mengonfigurasi proyek **Tracen Academy** secara lokal.

---

## 📋 Prasyarat Sistem

- **Node.js**: v18.0.0 atau lebih baru (Disarankan v20 LTS)
- **npm**: v9.0.0 atau lebih baru
- **Browser**: Google Chrome, Mozilla Firefox, Microsoft Edge, atau Safari modern dengan dukungan WebAssembly dan ES6 Module.

---

## 🛠 Langkah Instalasi

1. **Clone / Buka Repositori Proyek**
   ```bash
   cd /app/applet
   ```

2. **Instal Dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variable (`.env.example`)**
   Buat file `.env` berdasarkan `.env.example`:
   ```env
   PORT=3000
   VITE_SUPABASE_URL=https://liecstkcclpkjkdqkvga.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_1BE8rNRK67AGBnt2jGT6iw_iIPHWXLz
   ```

4. **Inisialisasi Database D1 Local (sql.js / WebAssembly)**
   Database SQLite local D1 akan terinisialisasi secara otomatis saat aplikasi dimulai. File database akan disimpan di memori dan disinkronkan ke file `.sqlite` local.
   Jika schema memerlukan pembaharuan ulang, schema utama berada di file `schema.sql`.

---

## 🏃 Memulai Server Pengembangan (Dev Mode)

Jalankan perintah berikut untuk memulai Vite dev server:

```bash
npm run dev
```

Aplikasi akan berjalan pada **http://localhost:3000**.

---

## 📦 Production Build & Type Check

1. **Menjalankan Type Check (TypeScript)**:
   ```bash
   npm run build
   ```

2. **Menjalankan Linter**:
   ```bash
   npm run lint
   ```

---

## 📁 Struktur Direktori Proyek

```
/
├── docs/                      # Dokumentasi Proyek
│   ├── SETUP.md               # Panduan Instalasi & Pengoperasian
│   ├── DATABASE.md            # Skema & Dokumentasi Database D1
│   ├── REALTIME.md            # Arsitektur Realtime & Supabase
│   └── DEPLOY.md              # Panduan Deployment Production
├── src/
│   ├── components/            # Komponen UI React
│   │   ├── DeveloperBadge.tsx  # Komponen Display & Animasi Badge
│   │   ├── ProfileView.tsx     # Profil & Badge Collection Menu
│   │   ├── ShopView.tsx        # Toko Premium, Badge Shop, & Riwayat
│   │   ├── ChatSimulator.tsx   # Chat Global, Direct Chat, & Live Duel
│   │   └── ...
│   ├── config/
│   │   └── badgeThemes.ts     # Konfigurasi Master Badge & Rarity
│   ├── context/
│   │   └── ProfileContext.tsx # Context Management Profil & Coins
│   ├── services/
│   │   ├── D1DatabaseService.ts# Layanan API Database D1
│   │   ├── SupabaseService.ts  # Integration Engine Supabase Realtime
│   │   └── ...
│   ├── types/
│   │   └── index.ts           # Definisi TypeScript Interface & Types
│   ├── App.tsx                # Entri Komponen Utama
│   └── main.tsx               # Entry Point React DOM
├── server.ts                  # Express Backend Server & REST API
├── schema.sql                 # D1 Database SQL Schema
└── package.json               # Konfigurasi Package & Dependency
```
