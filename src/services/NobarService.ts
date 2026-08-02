import { RealtimeService } from './SupabaseService';
import { StorageService } from './StorageService';

export interface NobarMedia {
  id: string;
  title: string;
  artistOrChannel?: string;
  thumbnail?: string;
  url: string; // Direct stream or YouTube videoId/URL
  sourceUrl?: string;
  type: 'video' | 'music';
  source: 'youtube' | 'spotify' | 'tiktok' | 'cdn';
  videoId?: string;
  playedBy: string;
  playedByAvatar?: string;
  playedAt: number;
}

export interface NobarChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string;
  text: string;
  time: string;
  timestamp: number;
}

const STORAGE_KEY_NOBAR_STATE = 'oguri_nobar_current_media';
const STORAGE_KEY_NOBAR_CHAT = 'oguri_nobar_chat_messages';

type MediaUpdateListener = (media: NobarMedia | null, notification: string | null) => void;
type ChatUpdateListener = (messages: NobarChatMessage[]) => void;

export class NobarService {
  private static mediaListeners: MediaUpdateListener[] = [];
  private static chatListeners: ChatUpdateListener[] = [];
  private static currentMedia: NobarMedia | null = null;
  private static isInitialized = false;

  public static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load saved state from StorageService
    const saved = StorageService.getItem<NobarMedia | null>(STORAGE_KEY_NOBAR_STATE, null);
    if (saved) {
      this.currentMedia = saved;
    }

    // Subscribe to Realtime events
    RealtimeService.subscribe('nobar_media_changed', (payload: any) => {
      if (!payload) return;
      if (payload.action === 'stop') {
        this.currentMedia = null;
        StorageService.removeItem(STORAGE_KEY_NOBAR_STATE);
        this.notifyMediaListeners(null, null);
      } else if (payload.media) {
        this.currentMedia = payload.media;
        StorageService.setItem(STORAGE_KEY_NOBAR_STATE, payload.media);
        const notificationText = `${payload.media.playedBy} memutar ${payload.media.type === 'video' ? 'video' : 'musik'}`;
        this.notifyMediaListeners(payload.media, notificationText);
      }
    });

    RealtimeService.subscribe('nobar_chat_message', (msg: NobarChatMessage) => {
      if (!msg || !msg.id) return;
      const currentMsgs = this.getChatMessagesSync();
      if (currentMsgs.some((m) => m.id === msg.id)) return;

      const updated = [...currentMsgs, msg].sort((a, b) => a.timestamp - b.timestamp);
      StorageService.setItem(STORAGE_KEY_NOBAR_CHAT, updated);
      this.notifyChatListeners(updated);
    });
  }

  public static getCurrentMediaSync(): NobarMedia | null {
    if (!this.currentMedia) {
      this.currentMedia = StorageService.getItem<NobarMedia | null>(STORAGE_KEY_NOBAR_STATE, null);
    }
    return this.currentMedia;
  }

  public static getChatMessagesSync(): NobarChatMessage[] {
    const list = StorageService.getItem<NobarChatMessage[]>(STORAGE_KEY_NOBAR_CHAT, []);
    if (!list || list.length === 0) {
      return [
        {
          id: 'nobar_welcome',
          senderId: 'bot',
          senderName: 'Oguri Cap 🐎',
          senderRole: 'Trainer',
          senderAvatar: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
          text: 'Selamat datang di Ruang Nobar Global! 🍿 Pilih video YouTube atau musik untuk diputar dan ditonton bersama secara realtime!',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now() - 60000,
        },
      ];
    }
    return list;
  }

  public static playMedia(media: NobarMedia) {
    this.currentMedia = media;
    StorageService.setItem(STORAGE_KEY_NOBAR_STATE, media);

    const notificationText = `${media.playedBy} memutar ${media.type === 'video' ? 'video' : 'musik'}`;
    this.notifyMediaListeners(media, notificationText);

    // Broadcast to all connected users
    RealtimeService.broadcast('nobar_media_changed', {
      action: 'play',
      media,
    });
  }

  public static stopMedia() {
    this.currentMedia = null;
    StorageService.removeItem(STORAGE_KEY_NOBAR_STATE);
    this.notifyMediaListeners(null, null);

    RealtimeService.broadcast('nobar_media_changed', {
      action: 'stop',
    });
  }

  public static sendChatMessage(
    text: string,
    user: { id: string; name: string; avatar?: string; role?: string }
  ) {
    const cleanText = text.trim();
    if (!cleanText) return;

    const newMsg: NobarChatMessage = {
      id: `nobar_msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role || 'User',
      senderAvatar: user.avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
      text: cleanText,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
    };

    const currentMsgs = this.getChatMessagesSync();
    const updated = [...currentMsgs, newMsg].sort((a, b) => a.timestamp - b.timestamp);
    StorageService.setItem(STORAGE_KEY_NOBAR_CHAT, updated);
    this.notifyChatListeners(updated);

    RealtimeService.broadcast('nobar_chat_message', newMsg);
  }

  public static onMediaChange(listener: MediaUpdateListener): () => void {
    this.mediaListeners.push(listener);
    return () => {
      this.mediaListeners = this.mediaListeners.filter((l) => l !== listener);
    };
  }

  public static onChatUpdate(listener: ChatUpdateListener): () => void {
    this.chatListeners.push(listener);
    return () => {
      this.chatListeners = this.chatListeners.filter((l) => l !== listener);
    };
  }

  private static notifyMediaListeners(media: NobarMedia | null, notification: string | null) {
    this.mediaListeners.forEach((l) => l(media, notification));
  }

  private static notifyChatListeners(messages: NobarChatMessage[]) {
    this.chatListeners.forEach((l) => l(messages));
  }
}

// Auto-initialize on module load
NobarService.init();
