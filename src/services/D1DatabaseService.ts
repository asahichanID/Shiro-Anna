/**
 * Cloudflare D1 Database REST Client Service
 * Interacts with D1 Worker API Gateway at /api/v1/*
 */

import { WORKER_BASE_URL } from '../api/client';
import { AppUser, Friend, DirectMessage, UserStatus, GlobalChatMessage, LiveDuelSession, DeveloperSettings, ShopProduct, ShopOrder, ShopSettings, ShopStats, CoinHistoryItem } from '../types';
import { BotProfile } from './BotService';
import { ActivityLog } from './ActivityService';
import { BadgeThemeId } from '../config/badgeThemes';
import { RealtimeService } from './SupabaseService';


export interface DeveloperBadgeData {
  id?: string;
  userId: string;
  badgeName: string;
  themeId: BadgeThemeId;
  icon: string;
  effect: string;
  updatedAt?: number;
}

export interface SyncDeltaPayload {
  users?: AppUser[];
  friends?: Friend[];
  presence?: Array<{ userId: string; status: UserStatus; lastActive: number; updatedAt: number }>;
  messages?: DirectMessage[];
  globalMessages?: GlobalChatMessage[];
  activityLogs?: ActivityLog[];
  notifications?: Array<{ id: string; userId: string; title: string; body: string; type: string; isRead: boolean; timestamp: number; updatedAt: number }>;
  botProfile?: BotProfile;
  developerBadge?: DeveloperBadgeData;
  settings?: Array<{ settingKey: string; settingValue: string; updatedAt: number }>;
  duel?: Array<{ id: string; status: string; updatedAt: number }>;
  shopProducts?: ShopProduct[];
  shopOrders?: ShopOrder[];
  coinHistory?: CoinHistoryItem[];
  userBadges?: Array<{ id: string; user_id: string; badge_id: string; custom_name: string; is_active: number; updatedAt: number }>;
  activeUsers?: AppUser[];
  unreadNotificationsCount?: number;
  hasChanges?: boolean;
}

export interface SyncPayload {
  lastTimestamp: number;
  changed?: SyncDeltaPayload;
  botProfile?: BotProfile;
  developerBadge?: DeveloperBadgeData;
  activeUsers?: AppUser[];
  friends?: Friend[];
  newMessages?: DirectMessage[];
  activityLogs?: ActivityLog[];
  unreadNotificationsCount?: number;
  hasChanges?: boolean;
}

export class D1DatabaseService {
  private static get baseUrl(): string {
    if (typeof window !== 'undefined') {
      return '/api/v1';
    }
    return 'http://127.0.0.1:3000/api/v1';
  }

  /**
   * Helper method to perform GET requests to D1 endpoints
   */
  private static async get<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    const queryParts: string[] = [];
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      }
    });
    const q = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const url = `${this.baseUrl}${endpoint}${q}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          console.warn(`[D1 API GET ERROR ${res.status}] Endpoint: ${endpoint}`);
          return null;
        }
        const json = await res.json();
        return json.result !== undefined ? json.result : json;
      } catch (e) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
        console.warn(`[D1 API GET EXCEPTION] ${endpoint}:`, e);
        return null;
      }
    }
    return null;
  }

  /**
   * Helper method to perform POST requests to D1 endpoints
   */
  private static async post<T>(endpoint: string, body: any): Promise<T | null> {
    const url = `${this.baseUrl}${endpoint}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          console.warn(`[D1 API POST ERROR ${res.status}] Endpoint: ${endpoint}`);
          return null;
        }
        const json = await res.json();
        return json.result !== undefined ? json.result : json;
      } catch (e) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
        console.warn(`[D1 API POST EXCEPTION] ${endpoint}:`, e);
        return null;
      }
    }
    return null;
  }

  // ================= USERS & PRESENCE ================= //

  public static async registerOrLoginUser(payload: {
    id?: string;
    username: string;
    role?: 'Developer' | 'Trainer';
    avatar?: string;
    coins?: number;
    totalGame?: number;
    win?: number;
    lose?: number;
    accountCode?: string;
    sessionToken?: string;
    device?: string;
    browser?: string;
  }): Promise<AppUser | null> {
    const result = await this.post<AppUser>('/users/register-or-login', payload);
    if (!result) {
      console.error('[D1 USER INSERT FAIL] Failed to register or login user on D1 database:', payload);
    } else {
      RealtimeService.broadcast('user_stats_updated', result);
    }
    return result;
  }

  public static async updateUserStats(payload: {
    id: string;
    username?: string;
    role?: 'Developer' | 'Trainer';
    avatar?: string;
    coins?: number;
    totalGame?: number;
    win?: number;
    lose?: number;
    status?: UserStatus;
  }): Promise<AppUser | null> {
    const result = await this.post<AppUser>('/users/update', payload);
    if (!result) {
      console.error('[D1 USER UPDATE FAIL] Failed to update user stats on D1 database:', payload);
    } else {
      RealtimeService.broadcast('user_stats_updated', result);
    }
    return result;
  }

  public static async updatePresence(payload: {
    userId: string;
    status: UserStatus;
    sessionToken?: string;
    device?: string;
    browser?: string;
  }): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/users/presence', payload);
    if (result && result.success) {
      RealtimeService.broadcast('user_presence_updated', { ...payload, lastSeen: Date.now() });
    }
    return !!(result && result.success);
  }

  public static async logoutUser(payload: { userId: string; sessionToken?: string }): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/users/logout', payload);
    if (result && result.success) {
      RealtimeService.broadcast('user_presence_updated', { userId: payload.userId, status: 'Offline', lastSeen: Date.now() });
    }
    return !!(result && result.success);
  }

  public static async getUsers(): Promise<AppUser[]> {
    const result = await this.get<AppUser[]>('/users');
    if (!result) {
      console.error('[D1 SELECT USERS FAIL] Failed to fetch user list from D1 database');
    }
    return result || [];
  }

  // ================= FRIENDS ================= //

  public static async getFriends(userId: string): Promise<Friend[]> {
    const result = await this.get<Friend[]>('/friends', { userId });
    if (!result) {
      console.error(`[D1 SELECT FRIENDS FAIL] Failed to fetch friends for userId ${userId}`);
    }
    return result || [];
  }

  public static async addFriend(userId: string, friend: Partial<Friend>): Promise<Friend | null> {
    const result = await this.post<Friend>('/friends', { userId, friend });
    if (!result) {
      console.error('[D1 INSERT FRIEND FAIL] Failed to add friend in D1 database:', friend);
    } else {
      RealtimeService.broadcast('friend_updated', { userId, friend: result, action: 'add' });
    }
    return result;
  }

  public static async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/friends/remove', { userId, friendId });
    if (result && result.success) {
      RealtimeService.broadcast('friend_updated', { userId, friendId, action: 'remove' });
    }
    return !!(result && result.success);
  }

  // ================= GLOBAL CHAT ================= //

  public static async getGlobalMessages(sinceTimestamp?: number): Promise<GlobalChatMessage[]> {
    const params: Record<string, string> = {};
    if (sinceTimestamp) params.since = sinceTimestamp.toString();
    const result = await this.get<GlobalChatMessage[]>('/global-chat', params);
    if (!result) {
      console.warn('[D1 SELECT GLOBAL CHAT WARN] Could not fetch global chat messages from server');
    }
    return result || [];
  }

  public static async sendGlobalMessage(msg: Partial<GlobalChatMessage>): Promise<GlobalChatMessage | null> {
    const result = await this.post<GlobalChatMessage>('/global-chat', msg);
    if (!result) {
      console.error('[D1 INSERT CHAT FAIL] Failed to send global chat message to D1:', msg);
    } else {
      RealtimeService.broadcast('global_message_new', result);
    }
    return result;
  }

  // ================= LIVE DUEL ================= //

  public static async getActiveDuel(): Promise<LiveDuelSession | null> {
    const result = await this.get<LiveDuelSession>('/duel/active');
    return result;
  }

  public static async createDuel(duelData: Partial<LiveDuelSession>): Promise<LiveDuelSession | null> {
    const result = await this.post<LiveDuelSession>('/duel/start', duelData);
    if (result) {
      RealtimeService.broadcast('live_duel_updated', result);
    }
    return result;
  }

  public static async updateDuel(duelData: Partial<LiveDuelSession>): Promise<LiveDuelSession | null> {
    const result = await this.post<LiveDuelSession>('/duel/update', duelData);
    if (result) {
      RealtimeService.broadcast('live_duel_updated', result);
    }
    return result;
  }

  public static async submitDuelAnswer(payload: {
    duelId: string;
    playerId: string;
    playerName: string;
    answer: string;
  }): Promise<{ isCorrect: boolean; updatedDuel: LiveDuelSession } | null> {
    const result = await this.post<{ isCorrect: boolean; updatedDuel: LiveDuelSession }>('/duel/answer', payload);
    if (result && result.updatedDuel) {
      RealtimeService.broadcast('live_duel_updated', result.updatedDuel);
    }
    return result;
  }

  // ================= DEVELOPER SETTINGS ================= //

  public static async getDeveloperSettings(): Promise<Partial<DeveloperSettings> | null> {
    const result = await this.get<Record<string, string>>('/settings');
    if (!result) {
      console.error('[D1 SELECT FAIL] /settings: Failed to load developer settings from D1');
      return null;
    }
    return {
      globalChatEnabled: result.global_chat_enabled !== 'false',
      liveDuelEnabled: result.live_duel_enabled !== 'false',
      autoDuelEnabled: result.auto_duel_enabled !== 'false',
      shopEnabled: result.shop_enabled !== 'false',
      minStreakBanner: parseInt(result.min_streak_banner || '5', 10),
      minStreakMarquee: parseInt(result.min_streak_marquee || '5', 10),
      maxPollingMs: parseInt(result.max_polling_ms || '1000', 10),
      duelRewardCoins: parseInt(result.duel_reward_coins || '5000', 10),
      duelCooldownSec: parseInt(result.duel_cooldown_sec || '10', 10),
    };
  }

  public static async updateDeveloperSettings(settings: Partial<DeveloperSettings>): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/settings', settings);
    if (!result || !result.success) {
      console.error('[D1 UPDATE FAIL] /settings: Failed to update developer settings:', settings);
    } else {
      RealtimeService.broadcast('developer_settings_updated', settings);
    }
    return !!(result && result.success);
  }

  // ================= CHAT ================= //

  public static async getChatMessages(roomId: string, userId?: string): Promise<DirectMessage[]> {
    const result = await this.get<DirectMessage[]>('/chat', { roomId, userId: userId || '' });
    if (!result) {
      console.error(`[D1 SELECT DIRECT CHAT FAIL] Failed to fetch chat messages for roomId ${roomId}`);
    }
    return result || [];
  }

  public static async sendChatMessage(message: {
    id: string;
    roomId: string;
    senderId: string;
    receiverId: string;
    text: string;
    time: string;
    timestamp: number;
  }): Promise<DirectMessage | null> {
    const result = await this.post<DirectMessage>('/chat', message);
    if (!result) {
      console.error('[D1 INSERT DIRECT CHAT FAIL] Failed to send direct chat message:', message);
    } else {
      RealtimeService.broadcast('direct_message_new', result);
    }
    return result;
  }

  public static async markChatRead(roomId: string, userId: string): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/chat/read', { roomId, userId });
    return !!(result && result.success);
  }

  // ================= BOT PROFILE ================= //

  public static async getBotProfile(): Promise<BotProfile | null> {
    const result = await this.get<BotProfile>('/profile');
    return result;
  }

  public static async updateBotProfile(botData: Partial<BotProfile>): Promise<BotProfile | null> {
    const result = await this.post<BotProfile>('/profile', botData);
    if (result) {
      RealtimeService.broadcast('bot_profile_updated', result);
    }
    return result;
  }

  // ================= DEVELOPER BADGE ================= //

  public static async getDeveloperBadge(): Promise<DeveloperBadgeData | null> {
    const result = await this.get<DeveloperBadgeData>('/badge');
    return result;
  }

  public static async updateDeveloperBadge(badgeData: Partial<DeveloperBadgeData>): Promise<DeveloperBadgeData | null> {
    const result = await this.post<DeveloperBadgeData>('/badge', badgeData);
    if (result) {
      RealtimeService.broadcast('developer_badge_updated', result);
    }
    return result;
  }

  // ================= ACTIVITY LOGS ================= //

  public static async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    const result = await this.get<ActivityLog[]>('/activity', { limit: limit.toString() });
    if (!result) {
      console.error('[D1 SELECT ACTIVITY LOGS FAIL] Failed to fetch activity logs from D1');
    }
    return result || [];
  }

  public static async logActivity(activity: Partial<ActivityLog>): Promise<ActivityLog | null> {
    const result = await this.post<ActivityLog>('/activity', activity);
    if (!result) {
      console.error('[D1 INSERT ACTIVITY LOG FAIL] Failed to log activity to D1:', activity);
    } else {
      RealtimeService.broadcast('activity_log_new', result);
    }
    return result;
  }

  // ================= NOTIFICATIONS ================= //

  public static async getNotifications(userId: string): Promise<any[]> {
    const result = await this.get<any[]>('/notifications', { userId });
    return result || [];
  }

  public static async createNotification(notification: {
    userId: string;
    title: string;
    body: string;
    type?: string;
  }): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/notifications', notification);
    return !!(result && result.success);
  }

  // ================= SYNC / POLLING ================= //

  public static async pollSync(userId: string, sinceTimestamp: number): Promise<SyncPayload | null> {
    const result = await this.get<SyncPayload>('/sync', {
      userId,
      since: sinceTimestamp.toString(),
    });
    return result;
  }

  // ================= SHOP & COIN HISTORY ================= //

  public static async getShopProducts(): Promise<ShopProduct[]> {
    const result = await this.get<ShopProduct[]>('/shop/products');
    return result || [];
  }

  public static async saveShopProduct(product: Partial<ShopProduct>): Promise<ShopProduct | null> {
    const result = await this.post<ShopProduct>('/shop/products/save', product);
    if (result) {
      RealtimeService.broadcast('shop_product_updated', { action: 'save', product: result });
    }
    return result;
  }

  public static async deleteShopProduct(id: string): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/shop/products/delete', { id });
    if (result && result.success) {
      RealtimeService.broadcast('shop_product_updated', { action: 'delete', id });
    }
    return !!(result && result.success);
  }

  public static async getShopSettings(): Promise<Record<string, string>> {
    const result = await this.get<Record<string, string>>('/shop/settings');
    return result || {};
  }

  public static async updateShopSettings(settings: Record<string, string>): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/shop/settings/update', settings);
    if (result && result.success) {
      RealtimeService.broadcast('shop_settings_updated', settings);
    }
    return !!(result && result.success);
  }

  public static async getShopOrders(userId?: string): Promise<ShopOrder[]> {
    const params: Record<string, string> = {};
    if (userId) params.user_id = userId;
    const result = await this.get<ShopOrder[]>('/shop/orders', params);
    return result || [];
  }

  public static async createShopOrder(data: {
    user_id: string;
    user_name: string;
    wibuku_name: string;
    wibuku_id: string;
    product_id: string;
    user_coins?: number;
  }): Promise<{ success: boolean; result?: ShopOrder; newCoins?: number; message?: string }> {
    try {
      const url = `${this.baseUrl}/shop/orders/create`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      const payload = json?.result !== undefined ? json.result : json;
      if (!res.ok || !payload?.success) {
        return {
          success: false,
          message: payload?.message || json?.message || `Gagal membuat pesanan. (HTTP ${res.status})`,
        };
      }

      const result = payload as { success: boolean; result?: ShopOrder; newCoins?: number; message?: string };
      if (result && result.success) {
        RealtimeService.broadcast('shop_order_updated', { action: 'create', order: result.result, newCoins: result.newCoins });
        if (result.newCoins !== undefined) {
          RealtimeService.broadcast('user_stats_updated', { id: data.user_id, coins: result.newCoins });
        }
      }
      return result;
    } catch (err: any) {
      return { success: false, message: err.message || 'Error connection to server.' };
    }
  }

  public static async updateShopOrderStatus(
    order_id: string,
    status: 'Processing' | 'Success' | 'Rejected',
    rejection_reason?: string
  ): Promise<ShopOrder | null> {
    const result = await this.post<ShopOrder>('/shop/orders/update-status', {
      order_id,
      status,
      rejection_reason,
    });
    if (result) {
      RealtimeService.broadcast('shop_order_updated', { action: 'update_status', order: result });
    }
    return result;
  }

  public static async getShopStats(): Promise<ShopStats | null> {
    const result = await this.get<ShopStats>('/shop/stats');
    return result;
  }

  public static async getCoinHistory(userId?: string): Promise<CoinHistoryItem[]> {
    const params: Record<string, string> = {};
    if (userId) params.user_id = userId;
    const result = await this.get<CoinHistoryItem[]>('/coin-history', params);
    return result || [];
  }

  public static async recordCoinHistory(data: {
    user_id: string;
    user_name: string;
    type: string;
    title: string;
    amount: number;
    detail?: string;
  }): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/coin-history/record', data);
    if (result && result.success) {
      RealtimeService.broadcast('shop_coin_history_new', data);
    }
    return !!(result && result.success);
  }

  // ================= BADGE SYSTEM ================= //

  public static async getUserBadges(userId: string): Promise<{
    ownedBadges: Array<{ id?: string; badge_id: string; custom_name: string; is_active: number }>;
    activeBadge: string | null;
    customName: string | null;
  } | null> {
    const result = await this.get<any>('/badges/user', { userId });
    return result;
  }

  public static async buyBadge(
    userId: string,
    badgeId: string,
    price: number,
    userCoins?: number,
    userName?: string
  ): Promise<{
    success: boolean;
    newCoins?: number;
    badgeId?: string;
    message?: string;
  }> {
    const payloadBody = { userId, badgeId, price, userCoins, userName };

    const parseResponse = async (res: Response) => {
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      const payload = json?.result !== undefined ? json.result : json;
      if (!res.ok || !payload?.success) {
        return {
          ok: false,
          response: null as any,
          message: payload?.message || json?.message || `Gagal membeli badge. (HTTP ${res.status})`,
          status: res.status,
        };
      }

      return {
        ok: true,
        response: payload as { success: boolean; newCoins?: number; badgeId?: string; message?: string },
        message: '',
        status: res.status,
      };
    };

    try {
      const postUrl = `${this.baseUrl}/badges/buy`;

      // Primary path: POST JSON
      let res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payloadBody),
      });

      let parsed = await parseResponse(res);
      if (parsed.ok && parsed.response) {
        const result = parsed.response;
        RealtimeService.broadcast('user_badge_updated', { action: 'buy', userId, badgeId, newCoins: result.newCoins });
        if (result.newCoins !== undefined) {
          RealtimeService.broadcast('user_stats_updated', { id: userId, coins: result.newCoins });
        }
        return result;
      }

      // Fallback path: some deploys only accept GET on the same endpoint.
      if (parsed.status === 405) {
        const qs = new URLSearchParams();
        qs.set('userId', userId);
        qs.set('badgeId', badgeId);
        qs.set('price', String(price));
        if (typeof userCoins === 'number') qs.set('userCoins', String(userCoins));
        if (userName) qs.set('userName', userName);

        res = await fetch(`${postUrl}?${qs.toString()}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        parsed = await parseResponse(res);
        if (parsed.ok && parsed.response) {
          const result = parsed.response;
          RealtimeService.broadcast('user_badge_updated', { action: 'buy', userId, badgeId, newCoins: result.newCoins });
          if (result.newCoins !== undefined) {
            RealtimeService.broadcast('user_stats_updated', { id: userId, coins: result.newCoins });
          }
          return result;
        }
      }

      return {
        success: false,
        message: parsed.message || 'Gagal membeli badge.',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Koneksi gagal.' };
    }
  }

  public static async setActiveBadge(userId: string, badgeId: string | null): Promise<boolean> {
    const result = await this.post<{ success: boolean; activeBadge?: string; customName?: string }>('/badges/set-active', { userId, badgeId: badgeId || '' });
    if (result && result.success) {
      RealtimeService.broadcast('user_badge_updated', { action: 'set_active', userId, badgeId, customName: result.customName });
    }
    return !!(result && result.success);
  }

  public static async renameBadge(userId: string, badgeId: string, newName: string): Promise<{
    success: boolean;
    customName?: string;
    message?: string;
  }> {
    const result = await this.post<any>('/badges/rename', { userId, badgeId, newName });
    if (result && result.success) {
      RealtimeService.broadcast('user_badge_updated', { action: 'rename', userId, badgeId, customName: result.customName });
    }
    return result || { success: false, message: 'Koneksi gagal.' };
  }

  // ================= MIGRATION ================= //

  public static async migrateBatch(legacyData: Record<string, any>): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/migrate', legacyData);
    return !!(result && result.success);
  }

  // ================= JUKEBOX MUSIC SYSTEM ================= //

  public static async getJukeboxPlaylist(userId: string): Promise<any[]> {
    const result = await this.get<any[]>('/jukebox/playlist', { userId });
    if (result === null) {
      throw new Error('Jukebox playlist API unavailable.');
    }
    return result;
  }

  public static async addToJukeboxPlaylist(data: {
    userId: string;
    trackId: string;
    source?: string;
    videoId?: string;
    title: string;
    artist: string;
    thumbnail: string;
    downloadUrl: string;
    duration?: string;
    quality?: string;
    audioExpireAt?: number | null;
    lastPlayedAt?: number;
  }): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/jukebox/playlist/add', data);
    return !!(result && result.success);
  }

  public static async removeFromJukeboxPlaylist(userId: string, trackId: string): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/jukebox/playlist/remove', { userId, trackId });
    return !!(result && result.success);
  }

  public static async getJukeboxFavorites(userId: string): Promise<any[]> {
    const result = await this.get<any[]>('/jukebox/favorites', { userId });
    if (result === null) {
      throw new Error('Jukebox favorites API unavailable.');
    }
    return result;
  }

  public static async toggleJukeboxFavorite(data: {
    userId: string;
    trackId: string;
    source?: string;
    videoId?: string;
    title?: string;
    artist?: string;
    thumbnail?: string;
    downloadUrl?: string;
    duration?: string;
    audioExpireAt?: number | null;
    lastPlayedAt?: number;
  }): Promise<{ success: boolean; isFavorite: boolean }> {
    const result = await this.post<{ success: boolean; isFavorite: boolean }>('/jukebox/favorites/toggle', data);
    return result || { success: false, isFavorite: false };
  }

  public static async updateJukeboxTrackUrl(data: {
    userId: string;
    trackId: string;
    downloadUrl: string;
    audioExpireAt?: number | null;
    lastPlayedAt?: number;
  }): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/jukebox/track/update-url', data);
    return !!(result && result.success);
  }

  public static async getJukeboxHistory(userId: string): Promise<any[]> {
    const result = await this.get<any[]>('/jukebox/history', { userId });
    return result || [];
  }

  public static async addJukeboxHistory(data: {
    userId: string;
    trackId: string;
    source?: string;
    videoId?: string;
    title: string;
    artist: string;
    thumbnail: string;
    downloadUrl: string;
    duration?: string;
  }): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/jukebox/history/add', data);
    return !!(result && result.success);
  }

  public static async getJukeboxLastPlayed(userId: string): Promise<any | null> {
    const result = await this.get<any>('/jukebox/last-played', { userId });
    return result || null;
  }

  public static async saveJukeboxLastPlayed(data: {
    userId: string;
    trackId: string;
    source?: string;
    videoId?: string;
    title: string;
    artist: string;
    thumbnail: string;
    downloadUrl: string;
    duration?: string;
    progress?: number;
    audioExpireAt?: number | null;
  }): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/jukebox/last-played/save', data);
    return !!(result && result.success);
  }

  public static async getJukeboxLayoutSettings(userId: string): Promise<{
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
    is_collapsed: number;
  } | null> {
    const result = await this.get<any>('/jukebox/settings', { userId });
    return result || null;
  }

  public static async saveJukeboxLayoutSettings(data: {
    userId: string;
    posX: number;
    posY: number;
    width: number;
    height: number;
    isCollapsed: boolean;
  }): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/jukebox/settings/save', data);
    return !!(result && result.success);
  }
}

