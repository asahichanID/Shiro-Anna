import { StorageService } from './StorageService';

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  category: 'Auth' | 'Game' | 'Coins' | 'Music' | 'BotProfile' | 'System' | 'Friends' | string;
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
    | 'bot_update'
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
    detail: string,
    userId?: string,
    userName?: string,
    category?: string
  ): ActivityLog {
    const logs = this.getLogs();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Auto-resolve current logged in profile if not passed
    let activeUserId = userId;
    let activeUserName = userName;

    if (!activeUserId || !activeUserName) {
      try {
        const savedProfile = localStorage.getItem('oguri_profile');
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          activeUserId = activeUserId || parsed.id || '#Unregistered';
          activeUserName = activeUserName || parsed.username || 'Guest';
        }
      } catch (e) {
        // Fallback
      }
    }

    activeUserId = activeUserId || '#System';
    activeUserName = activeUserName || 'System';

    // Auto-determine category if omitted
    let resolvedCategory = category;
    if (!resolvedCategory) {
      switch (type) {
        case 'login':
        case 'profile_name':
        case 'profile_avatar':
          resolvedCategory = 'Auth / Profile';
          break;
        case 'game_start':
        case 'game_win':
        case 'game_lose':
          resolvedCategory = 'Game';
          break;
        case 'coin_earned':
          resolvedCategory = 'Coins';
          break;
        case 'music_play':
        case 'download_audio':
        case 'download_video':
          resolvedCategory = 'Music';
          break;
        case 'bot_update':
          resolvedCategory = 'Bot Profile';
          break;
        default:
          resolvedCategory = 'System';
          break;
      }
    }

    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: activeUserId,
      userName: activeUserName,
      category: resolvedCategory,
      type,
      title,
      detail,
      time: timeStr,
      timestamp: Date.now(),
    };

    // Keep max 300 logs globally
    const updated = [newLog, ...logs].slice(0, 300);
    StorageService.setItem(STORAGE_KEY_LOGS, updated);

    // Dispatch custom event for real-time listener updates
    window.dispatchEvent(new CustomEvent('activity_log_updated', { detail: newLog }));

    return newLog;
  }

  public static clearLogs(): void {
    StorageService.setItem(STORAGE_KEY_LOGS, []);
    window.dispatchEvent(new CustomEvent('activity_log_updated'));
  }
}
