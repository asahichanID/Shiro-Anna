import { D1DatabaseService } from './D1DatabaseService';
import { StorageService } from './StorageService';
import { RealtimeService } from './SupabaseService';

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  category: 'music' | 'game' | 'system' | 'profile' | 'badge' | 'chat' | 'login' | 'coin_earned' | 'profile_name' | 'profile_avatar' | string;
  type: string;
  title: string;
  detail: string;
  time: string;
  timestamp: number;
}

const STORAGE_KEY_ACTIVITIES = 'oguri_activity_history';

export class ActivityService {
  public static getHistorySync(limit: number = 50): ActivityLog[] {
    const cached = StorageService.getItem<ActivityLog[]>(STORAGE_KEY_ACTIVITIES, []);
    return Array.isArray(cached) ? cached.slice(0, limit) : [];
  }

  public static getLogsSync(limit: number = 50): ActivityLog[] {
    return this.getHistorySync(limit);
  }

  public static async getHistory(limit: number = 50): Promise<ActivityLog[]> {
    const cached = this.getHistorySync(limit);
    try {
      const d1Logs = await D1DatabaseService.getActivityLogs(limit);
      if (d1Logs && Array.isArray(d1Logs)) {
        StorageService.setItem(STORAGE_KEY_ACTIVITIES, d1Logs);
        return d1Logs;
      }
    } catch (e) {
      console.error('[D1 SELECT ACTIVITY LOGS ERROR] Failed to fetch activity history from D1:', e);
    }
    return cached;
  }

  // Alias for backward compatibility
  public static async getLogs(limit: number = 50): Promise<ActivityLog[]> {
    return this.getHistory(limit);
  }

  public static async logActivity(
    category: ActivityLog['category'],
    type: string,
    title: string,
    detail: string = '',
    user: { id: string; name: string } = { id: '#1', name: 'Shiro Anna' }
  ): Promise<ActivityLog> {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newLog: ActivityLog = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.name,
      category,
      type,
      title,
      detail: detail || title,
      time: timeStr,
      timestamp: Date.now(),
    };

    const current = this.getHistorySync();
    const updated = [newLog, ...current].slice(0, 100);
    StorageService.setItem(STORAGE_KEY_ACTIVITIES, updated);

    // Notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('activity_log_updated'));
    }

    try {
      await D1DatabaseService.logActivity(newLog);
    } catch (e) {
      console.error('[D1 INSERT ACTIVITY LOG ERROR] Failed to send activity log to D1:', e);
    }

    return newLog;
  }

  public static async clearHistory(): Promise<void> {
    StorageService.removeItem(STORAGE_KEY_ACTIVITIES);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('activity_log_updated'));
    }
  }

  // Alias for backward compatibility
  public static async clearLogs(): Promise<void> {
    return this.clearHistory();
  }
}

// Subscribe to Realtime Activity Log updates from Supabase Broadcast
RealtimeService.subscribe('activity_log_new', (log: ActivityLog) => {
  if (!log || !log.id) return;
  const current = ActivityService.getHistorySync();
  if (current.some((l) => l.id === log.id)) return;
  const updated = [log, ...current].slice(0, 100);
  StorageService.setItem(STORAGE_KEY_ACTIVITIES, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('activity_log_updated'));
  }
});
