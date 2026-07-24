import { AutoReplyRule } from '../types';
import { StorageService } from './StorageService';

const STORAGE_KEY_AUTO_REPLY = 'autoReplyRules';

const DEFAULT_AUTO_REPLIES: AutoReplyRule[] = [
  { id: 'ar_1', trigger: 'hallo', response: 'Hallo, Trainer! Ada yang bisa Oguri bantu hari ini?' },
  { id: 'ar_2', trigger: 'halo', response: 'Halo! Salam dari Oguri Cap! 🐴✨' },
  { id: 'ar_3', trigger: 'makan', response: 'Wah, kamu bilang makan? Oguri mau 5 porsi mangkuk ramen dan susu wortel! 🥕🍜' },
  { id: 'ar_4', trigger: 'latihan', response: 'Ayo semangat latihan lari di lintasan Tracen hari ini! 💪' },
  { id: 'ar_5', trigger: 'tebak', response: 'Ketik .tebakkata di simulator bot untuk main tebak kata sama Oguri ya!' },
  { id: 'ar_6', trigger: 'siapa', response: 'Aku Oguri Cap, si Monster Grey dari Kasamatsu & Tracen Academy! 🏆' },
];

export class DeveloperService {
  /**
   * Get Auto Reply Rules
   */
  public static getAutoReplyRules(): AutoReplyRule[] {
    const rules = StorageService.getItem<AutoReplyRule[]>(STORAGE_KEY_AUTO_REPLY, []);
    if (rules.length === 0) {
      StorageService.setItem(STORAGE_KEY_AUTO_REPLY, DEFAULT_AUTO_REPLIES);
      return DEFAULT_AUTO_REPLIES;
    }
    return rules;
  }

  public static addAutoReplyRule(trigger: string, response: string): AutoReplyRule {
    const rules = this.getAutoReplyRules();
    const newRule: AutoReplyRule = {
      id: `ar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      trigger: trigger.trim().toLowerCase(),
      response: response.trim(),
    };
    rules.push(newRule);
    StorageService.setItem(STORAGE_KEY_AUTO_REPLY, rules);
    return newRule;
  }

  public static updateAutoReplyRule(id: string, trigger: string, response: string): boolean {
    const rules = this.getAutoReplyRules();
    const idx = rules.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    rules[idx] = {
      ...rules[idx],
      trigger: trigger.trim().toLowerCase(),
      response: response.trim(),
    };
    StorageService.setItem(STORAGE_KEY_AUTO_REPLY, rules);
    return true;
  }

  public static deleteAutoReplyRule(id: string): boolean {
    const rules = this.getAutoReplyRules();
    const filtered = rules.filter((r) => r.id !== id);
    StorageService.setItem(STORAGE_KEY_AUTO_REPLY, filtered);
    return true;
  }

  public static matchAutoReply(text: string): string | null {
    const rules = this.getAutoReplyRules();
    const lower = text.toLowerCase();
    for (const rule of rules) {
      if (lower.includes(rule.trigger)) {
        return rule.response;
      }
    }
    return null;
  }
}
