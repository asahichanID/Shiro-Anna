import { D1DatabaseService, DeveloperBadgeData } from './D1DatabaseService';
import { StorageService } from './StorageService';
import { BadgeThemeId } from '../config/badgeThemes';

export interface AutoReplyRule {
  id: string;
  keyword: string;
  reply: string;
  matchType?: 'contains' | 'exact';
}

const STORAGE_KEY_AUTO_REPLIES = 'oguri_auto_replies';
const STORAGE_KEY_DEV_BADGE = 'oguri_dev_badge';

const DEFAULT_RULES: AutoReplyRule[] = [
  { id: '1', keyword: 'halo', reply: 'Halo Trainer! Ada yang bisa Oguri bantu?', matchType: 'contains' },
  { id: '2', keyword: 'pagi', reply: 'Selamat pagi! Semangat latihannya hari ini 🏃‍♀️', matchType: 'contains' },
  { id: '3', keyword: 'wortel', reply: 'Wortel?! Oguri mau dong! 🥕🥕', matchType: 'contains' },
];

export class DeveloperService {
  public static getAutoReplies(): AutoReplyRule[] {
    return StorageService.getItem<AutoReplyRule[]>(STORAGE_KEY_AUTO_REPLIES, DEFAULT_RULES);
  }

  public static saveAutoReplies(rules: AutoReplyRule[]): void {
    StorageService.setItem(STORAGE_KEY_AUTO_REPLIES, rules);
  }

  public static matchAutoReply(inputMessage: string): string | null {
    const rules = this.getAutoReplies();
    const cleanMsg = inputMessage.toLowerCase().trim();

    for (const rule of rules) {
      const kw = rule.keyword.toLowerCase().trim();
      if (!kw) continue;

      if (rule.matchType === 'exact') {
        if (cleanMsg === kw) return rule.reply;
      } else {
        if (cleanMsg.includes(kw)) return rule.reply;
      }
    }
    return null;
  }

  public static async getDeveloperBadge(): Promise<DeveloperBadgeData> {
    const cached = StorageService.getItem<DeveloperBadgeData>(STORAGE_KEY_DEV_BADGE, {
      userId: '#1',
      badgeName: 'Ruby Developer',
      themeId: 'ruby' as BadgeThemeId,
      icon: '🔥',
      effect: 'Shine & Glow',
    });

    try {
      const d1Badge = await D1DatabaseService.getDeveloperBadge();
      if (d1Badge && d1Badge.badgeName) {
        StorageService.setItem(STORAGE_KEY_DEV_BADGE, d1Badge);
        return d1Badge;
      }
    } catch (e) {
      console.warn('Error fetching developer badge from D1:', e);
    }

    return cached;
  }

  public static async updateDeveloperBadge(data: Partial<DeveloperBadgeData>): Promise<DeveloperBadgeData> {
    const current = await this.getDeveloperBadge();
    const updated: DeveloperBadgeData = {
      ...current,
      ...data,
      updatedAt: Date.now(),
    };

    StorageService.setItem(STORAGE_KEY_DEV_BADGE, updated);

    try {
      const result = await D1DatabaseService.updateDeveloperBadge(updated);
      if (result) {
        StorageService.setItem(STORAGE_KEY_DEV_BADGE, result);
        return result;
      }
    } catch (e) {
      console.warn('Error updating developer badge on D1:', e);
    }

    return updated;
  }
}
