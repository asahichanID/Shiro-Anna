import { D1DatabaseService } from './D1DatabaseService';
import { StorageService } from './StorageService';
import { RealtimeService } from './SupabaseService';

export interface BotProfile {
  id?: string;
  name: string;
  avatar: string;
  bio: string;
  status: 'Online' | 'Offline' | 'Away' | 'Busy' | string;
  updatedAt?: number;
}

const STORAGE_KEY_BOT_PROFILE = 'oguri_bot_profile';

export const DEFAULT_BOT_PROFILE: BotProfile = {
  id: 'default',
  name: 'Oguri Cap 🐎',
  avatar: '/assets/bot_avatar.jpg',
  bio: 'Siap membantu Trainer dalam Tebak Kata & Musik Tracen Academy! 🥕',
  status: 'Online',
};

type BotProfileListener = (profile: BotProfile) => void;

export class BotService {
  private static listeners: BotProfileListener[] = [];

  public static onBotProfileUpdate(listener: BotProfileListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }

  private static notifyListeners(profile: BotProfile) {
    this.listeners.forEach((fn) => fn(profile));
  }

  public static getProfileSync(): BotProfile {
    const profile = StorageService.getItem<BotProfile>(STORAGE_KEY_BOT_PROFILE, DEFAULT_BOT_PROFILE);
    if (
      !profile ||
      !profile.avatar ||
      profile.avatar.trim() === '' ||
      profile.avatar === '/assets/avatar.png' ||
      profile.avatar.includes('jsdelivr')
    ) {
      profile.avatar = '/assets/bot_avatar.jpg';
      StorageService.setItem(STORAGE_KEY_BOT_PROFILE, profile);
    }
    return profile;
  }

  public static getBotProfileSync(): BotProfile {
    return this.getProfileSync();
  }

  public static async getProfile(): Promise<BotProfile> {
    const cached = this.getProfileSync();
    try {
      const d1Profile = await D1DatabaseService.getBotProfile();
      if (d1Profile && d1Profile.name) {
        StorageService.setItem(STORAGE_KEY_BOT_PROFILE, d1Profile);
        this.notifyListeners(d1Profile);
        return d1Profile;
      }
    } catch (e) {
      console.warn('Error fetching bot profile from D1:', e);
    }
    return cached;
  }

  // Alias method for backward compatibility
  public static async getBotProfile(): Promise<BotProfile> {
    return this.getProfile();
  }

  public static async updateProfile(profileData: Partial<BotProfile>): Promise<BotProfile> {
    const current = this.getProfileSync();
    const updated: BotProfile = {
      ...current,
      ...profileData,
      updatedAt: Date.now(),
    };

    StorageService.setItem(STORAGE_KEY_BOT_PROFILE, updated);
    this.notifyListeners(updated);

    try {
      const result = await D1DatabaseService.updateBotProfile(updated);
      if (result) {
        StorageService.setItem(STORAGE_KEY_BOT_PROFILE, result);
        this.notifyListeners(result);
        return result;
      }
    } catch (e) {
      console.warn('Error updating bot profile on D1:', e);
    }

    return updated;
  }

  // Alias method for backward compatibility
  public static async updateBotProfile(profileData: Partial<BotProfile>): Promise<BotProfile> {
    return this.updateProfile(profileData);
  }
}

// Auto-subscribe to Realtime Bot Profile Updates from Supabase Broadcast
RealtimeService.subscribe('bot_profile_updated', (profile: BotProfile) => {
  if (!profile || !profile.name) return;
  StorageService.setItem(STORAGE_KEY_BOT_PROFILE, profile);
  (BotService as any).notifyListeners(profile);
});
