/**
 * Cloudflare D1 Database REST Client Service
 * Interacts with D1 Worker API Gateway at /api/v1/*
 */

import { WORKER_BASE_URL } from '../api/client';
import { AppUser, Friend, DirectMessage, UserStatus, GlobalChatMessage, LiveDuelSession, DeveloperSettings, ShopProduct, ShopOrder, ShopSettings, ShopStats, CoinHistoryItem } from '../types';
import { BotProfile } from './BotService';
import { ActivityLog } from './ActivityService';
import { BadgeThemeId } from '../config/badgeThemes';


export interface DeveloperBadgeData {
  id?: string;
  userId: string;
  badgeName: string;
  themeId: BadgeThemeId;
  icon: string;
  effect: string;
  updatedAt?: number;
}

export interface SyncPayload {
  lastTimestamp: number;
  botProfile?: BotProfile;
  developerBadge?: DeveloperBadgeData;
  activeUsers?: AppUser[];
  friends?: Friend[];
  newMessages?: DirectMessage[];
  activityLogs?: ActivityLog[];
  unreadNotificationsCount?: number;
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
    try {
      const queryParts: string[] = [];
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
        }
      });
      const q = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const url = `${this.baseUrl}${endpoint}${q}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        console.error(`[D1 API GET ERROR ${res.status}] Endpoint: ${endpoint}`);
        return null;
      }
      const json = await res.json();
      return json.result !== undefined ? json.result : json;
    } catch (e) {
      console.error(`[D1 API GET EXCEPTION] ${endpoint}:`, e);
      return null;
    }
  }

  /**
   * Helper method to perform POST requests to D1 endpoints
   */
  private static async post<T>(endpoint: string, body: any): Promise<T | null> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        console.error(`[D1 API POST ERROR ${res.status}] Endpoint: ${endpoint}`);
        return null;
      }
      const json = await res.json();
      return json.result !== undefined ? json.result : json;
    } catch (e) {
      console.error(`[D1 API POST EXCEPTION] ${endpoint}:`, e);
      return null;
    }
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
    device?: string;
    browser?: string;
  }): Promise<AppUser | null> {
    const result = await this.post<AppUser>('/users/register-or-login', payload);
    if (!result) {
      console.error('[D1 USER INSERT FAIL] Failed to register or login user on D1 database:', payload);
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
    }
    return result;
  }

  public static async updatePresence(payload: {
    userId: string;
    status: UserStatus;
    device?: string;
    browser?: string;
  }): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/users/presence', payload);
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
    }
    return result;
  }

  public static async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/friends/remove', { userId, friendId });
    return !!(result && result.success);
  }

  // ================= GLOBAL CHAT ================= //

  public static async getGlobalMessages(sinceTimestamp?: number): Promise<GlobalChatMessage[]> {
    const params: Record<string, string> = {};
    if (sinceTimestamp) params.since = sinceTimestamp.toString();
    const result = await this.get<GlobalChatMessage[]>('/global-chat', params);
    if (!result) {
      console.error('[D1 SELECT GLOBAL CHAT FAIL] Failed to fetch global chat messages');
    }
    return result || [];
  }

  public static async sendGlobalMessage(msg: Partial<GlobalChatMessage>): Promise<GlobalChatMessage | null> {
    const result = await this.post<GlobalChatMessage>('/global-chat', msg);
    if (!result) {
      console.error('[D1 INSERT CHAT FAIL] Failed to send global chat message to D1:', msg);
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
    return result;
  }

  public static async updateDuel(duelData: Partial<LiveDuelSession>): Promise<LiveDuelSession | null> {
    const result = await this.post<LiveDuelSession>('/duel/update', duelData);
    return result;
  }

  public static async submitDuelAnswer(payload: {
    duelId: string;
    playerId: string;
    playerName: string;
    answer: string;
  }): Promise<{ isCorrect: boolean; updatedDuel: LiveDuelSession } | null> {
    const result = await this.post<{ isCorrect: boolean; updatedDuel: LiveDuelSession }>('/duel/answer', payload);
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
      maxPollingMs: parseInt(result.max_polling_ms || '3000', 10),
      duelRewardCoins: parseInt(result.duel_reward_coins || '5000', 10),
      duelCooldownSec: parseInt(result.duel_cooldown_sec || '10', 10),
    };
  }

  public static async updateDeveloperSettings(settings: Partial<DeveloperSettings>): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/settings', settings);
    if (!result || !result.success) {
      console.error('[D1 UPDATE FAIL] /settings: Failed to update developer settings:', settings);
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
    return result;
  }

  // ================= DEVELOPER BADGE ================= //

  public static async getDeveloperBadge(): Promise<DeveloperBadgeData | null> {
    const result = await this.get<DeveloperBadgeData>('/badge');
    return result;
  }

  public static async updateDeveloperBadge(badgeData: Partial<DeveloperBadgeData>): Promise<DeveloperBadgeData | null> {
    const result = await this.post<DeveloperBadgeData>('/badge', badgeData);
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
    return result;
  }

  public static async deleteShopProduct(id: string): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/shop/products/delete', { id });
    return !!(result && result.success);
  }

  public static async getShopSettings(): Promise<Record<string, string>> {
    const result = await this.get<Record<string, string>>('/shop/settings');
    return result || {};
  }

  public static async updateShopSettings(settings: Record<string, string>): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/shop/settings/update', settings);
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
  }): Promise<{ success: boolean; result?: ShopOrder; newCoins?: number; message?: string }> {
    try {
      const url = `${this.baseUrl}/shop/orders/create`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      return json;
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
    return !!(result && result.success);
  }

  // ================= MIGRATION ================= //

  public static async migrateBatch(legacyData: Record<string, any>): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/migrate', legacyData);
    return !!(result && result.success);
  }
}

