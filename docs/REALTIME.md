# ⚡ Realtime Synchronization & Supabase Integration Architecture

Dokumentasi arsitektur sinkronisasi real-time dan Supabase Client integration di **Tracen Academy**.

---

## 📡 Dual-Engine Realtime Architecture

Untuk memastikan latensi ultra-rendah dan keandalan tinggi, **Tracen Academy** menggabungkan dua mekanisme realtime:

1. **Supabase Realtime Broadcast Channels (`@supabase/supabase-js`)**:
   - Berfungsi mempublikasikan dan menerima pesan instant (0-latency broadcast) untuk Global Chat, Live Duel, Typing Indicator, dan Notifications.
2. **D1 Sync Engine (Smart Polling Fallback)**:
   - Apabila koneksi WebSocket Supabase terputus, frontend secara otomatis melakukan sinkronisasi delta berkala (3-4 detik) ke endpoint `/api/v1/sync/poll`.

---

## 🔑 Supabase Connection Credentials

- **Project URL**: `https://liecstkcclpkjkdqkvga.supabase.co`
- **Publishable Key**: `sb_publishable_*****`

---

## 📺 Broadcast Channels & Events

### 1. Channel `tracen_global_chat`
- **Event**: `new_message`
- **Payload Structure**:
  ```json
  {
    "id": "gmsg_1785117000_abcd",
    "senderId": "#1",
    "senderName": "Shiro Anna",
    "senderRole": "Developer",
    "senderBadge": "badge_legendary_rainbow",
    "senderBadgeName": "Supreme Dev",
    "text": "Halo para Trainer Tracen Academy! 🐎",
    "time": "20:00",
    "timestamp": 1785117000000
  }
  ```

### 2. Channel `tracen_presence`
- **Events**: `presence_heartbeat`, `user_status_change`
- Mengirimkan update status Online, Device, Browser, dan Aktivitas secara langsung.

### 3. Channel `tracen_live_duel`
- **Events**: `duel_start`, `duel_answer_submit`, `duel_round_advance`, `duel_finish`
- Mengelola state pertarungan Live Duel real-time antarpemain.

---

## 🔄 Re-connection & Error Handling Strategy

- **WebSocket Reconnection**: Apabila Supabase terputus, library `@supabase/supabase-js` melakukan auto-reconnect dengan exponential backoff.
- **State Hydration**: Setiap kali halaman dibuka atau jaringan tersambung kembali, frontend memanggil API D1 (`/api/v1/chat/global`, `/api/v1/badges/user`) untuk mengambil state resmi terbaru dari Cloudflare D1.
