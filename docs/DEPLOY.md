# 🚀 Deployment Guide - Production Deployment

Dokumentasi untuk mendistribusikan dan merilis aplikasi **Tracen Academy** ke lingkungan produksi (Cloud Run / AI Studio Platform).

---

## 🏗️ Kompilasi Production (Build Workflow)

Proyek ini dikompilasi menggunakan bundling Vite untuk client React dan esbuild untuk backend Express TypeScript.

Perintah build utama:
```bash
npm run build
```

Proses build mencakup:
1. `vite build` — Menghasilkan bundle SPA teroptimasi di folder `dist/`.
2. `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs` — Menghasilkan bundel Node.js backend tunggal di `dist/server.cjs`.

---

## 🏃 Menjalankan Aplikasi di Production

Jalankan backend yang telah dibundel menggunakan Node.js:

```bash
npm start
```
Perintah ini akan menjalankan `node dist/server.cjs` pada host `0.0.0.0` dan port `3000`.

---

## 🛡️ Checklist Siap Rilis (Ready to Deploy Checklist)

- [x] **Build Status**: Terverifikasi sukses tanpa error (`npm run build`).
- [x] **Type Check Status**: Bebas dari error tipe TypeScript (`tsc --noEmit`).
- [x] **Lint Status**: Bebas dari syntax error fatal (`npm run lint`).
- [x] **D1 Database Schema**: Tabel `users`, `shop_products`, `shop_orders`, `coin_history`, dan `user_badges` terdefinisi dengan lengkap di `schema.sql`.
- [x] **Realtime Synchronization**: Supabase integration terkonfigurasi dengan URL & Anon Key yang valid.
- [x] **Badge Shop & Profile Collection**: Teruji penuh untuk Common, Rare, Epic, dan Legendary tiers.
