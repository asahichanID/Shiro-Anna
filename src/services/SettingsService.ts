import { D1DatabaseService } from './D1DatabaseService';
import { StorageService } from './StorageService';
import { DeveloperSettings } from '../types';
import { RealtimeService } from './SupabaseService';

const STORAGE_KEY_SETTINGS = 'oguri_developer_settings';

export const DEFAULT_DEVELOPER_SETTINGS: DeveloperSettings = {
  globalChatEnabled: true,
  liveDuelEnabled: true,
  autoDuelEnabled: true,
  shopEnabled: true,
  minStreakBanner: 5,
  minStreakMarquee: 5,
  maxPollingMs: 3000,
  duelRewardCoins: 5000,
  duelCooldownSec: 10,
};

type SettingsListener = (settings: DeveloperSettings) => void;

export class SettingsService {
  private static listeners: SettingsListener[] = [];

  public static onSettingsUpdate(listener: SettingsListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }

  private static notifyListeners(settings: DeveloperSettings) {
    this.listeners.forEach((fn) => fn(settings));
  }

  public static getSettingsSync(): DeveloperSettings {
    return StorageService.getItem<DeveloperSettings>(STORAGE_KEY_SETTINGS, DEFAULT_DEVELOPER_SETTINGS);
  }

  public static async getSettings(): Promise<DeveloperSettings> {
    const cached = this.getSettingsSync();
    try {
      const d1Settings = await D1DatabaseService.getDeveloperSettings();
      if (d1Settings) {
        const merged: DeveloperSettings = {
          ...cached,
          ...d1Settings,
        };
        StorageService.setItem(STORAGE_KEY_SETTINGS, merged);
        this.notifyListeners(merged);
        return merged;
      }
    } catch (e) {
      console.warn('Error fetching settings from D1:', e);
    }
    return cached;
  }

  public static async updateSettings(partial: Partial<DeveloperSettings>): Promise<DeveloperSettings> {
    const current = this.getSettingsSync();
    const updated: DeveloperSettings = {
      ...current,
      ...partial,
    };

    StorageService.setItem(STORAGE_KEY_SETTINGS, updated);
    this.notifyListeners(updated);

    try {
      await D1DatabaseService.updateDeveloperSettings(updated);
    } catch (e) {
      console.warn('Error saving settings to D1:', e);
    }

    return updated;
  }
}

// Subscribe to Realtime Developer Settings updates from Supabase Broadcast
RealtimeService.subscribe('developer_settings_updated', (settings: Partial<DeveloperSettings>) => {
  if (!settings) return;
  const current = SettingsService.getSettingsSync();
  const updated = { ...current, ...settings };
  StorageService.setItem(STORAGE_KEY_SETTINGS, updated);
  (SettingsService as any).notifyListeners(updated);
});
