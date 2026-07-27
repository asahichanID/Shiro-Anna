import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  metaEnv.VITE_SUPABASE_URL ||
  'https://liecstkcclpkjkdqkvga.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  metaEnv.VITE_SUPABASE_KEY ||
  'sb_publishable_1BE8rNRK67AGBnt2jGT6iw_iIPHWXLz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});

class SupabaseRealtimeService {
  private mainChannel: RealtimeChannel | null = null;
  private listeners: Map<string, Set<(payload: any) => void>> = new Map();
  private presenceState: Record<string, any> = {};

  constructor() {
    this.initMainChannel();
  }

  private initMainChannel() {
    try {
      this.mainChannel = supabase.channel('oguri_cap_global_realtime', {
        config: {
          broadcast: { self: true },
          presence: { key: 'user_presence' },
        },
      });

      this.mainChannel
        .on('broadcast', { event: '*' }, (data) => {
          const eventName = data.event;
          const payload = data.payload;
          const callbackSet = this.listeners.get(eventName);
          if (callbackSet) {
            callbackSet.forEach((cb) => {
              try {
                cb(payload);
              } catch (err) {
                console.error(`[REALTIME CALLBACK ERROR] event: ${eventName}`, err);
              }
            });
          }
        })
        .on('presence', { event: 'sync' }, () => {
          if (this.mainChannel) {
            this.presenceState = this.mainChannel.presenceState();
            const callbackSet = this.listeners.get('presence_sync');
            if (callbackSet) {
              callbackSet.forEach((cb) => cb(this.presenceState));
            }
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[SUPABASE REALTIME] Connected to global channel.');
          }
        });
    } catch (err) {
      console.warn('[SUPABASE REALTIME INIT ERROR]:', err);
    }
  }

  public subscribe(event: string, callback: (payload: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  public async broadcast(event: string, payload: any) {
    if (!this.mainChannel) return;
    try {
      await this.mainChannel.send({
        type: 'broadcast',
        event,
        payload,
      });
    } catch (err) {
      console.warn(`[SUPABASE BROADCAST FAILED] Event: ${event}`, err);
    }
  }

  public trackUserPresence(userId: string, userInfo: any) {
    if (!this.mainChannel) return;
    try {
      this.mainChannel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
        ...userInfo,
      });
    } catch (err) {
      console.warn('[SUPABASE PRESENCE TRACK ERROR]:', err);
    }
  }

  public getOnlineUsersCount(): number {
    return Object.keys(this.presenceState).length;
  }
}

export const RealtimeService = new SupabaseRealtimeService();
