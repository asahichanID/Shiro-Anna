import { StorageService } from './StorageService';

export interface ActivityLog {
  id: string;
  type:
    | 'login'
    | 'profile_name'
    | 'profile_avatar'
    | 'game_start'
    | 'game_win'
    | 'game_lose'
    | 'coin_earned'
    | 'music_play'
    | 'download_audio'
    | 'download_video'
    | 'system';
  title: string;
  detail: string;
  time: string;
  timestamp: number;
}

const STORAGE_KEY_LOGS = 'activity_logs';

export class ActivityService {
  public static getLogs(): ActivityLog[] {
    return StorageService.getItem<ActivityLog[]>(STORAGE_KEY_LOGS, []);
  }

  public static logActivity(
    type: ActivityLog['type'],
    title: string,
    detail: string
  ): ActivityLog {
    const logs = this.getLogs();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      detail,
      time: timeStr,
      timestamp: Date.now(),
    };

    // Keep max 200 logs
    const updated = [newLog, ...logs].slice(0, 200);
    StorageService.setItem(STORAGE_KEY_LOGS, updated);

    // Dispatch a custom event so UI can listen in real-time
    window.dispatchEvent(new CustomEvent('activity_log_updated', { detail: newLog }));

    return newLog;
  }

  public static clearLogs(): void {
    StorageService.setItem(STORAGE_KEY_LOGS, []);
    window.dispatchEvent(new CustomEvent('activity_log_updated'));
  }
}
