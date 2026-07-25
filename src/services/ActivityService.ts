import { D1DatabaseService } from './D1DatabaseService';
import { StorageService } from './StorageService';

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
      if (d1Logs && Array.isArray(d1Logs) && d1Logs.length > 0) {
        StorageService.setItem(STORAGE_KEY_ACTIVITIES, d1Logs);
        return d1Logs;
      }
    } catch (e) {
      console.warn('Error fetching activity history from D1:', e);
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

    try {
      await D1DatabaseService.logActivity(newLog);
    } catch (e) {
      console.warn('Failed to send activity log to D1:', e);
    }

    return newLog;
  }

  public static async clearHistory(): Promise<void> {
    StorageService.removeItem(STORAGE_KEY_ACTIVITIES);
  }

  // Alias for backward compatibility
  public static async clearLogs(): Promise<void> {
    return this.clearHistory();
  }
}
