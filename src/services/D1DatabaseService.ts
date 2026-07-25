/**
 * Cloudflare D1 Database REST Client Service
 * Interacts with Worker API Gateway at https://shiroapi.shiroanna.workers.dev/api/v1/*
 */

import { WORKER_BASE_URL } from '../api/client';
import { UserProfile, AppUser, Friend, DirectMessage, ChatRoom, AutoReplyRule, UserStatus, GlobalChatMessage, LiveDuelSession, DeveloperSettings } from '../types';
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
  private static baseUrl = `${WORKER_BASE_URL.replace(/\/+$/, '')}/api/v1`;

  /**
   * Helper method to perform GET requests to Worker D1 endpoints
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

      if (!res.ok) return null;
      const json = await res.json();
      return json.result !== undefined ? json.result : json;
    } catch (e) {
      console.warn(`[D1 API GET Error] ${endpoint}:`, e);
      return null;
    }
  }

  /**
   * Helper method to perform POST requests to Worker D1 endpoints
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

      if (!res.ok) return null;
      const json = await res.json();
      return json.result !== undefined ? json.result : json;
    } catch (e) {
      console.warn(`[D1 API POST Error] ${endpoint}:`, e);
      return null;
    }
  }

  // ================= USERS & PRESENCE ================= //

  public static async registerOrLoginUser(payload: {
    username: string;
    role?: 'Developer' | 'Trainer';
    avatar?: string;
    device?: string;
    browser?: string;
  }): Promise<AppUser | null> {
    const result = await this.post<AppUser>('/users/register-or-login', payload);
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
    return result || [];
  }

  // ================= FRIENDS ================= //

  public static async getFriends(userId: string): Promise<Friend[]> {
    const result = await this.get<Friend[]>('/friends', { userId });
    return result || [];
  }

  public static async addFriend(userId: string, friend: Partial<Friend>): Promise<Friend | null> {
    const result = await this.post<Friend>('/friends', { userId, friend });
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
    return result || [];
  }

  public static async sendGlobalMessage(msg: Partial<GlobalChatMessage>): Promise<GlobalChatMessage | null> {
    const result = await this.post<GlobalChatMessage>('/global-chat', msg);
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
    if (!result) return null;
    return {
      globalChatEnabled: result.global_chat_enabled !== 'false',
      liveDuelEnabled: result.live_duel_enabled !== 'false',
      autoDuelEnabled: result.auto_duel_enabled !== 'false',
      minStreakBanner: parseInt(result.min_streak_banner || '5', 10),
      minStreakMarquee: parseInt(result.min_streak_marquee || '5', 10),
      maxPollingMs: parseInt(result.max_polling_ms || '3000', 10),
      duelRewardCoins: parseInt(result.duel_reward_coins || '5000', 10),
      duelCooldownSec: parseInt(result.duel_cooldown_sec || '10', 10),
    };
  }

  public static async updateDeveloperSettings(settings: Partial<DeveloperSettings>): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/settings', settings);
    return !!(result && result.success);
  }

  // ================= CHAT ================= //

  public static async getChatMessages(roomId: string, userId?: string): Promise<DirectMessage[]> {
    const result = await this.get<DirectMessage[]>('/chat', { roomId, userId: userId || '' });
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
    return result || [];
  }

  public static async logActivity(activity: Partial<ActivityLog>): Promise<ActivityLog | null> {
    const result = await this.post<ActivityLog>('/activity', activity);
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

  // ================= MIGRATION ================= //

  public static async migrateBatch(legacyData: Record<string, any>): Promise<boolean> {
    const result = await this.post<{ success: boolean }>('/migrate', legacyData);
    return !!(result && result.success);
  }
}
