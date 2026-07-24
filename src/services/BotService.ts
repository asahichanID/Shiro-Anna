import { StorageService } from './StorageService';
import { ActivityService } from './ActivityService';
import { BOT_DEFAULT_AVATAR } from '../config/constants';

export { BOT_DEFAULT_AVATAR };

export interface BotProfile {
  name: string;
  avatar: string;
  status: string;
  bio: string;
  updatedAt: number;
}

const STORAGE_KEY_BOT_PROFILE = 'oguri_bot_profile';
const BOT_PROFILE_EVENT = 'oguri_bot_profile_updated';

const DEFAULT_BOT_PROFILE: BotProfile = {
  name: 'Oguri Cap 🐎',
  avatar: BOT_DEFAULT_AVATAR,
  status: 'Online',
  bio: 'Siap membantu Trainer dalam Tebak Kata & Musik Tracen Academy! 🥕',
  updatedAt: Date.now(),
};

export class BotService {
  /**
   * Get current Bot Profile from global storage
   */
  public static getBotProfile(): BotProfile {
    const saved = StorageService.getItem<BotProfile | null>(STORAGE_KEY_BOT_PROFILE, null);
    if (!saved) {
      StorageService.setItem(STORAGE_KEY_BOT_PROFILE, DEFAULT_BOT_PROFILE);
      return DEFAULT_BOT_PROFILE;
    }

    // Auto migrate old default '/assets/avatar.png' or empty avatar to CDN avatar
    if (!saved.avatar || saved.avatar === '/assets/avatar.png' || saved.avatar.trim() === '') {
      saved.avatar = BOT_DEFAULT_AVATAR;
    }

    return saved;
  }

  /**
   * Update Bot Profile (Developer Only)
   * Synchronizes globally across all users
   */
  public static updateBotProfile(updated: Partial<BotProfile>): BotProfile {
    const current = this.getBotProfile();
    const newProfile: BotProfile = {
      ...current,
      ...updated,
      updatedAt: Date.now(),
    };

    StorageService.setItem(STORAGE_KEY_BOT_PROFILE, newProfile);

    // Log global activity
    ActivityService.logActivity(
      'bot_update',
      'Update Profile Bot',
      `Nama: "${newProfile.name}" | Status: "${newProfile.status}" | Bio: "${newProfile.bio}"`,
      undefined,
      undefined,
      'BotProfile'
    );

    // Dispatch global event for instant reactivity across all components
    window.dispatchEvent(new CustomEvent(BOT_PROFILE_EVENT, { detail: newProfile }));

    return newProfile;
  }

  /**
   * Listen to real-time updates of Bot Profile
   */
  public static onBotProfileUpdate(callback: (profile: BotProfile) => void) {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<BotProfile>;
      callback(customEvent.detail || this.getBotProfile());
    };

    window.addEventListener(BOT_PROFILE_EVENT, handler);
    return () => {
      window.removeEventListener(BOT_PROFILE_EVENT, handler);
    };
  }
}
