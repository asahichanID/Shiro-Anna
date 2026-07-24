import { UserProfile } from '../types';

const USER_STORAGE_KEY = 'musume_user_db_v1';

// Default mock users to make the leaderboard and database feel alive
const DEFAULT_USERS: Record<string, UserProfile> = {
  'trainer_01': {
    id: 'trainer_01',
    name: 'Trainer Sensei',
    carrotCoins: 12500,
    gamesPlayed: 15,
    gamesWon: 12,
    winStreak: 2,
    maxWinStreak: 5,
    lastActive: Date.now(),
  },
  'trainer_02': {
    id: 'trainer_02',
    name: 'Tamamo Cross',
    carrotCoins: 8900,
    gamesPlayed: 10,
    gamesWon: 8,
    winStreak: 1,
    maxWinStreak: 4,
    lastActive: Date.now() - 3600000,
  },
  'trainer_03': {
    id: 'trainer_03',
    name: 'Kipasan Oguri',
    carrotCoins: 5400,
    gamesPlayed: 6,
    gamesWon: 5,
    winStreak: 0,
    maxWinStreak: 3,
    lastActive: Date.now() - 7200000,
  },
};

class UserDatabase {
  private users: Record<string, UserProfile> = {};

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        this.users = JSON.parse(stored);
      } else {
        this.users = { ...DEFAULT_USERS };
        this.save();
      }
    } catch (e) {
      this.users = { ...DEFAULT_USERS };
    }
  }

  private save() {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.users));
    } catch (e) {
      console.error('Failed to save user db:', e);
    }
  }

  public getUser(id: string, name: string = 'Trainer'): UserProfile {
    if (!this.users[id]) {
      this.users[id] = {
        id,
        name,
        carrotCoins: 1000,
        gamesPlayed: 0,
        gamesWon: 0,
        winStreak: 0,
        maxWinStreak: 0,
        lastActive: Date.now(),
      };
      this.save();
    } else {
      let changed = false;
      if (name && this.users[id].name !== name) {
        this.users[id].name = name;
        changed = true;
      }
      if (this.users[id].winStreak === undefined) {
        this.users[id].winStreak = 0;
        changed = true;
      }
      if (this.users[id].maxWinStreak === undefined) {
        this.users[id].maxWinStreak = 0;
        changed = true;
      }
      if (changed) {
        this.save();
      }
    }
    return this.users[id];
  }

  public addCarrotCoins(userId: string, amount: number): UserProfile {
    const user = this.getUser(userId);
    user.carrotCoins += amount;
    user.lastActive = Date.now();
    this.save();
    return user;
  }

  public recordGameAttempt(userId: string, isWin: boolean): UserProfile {
    const user = this.getUser(userId);
    user.gamesPlayed += 1;
    if (isWin) {
      user.gamesWon += 1;
      user.winStreak = (user.winStreak || 0) + 1;
      if (user.winStreak > (user.maxWinStreak || 0)) {
        user.maxWinStreak = user.winStreak;
      }
    } else {
      user.winStreak = 0;
    }
    user.lastActive = Date.now();
    this.save();
    return user;
  }

  public getAllUsers(): UserProfile[] {
    return Object.values(this.users).sort((a, b) => b.carrotCoins - a.carrotCoins);
  }

  public resetDatabase() {
    this.users = { ...DEFAULT_USERS };
    this.save();
  }
}

export const userDb = new UserDatabase();
