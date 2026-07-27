import { D1DatabaseService } from './D1DatabaseService';
import { UserStatus } from '../types';

export class PresenceService {
  private static intervalId: any = null;
  private static currentUserId: string = 'trainer_01';
  private static currentStatus: UserStatus = 'Online';

  public static startPresenceTracking(userId: string = 'trainer_01') {
    this.currentUserId = userId;
    this.updatePresence('Online');

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Ping presence every 1 second
    this.intervalId = setInterval(() => {
      this.updatePresence(this.currentStatus);
    }, 1000);

    // Track user activity (Away on tab blur or idle)
    const handleVisibility = () => {
      if (document.hidden) {
        this.updatePresence('Away');
      } else {
        this.updatePresence('Online');
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
  }

  public static updatePresence(status: UserStatus) {
    this.currentStatus = status;
    D1DatabaseService.updatePresence({
      userId: this.currentUserId,
      status,
    }).catch((e) => console.warn('Presence ping warning:', e));
  }

  public static stopPresenceTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.updatePresence('Offline');
  }
}
