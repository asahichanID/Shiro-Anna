import { AutoReplyRule, AppUser, UserStatus } from '../types';
import { StorageService } from './StorageService';

const STORAGE_KEY_AUTO_REPLY = 'autoReplyRules';
const STORAGE_KEY_USERS = 'users';

const DEFAULT_AUTO_REPLIES: AutoReplyRule[] = [
  { id: 'ar_1', trigger: 'hallo', response: 'Hallo, Trainer! Ada yang bisa Oguri bantu hari ini?' },
  { id: 'ar_2', trigger: 'halo', response: 'Halo! Salam dari Oguri Cap! 🐴✨' },
  { id: 'ar_3', trigger: 'makan', response: 'Wah, kamu bilang makan? Oguri mau 5 porsi mangkuk ramen dan susu wortel! 🥕🍜' },
  { id: 'ar_4', trigger: 'latihan', response: 'Ayo semangat latihan lari di lintasan Tracen hari ini! 💪' },
  { id: 'ar_5', trigger: 'tebak', response: 'Ketik .tebakkata di simulator bot untuk main tebak kata sama Oguri ya!' },
  { id: 'ar_6', trigger: 'siapa', response: 'Aku Oguri Cap, si Monster Grey dari Kasamatsu & Tracen Academy! 🏆' },
];

const UMAMUSUME_NAMES = [
  'Oguri Cap', 'Rice Shower', 'Gold Ship', 'Mejiro McQueen', 'Special Week',
  'Vodka', 'Daiwa Scarlet', 'Symboli Rudolf', 'Haru Urara', 'Narita Brian',
  'Super Creek', 'Inari One', 'Tokai Teio', 'Silence Suzuka', 'Mejiro Ryan',
  'Twin Turbo', 'MachiKanefukukitaru', 'Nice Nature', 'Ikuno Dictus', 'Matikanetannhauser',
  'Tamamo Cross', 'Kitasan Black', 'Satono Diamond', 'Maruzensky', 'Taiki Shuttle',
  'Grass Wonder', 'El Condor Pasa', 'Air Groove', 'Mayano Top Gun', 'Biwa Hayahide',
  'Winning Ticket', 'Narita Taishin', 'Agnes Tachyon', 'Manhattan Cafe', 'Eishin Flash',
  'Smart Falcon', 'Kopano Rickey', 'Hokko Tarumae', 'Wonder Acute', 'Curren Chan',
  'Aston Machan', 'Kawakami Princess', 'Sweep Tosho', 'Fine Motion', 'Mejiro Dober',
  'Mejiro Ardan', 'Sakura Chiyo O', 'Sirius Symboli', 'Nakayama Festa', 'Mambo Number Five'
];

const AVATAR_COLORS = [
  'from-sky-500 to-indigo-600',
  'from-pink-500 to-rose-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-red-500 to-purple-600',
  'from-violet-500 to-fuchsia-600'
];

const DUMMY_STATUSES: UserStatus[] = ['Online', 'Offline', 'Away', 'Busy'];

const DUMMY_MESSAGES = [
  'Halo!',
  'Sedang bermain.',
  'Nanti ya, lagi latihan.',
  'Sampai jumpa di balapan!',
  'Semangat Trainer!',
  'Aku lapar nih...',
  'Oguri sedang makan wortel 🥕',
  'Ayo main tebak kata!',
  'Kapan kita balapan lagi?',
  'Hari ini cerah banget ya!'
];

export class DeveloperService {
  // Auto Reply Manager
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

  // Dummy Users Generator
  public static generateDummyUsers(count: number): AppUser[] {
    const existingUsers = StorageService.getItem<AppUser[]>(STORAGE_KEY_USERS, []);
    const existingIds = new Set(existingUsers.map((u) => u.id));

    const newUsers: AppUser[] = [];

    for (let i = 0; i < count; i++) {
      const idNum = Math.floor(1000 + Math.random() * 9000);
      const userId = `#DUMMY_${idNum}_${i}`;
      if (existingIds.has(userId)) continue;

      const nameIndex = i % UMAMUSUME_NAMES.length;
      const baseName = UMAMUSUME_NAMES[nameIndex];
      const nameModifier = i >= UMAMUSUME_NAMES.length ? ` #${Math.floor(i / UMAMUSUME_NAMES.length) + 1}` : '';
      const name = `${baseName}${nameModifier}`;

      const colorGradient = AVATAR_COLORS[i % AVATAR_COLORS.length];
      const avatarSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g${i}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2338bdf8"/><stop offset="100%" stop-color="%23818cf8"/></linearGradient></defs><circle cx="50" cy="50" r="50" fill="url(%23g${i})"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold" font-size="32">${encodeURIComponent(baseName.substring(0, 2).toUpperCase())}</text></svg>`;

      const status = DUMMY_STATUSES[Math.floor(Math.random() * DUMMY_STATUSES.length)];
      const coins = Math.floor(500 + Math.random() * 9500);
      const level = Math.floor(1 + Math.random() * 50);
      const totalGame = Math.floor(5 + Math.random() * 100);
      const win = Math.floor(totalGame * (0.3 + Math.random() * 0.5));
      const lose = totalGame - win;
      const lastMsg = DUMMY_MESSAGES[Math.floor(Math.random() * DUMMY_MESSAGES.length)];

      const lastOnlineMins = Math.floor(1 + Math.random() * 120);
      const lastOnlineStr = status === 'Online' ? 'Sebab aktif' : `${lastOnlineMins} menit lalu`;

      const newUser: AppUser = {
        id: userId,
        username: name,
        avatar: avatarSvg,
        role: 'Trainer',
        status,
        coin: coins,
        level,
        friends: [],
        createdAt: '24 Juli 2026',
        totalGame,
        win,
        lose,
        lastOnline: lastOnlineStr,
        lastMessage: lastMsg,
      };

      newUsers.push(newUser);
    }

    const updatedUsersList = [...existingUsers, ...newUsers];
    StorageService.setItem(STORAGE_KEY_USERS, updatedUsersList);
    return newUsers;
  }

  public static getAllUsers(): AppUser[] {
    return StorageService.getItem<AppUser[]>(STORAGE_KEY_USERS, []);
  }
}
