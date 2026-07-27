type Listener = (data: any) => void;

export interface UserStatsPayload {
  id: string;
  username: string;
  role?: string;
  avatar?: string;
  coins?: number;
  carrotCoins?: number;
  totalGame?: number;
  win?: number;
  lose?: number;
  winStreak?: number;
  maxWinStreak?: number;
  status?: string;
}

class StateSyncManager {
  private listeners: Map<string, Set<Listener>> = new Map();

  public on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  public off(event: string, listener: Listener): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  public emit(event: string, data?: any): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(data);
        } catch (e) {
          console.error(`Error in StateSyncManager listener for [${event}]:`, e);
        }
      });
    }

    // Broadcast custom DOM event for cross-component and window reactivity
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent(`tracen:${event}`, { detail: data }));
      } catch (e) {
        // Fallback ignored
      }
    }
  }

  public emitUserStatsUpdate(user: UserStatsPayload): void {
    this.emit('user_stats_updated', user);
  }

  public emitPresenceUpdate(userId: string, status: string): void {
    this.emit('user_presence_updated', { userId, status });
  }

  public emitBadgeUpdate(userId: string, activeBadge?: string): void {
    this.emit('user_badge_updated', { userId, activeBadge });
  }
}

export const StateSyncService = new StateSyncManager();
