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
  private isConnected: boolean = false;

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
          console.log(`⚡ [REALTIME RECV] Event: "${eventName}"`, payload);

          // Dispatch specific event listeners
          const callbackSet = this.listeners.get(eventName);
          if (callbackSet) {
            callbackSet.forEach((cb) => {
              try {
                cb(payload);
              } catch (err) {
                console.error(`❌ [REALTIME CALLBACK ERROR] event: ${eventName}`, err);
              }
            });
          }

          // Dispatch wildcard listeners
          const wildcardSet = this.listeners.get('*');
          if (wildcardSet) {
            wildcardSet.forEach((cb) => {
              try {
                cb({ event: eventName, payload });
              } catch (err) {
                console.error(`❌ [REALTIME WILDCARD CALLBACK ERROR] event: ${eventName}`, err);
              }
            });
          }
        })
        .on('presence', { event: 'sync' }, () => {
          if (this.mainChannel) {
            this.presenceState = this.mainChannel.presenceState();
            console.log('👥 [REALTIME PRESENCE SYNC]', this.presenceState);
            const callbackSet = this.listeners.get('presence_sync');
            if (callbackSet) {
              callbackSet.forEach((cb) => cb(this.presenceState));
            }
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            console.log('✅ [SUPABASE REALTIME CONNECTED] Subscribed to global broadcast channel: "oguri_cap_global_realtime"');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.isConnected = false;
            console.warn(`⚠️ [SUPABASE REALTIME DISCONNECTED] Channel status: ${status}. Retrying in 3s...`);
            setTimeout(() => this.reconnect(), 3000);
          }
        });
    } catch (err) {
      console.warn('❌ [SUPABASE REALTIME INIT ERROR]:', err);
    }
  }

  public reconnect() {
    if (this.mainChannel) {
      try {
        supabase.removeChannel(this.mainChannel);
      } catch (e) {
        // ignored
      }
    }
    this.initMainChannel();
  }

  public subscribe(event: string, callback: (payload: any) => void): () => void {
    console.log(`📡 [REALTIME SUB] Subscribing to event: "${event}"`);
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      console.log(`🔌 [REALTIME UNSUB] Unsubscribing from event: "${event}"`);
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
    console.log(`🚀 [REALTIME BROADCAST] Publishing event: "${event}"`, payload);
    if (!this.mainChannel) {
      console.warn(`⚠️ [REALTIME BROADCAST SKIPPED] Main channel not initialized for event: "${event}"`);
      return;
    }
    try {
      await this.mainChannel.send({
        type: 'broadcast',
        event,
        payload,
      });
    } catch (err) {
      console.warn(`❌ [SUPABASE BROADCAST FAILED] Event: ${event}`, err);
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
      console.warn('❌ [SUPABASE PRESENCE TRACK ERROR]:', err);
    }
  }

  public getOnlineUsersCount(): number {
    return Object.keys(this.presenceState).length;
  }
}

export const RealtimeService = new SupabaseRealtimeService();
