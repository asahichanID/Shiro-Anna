# ⚡ Realtime Synchronization & Supabase Integration Architecture

Dokumentasi mengenai sistem sinkronisasi realtime, Supabase Client integration, dan Presence Tracking pada aplikasi **Tracen Academy**.

---

## 🌐 Arsitektur Hybrid Realtime

Aplikasi Tracen Academy menggunakan pendekatan **Dual-Backend Realtime Hybrid**:
1. **Supabase Realtime Channel (`@supabase/supabase-js`)**: Digunakan untuk penyiaran instant (Broadcast Events) pesan Global Chat, updates Live Duel, dan Presence Tracking antarpengguna.
2. **D1 Polling Fallback (Smart Polling Engine)**: Apabila Supabase mengalami kendala konektivitas, sistem secara otomatis beralih ke interval polling ringan (2-3 detik) dari REST API D1.

---

## 🔑 Supabase Connection Credentials

- **Project URL**: `https://liecstkcclpkjkdqkvga.supabase.co`
- **Publishable Key**: `sb_publishable_1BE8rNRK67AGBnt2jGT6iw_iIPHWXLz`

---

## 📡 Saluran Realtime (Realtime Channels)

### 1. Channel `tracen_global_chat`
Memfasilitasi penyiaran pesan Global Chat secara instant.
- **Event**: `new_message`
- **Payload**:
  ```json
  {
    "id": "gmsg_1785117000_abcd",
    "senderId": "#1",
    "senderName": "Shiro Anna",
    "senderRole": "Developer",
    "senderBadge": "badge_legendary_rainbow",
    "text": "Halo semua Trainer!",
    "timestamp": 1785117000000
  }
  ```

### 2. Channel `tracen_live_duel`
Mengelola sinkronisasi pertarungan Live Duel antar Trainer.
- **Events**: `duel_start`, `duel_answer_submit`, `duel_round_advance`, `duel_finish`.

### 3. Channel `tracen_presence`
Melacak status pengguna (Online, Away, Offline) dan pembaruan Win Streak secara konsisten.

---

## 🔄 Alur Sinkronisasi Badge & Profile State

1. **Pembelian Badge di Shop**:
   - User mengirimkan `POST /api/v1/badges/buy`.
   - D1 memverifikasi sisa koin dan mencatat entri baru ke tabel `user_badges`.
   - D1 mengembalikan koin terbaru.
   - Frontend memperbarui state lokal di `ProfileContext` secara otomatis.

2. **Pengubahan Badge Aktif / Rename Badge**:
   - User memperbarui status badge melalui menu **Profile > Badge Collection**.
   - API `POST /api/v1/badges/set-active` dan `POST /api/v1/badges/rename` memperbarui D1.
   - Pemasangan badge langsung disinkronkan ke pengiriman pesan Global Chat berikutnya (`senderBadge`).
