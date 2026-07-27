import { D1DatabaseService } from './D1DatabaseService';
import { StorageService } from './StorageService';
import { GlobalChatMessage, DirectMessage } from '../types';
import { SettingsService } from './SettingsService';
import { RealtimeService } from './SupabaseService';

const STORAGE_KEY_GLOBAL_CHAT = 'oguri_global_chat_messages';
const STORAGE_KEY_DIRECT_MESSAGES = 'oguri_direct_messages_map';

type GlobalChatListener = (messages: GlobalChatMessage[]) => void;
type DirectChatListener = (roomId: string, messages: DirectMessage[]) => void;

export class GlobalChatService {
  private static globalListeners: GlobalChatListener[] = [];
  private static directListeners: Map<string, DirectChatListener[]> = new Map();
  private static pollTimer: any = null;
  private static lastGlobalFetchTimestamp: number = 0;

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
          if (!prev || prev.timestamp !== m.timestamp || prev.text !== m.text || prev.senderId !== m.senderId) {
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

    try {
      await D1DatabaseService.sendGlobalMessage(newMsg);
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

  public static async fetchDirectMessages(roomId: string, userId: string = 'trainer_01'): Promise<DirectMessage[]> {
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
      await D1DatabaseService.sendChatMessage({
        id: newMsg.id,
        roomId,
        senderId,
        receiverId,
        text,
        time: timeStr,
        timestamp: newMsg.timestamp,
      });
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

  // ================= LIGHTWEIGHT POLLING SYSTEM ================= //

  public static startPolling(userId: string = 'trainer_01') {
    this.requestNotificationPermission();

    if (this.pollTimer) clearInterval(this.pollTimer);

    const settings = SettingsService.getSettingsSync();
    const pollInterval = Math.max(1000, settings.maxPollingMs || 1000);

    this.pollTimer = setInterval(() => {
      if (settings.globalChatEnabled) {
        this.fetchGlobalMessages().catch(() => {});
      }
    }, pollInterval);
  }

  public static stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

// Auto-subscribe to Realtime Broadcast Events for Instant Chat Updates
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
  const targetRoomId = msg.roomId || (msg.receiverId ? [msg.senderId, msg.receiverId].sort().join('_') : null);
  if (!targetRoomId) return;
  const storeMap = StorageService.getItem<Record<string, DirectMessage[]>>(STORAGE_KEY_DIRECT_MESSAGES, {});
  const current = storeMap[targetRoomId] || [];
  if (current.some((m) => m.id === msg.id)) return;
  const updated = [...current, msg].sort((a, b) => a.timestamp - b.timestamp);
  storeMap[targetRoomId] = updated;
  StorageService.setItem(STORAGE_KEY_DIRECT_MESSAGES, storeMap);
  (GlobalChatService as any).notifyDirectListeners(targetRoomId, updated);
});
