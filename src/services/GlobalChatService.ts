import { D1DatabaseService } from './D1DatabaseService';
import { StorageService } from './StorageService';
import { GlobalChatMessage, DirectMessage } from '../types';
import { SettingsService } from './SettingsService';
import { canonicalDirectRoomId } from '../utils/identity';
import { RealtimeService } from './SupabaseService';

// [TAMBAHAN 1] Import Socket IO Client
import { io, Socket } from 'socket.io-client';

const STORAGE_KEY_GLOBAL_CHAT = 'oguri_global_chat_messages';
const STORAGE_KEY_DIRECT_MESSAGES = 'oguri_direct_messages_map';

type GlobalChatListener = (messages: GlobalChatMessage[]) => void;
type DirectChatListener = (roomId: string, messages: DirectMessage[]) => void;

export class GlobalChatService {
  private static globalListeners: GlobalChatListener[] = [];
  private static directListeners: Map<string, DirectChatListener[]> = new Map();
  private static pollTimer: any = null;
  private static lastGlobalFetchTimestamp: number = 0;

  // [TAMBAHAN 2] Buat variabel untuk nyimpen koneksi socket
  private static socket: Socket | null = null;

  // Initial Seed Global Messages so chat isn't blank on start
  public static readonly INITIAL_GLOBAL_MESSAGES: GlobalChatMessage[] = [
    {
      id: 'gmsg_init_1',
      senderId: '#1',
      senderName: 'Shiro Anna',
      senderRole: 'Developer',
      senderAvatar: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
      text: 'Selamat datang di Global Chat Tracen Academy! 🐎⚡ Diskusi, kenalan, dan ikuti Live Duel langsung di sini!',
      time: '09:00',
      timestamp: Date.now() - 3600000,
    },
    {
      id: 'gmsg_init_2',
      senderId: 'default',
      senderName: 'Oguri Cap 🐎',
      senderRole: 'Trainer',
      senderAvatar: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
      text: 'Ada yang mau tanding Tebak Kata bareng Oguri? Ketik .tebakkata atau ajak Trainer lain duel! 🥕',
      time: '09:05',
      timestamp: Date.now() - 1800000,
    },
  ];

  // [TAMBAHAN 3] Fungsi khusus untuk menyambungkan socket ke server Pterodactyl/Termux
  public static initSocket() {
    if (!this.socket) {
      // Ganti URL ini dengan IP Pterodactyl kamu nanti jika sudah online
      this.socket = io('http://localhost:3000'); 

      this.socket.on('pesan_global', (msg: GlobalChatMessage) => {
        if (!msg || !msg.id) return;
        const current = this.getGlobalMessagesSync();
        
        // Cek agar tidak duplikat jika pesan berasal dari diri sendiri
        if (current.some((m) => m.id === msg.id)) return;
        
        const updated = [...current, msg].sort((a, b) => a.timestamp - b.timestamp);
        StorageService.setItem(STORAGE_KEY_GLOBAL_CHAT, updated);
        this.notifyGlobalListeners(updated);
      });
    }
  }

  public static onGlobalMessagesUpdate(listener: GlobalChatListener): () => void {
    this.globalListeners.push(listener);
    return () => {
      this.globalListeners = this.globalListeners.filter((fn) => fn !== listener);
    };
  }

  public static onDirectMessagesUpdate(roomId: string, listener: DirectChatListener): () => void {
    if (!this.directListeners.has(roomId)) {
      this.directListeners.set(roomId, []);
    }
    this.directListeners.get(roomId)!.push(listener);
    return () => {
      const list = this.directListeners.get(roomId) || [];
      this.directListeners.set(roomId, list.filter((fn) => fn !== listener));
    };
  }

  private static notifyGlobalListeners(messages: GlobalChatMessage[]) {
    this.globalListeners.forEach((fn) => fn(messages));
  }

  private static notifyDirectListeners(roomId: string, messages: DirectMessage[]) {
    const list = this.directListeners.get(roomId);
    if (list) {
      list.forEach((fn) => fn(roomId, messages));
    }
  }

  // ================= GLOBAL CHAT ================= //

  public static getGlobalMessagesSync(): GlobalChatMessage[] {
    const cached = StorageService.getItem<GlobalChatMessage[]>(STORAGE_KEY_GLOBAL_CHAT, this.INITIAL_GLOBAL_MESSAGES);
    return Array.isArray(cached) && cached.length > 0 ? cached : this.INITIAL_GLOBAL_MESSAGES;
  }

  public static async fetchGlobalMessages(): Promise<GlobalChatMessage[]> {
    const cached = this.getGlobalMessagesSync();
    try {
      const d1Messages = await D1DatabaseService.getGlobalMessages(this.lastGlobalFetchTimestamp);
      if (d1Messages && Array.isArray(d1Messages) && d1Messages.length > 0) {
        const existingMap = new Map(cached.map((m) => [m.id, m]));
        let changed = false;

        d1Messages.forEach((m) => {
          const prev = existingMap.get(m.id);
          if (
            !prev ||
            prev.timestamp !== m.timestamp ||
            prev.text !== m.text ||
            prev.senderId !== m.senderId ||
            prev.senderBadge !== m.senderBadge ||
            prev.senderBadgeName !== m.senderBadgeName ||
            prev.senderAvatar !== m.senderAvatar ||
            prev.senderRole !== m.senderRole
          ) {
            changed = true;
          }
          existingMap.set(m.id, m);
        });

        const merged = Array.from(existingMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        if (changed) {
          StorageService.setItem(STORAGE_KEY_GLOBAL_CHAT, merged);
          this.notifyGlobalListeners(merged);
        }
        if (merged.length > 0) {
          const last = merged[merged.length - 1] as any;
          this.lastGlobalFetchTimestamp = Math.max(this.lastGlobalFetchTimestamp, last.updatedAt || last.timestamp || Date.now());
        }
        return merged;
      }
    } catch (e) {
      console.warn('Error fetching global messages from D1:', e);
    }
    return cached;
  }

  public static async sendGlobalMessage(msg: {
    senderId: string;
    senderName: string;
    senderRole?: 'Developer' | 'Trainer';
    senderAvatar?: string;
    senderBadge?: string;
    senderBadgeName?: string;
    text: string;
    isDuelAnswer?: boolean;
  }): Promise<GlobalChatMessage> {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: GlobalChatMessage = {
      id: `gmsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderRole: msg.senderRole || 'Trainer',
      senderAvatar: msg.senderAvatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
      senderBadge: msg.senderBadge,
      senderBadgeName: msg.senderBadgeName,
      text: msg.text,
      isDuelAnswer: !!msg.isDuelAnswer,
      time: timeStr,
      timestamp: Date.now(),
    };

    const current = this.getGlobalMessagesSync();
    const updated = [...current, newMsg];
    StorageService.setItem(STORAGE_KEY_GLOBAL_CHAT, updated);
    this.notifyGlobalListeners(updated);

    // [TAMBAHAN 4] Tembak pesan seketika ke Server Socket untuk disebar
    if (this.socket) {
      this.socket.emit('kirim_pesan', newMsg);
    }

    try {
      // Data tetap disimpan ke D1 Database agar history tersimpan selamanya
      const saved = await D1DatabaseService.sendGlobalMessage(newMsg);
      if (saved) {
        this.lastGlobalFetchTimestamp = Math.max(this.lastGlobalFetchTimestamp, saved.timestamp || newMsg.timestamp);
      }
    } catch (e) {
      console.warn('Error sending global message to D1:', e);
    }

    return newMsg;
  }

  // ================= PRIVATE / DIRECT CHAT ================= //

  public static getDirectMessagesSync(roomId: string): DirectMessage[] {
    const storeMap = StorageService.getItem<Record<string, DirectMessage[]>>(STORAGE_KEY_DIRECT_MESSAGES, {});
    return storeMap[roomId] || [];
  }

  public static async fetchDirectMessages(roomId: string, userId: string = ''): Promise<DirectMessage[]> {
    const cached = this.getDirectMessagesSync(roomId);
    try {
      const d1Messages = await D1DatabaseService.getChatMessages(roomId, userId);
      if (d1Messages && Array.isArray(d1Messages)) {
        const storeMap = StorageService.getItem<Record<string, DirectMessage[]>>(STORAGE_KEY_DIRECT_MESSAGES, {});
        storeMap[roomId] = d1Messages;
        StorageService.setItem(STORAGE_KEY_DIRECT_MESSAGES, storeMap);
        this.notifyDirectListeners(roomId, d1Messages);
        return d1Messages;
      }
    } catch (e) {
      console.warn('Error fetching direct messages from D1:', e);
    }
    return cached;
  }

  public static async sendDirectMessage(
    roomId: string,
    senderId: string,
    receiverId: string,
    text: string
  ): Promise<DirectMessage> {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: DirectMessage = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId,
      receiverId,
      text,
      time: timeStr,
      timestamp: Date.now(),
      status: 'sent',
      isRead: false,
    };

    const storeMap = StorageService.getItem<Record<string, DirectMessage[]>>(STORAGE_KEY_DIRECT_MESSAGES, {});
    const current = storeMap[roomId] || [];
    const updated = [...current, newMsg];
    storeMap[roomId] = updated;

    StorageService.setItem(STORAGE_KEY_DIRECT_MESSAGES, storeMap);
    this.notifyDirectListeners(roomId, updated);

    // Simulate delivered -> read status progression
    setTimeout(() => {
      newMsg.status = 'delivered';
      StorageService.setItem(STORAGE_KEY_DIRECT_MESSAGES, storeMap);
      this.notifyDirectListeners(roomId, [...updated]);
    }, 1000);

    setTimeout(() => {
      newMsg.status = 'read';
      newMsg.isRead = true;
      StorageService.setItem(STORAGE_KEY_DIRECT_MESSAGES, storeMap);
      this.notifyDirectListeners(roomId, [...updated]);
    }, 3000);

    try {
      const saved = await D1DatabaseService.sendChatMessage({
        id: newMsg.id,
        roomId,
        senderId,
        receiverId,
        text,
        time: timeStr,
        timestamp: newMsg.timestamp,
      });
      if (saved) {
        await this.fetchDirectMessages(roomId, senderId);
      }
    } catch (e) {
      console.warn('Error sending direct message to D1:', e);
    }

    return newMsg;
  }

  // Request browser desktop notification permission
  public static requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  public static showDesktopNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
        });
      } catch (e) {
        console.warn('Browser notification error:', e);
      }
    }
  }

  // ================= LIGHTWEIGHT POLLING SYSTEM (MODIFIED FOR SOCKET) ================= //

  public static startPolling(userId: string = '') {
    this.requestNotificationPermission();

    // [TAMBAHAN 5] Nyalakan koneksi socket saat aplikasi pertama dimuat
    this.initSocket();

    // Matikan polling bawaan agar chat mengandalkan Socket real-time murni (tidak bikin berat DB)
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public static stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

// Auto-subscribe to Realtime Broadcast Events for Instant Chat Updates (Supabase/Backup)
RealtimeService.subscribe('global_message_new', (msg: GlobalChatMessage) => {
  if (!msg || !msg.id) return;
  const current = GlobalChatService.getGlobalMessagesSync();
  if (current.some((m) => m.id === msg.id)) return;
  const updated = [...current, msg].sort((a, b) => a.timestamp - b.timestamp);
  StorageService.setItem(STORAGE_KEY_GLOBAL_CHAT, updated);
  (GlobalChatService as any).notifyGlobalListeners(updated);
});

RealtimeService.subscribe('direct_message_new', (msg: DirectMessage) => {
  if (!msg || !msg.id) return;
  const targetRoomId = msg.roomId || (msg.receiverId ? canonicalDirectRoomId(msg.senderId, msg.receiverId) : null);
  if (!targetRoomId) return;
  const storeMap = StorageService.getItem<Record<string, DirectMessage[]>>(STORAGE_KEY_DIRECT_MESSAGES, {});
  const current = storeMap[targetRoomId] || [];
  if (current.some((m) => m.id === msg.id)) return;
  const updated = [...current, msg].sort((a, b) => a.timestamp - b.timestamp);
  storeMap[targetRoomId] = updated;
  StorageService.setItem(STORAGE_KEY_DIRECT_MESSAGES, storeMap);
  (GlobalChatService as any).notifyDirectListeners(targetRoomId, updated);
});