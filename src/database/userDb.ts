import { AppUser, UserProfile, Friend } from '../types';
import { StorageService } from '../services/StorageService';
import { D1DatabaseService } from '../services/D1DatabaseService';

const STORAGE_KEY_USER = 'oguri_user_profile';
const STORAGE_KEY_USERS_ALL = 'oguri_all_registered_users';
const STORAGE_KEY_FRIENDS = 'oguri_friends_list';

export class UserDatabaseService {
  /**
   * Synchronous getUser to maintain existing game handler & UI compatibility
   */
  public static getUser(id: string = '#1', defaultName?: string): UserProfile & AppUser {
    const all = this.getAllUsers();
    let found = all.find((u) => u.id === id || u.username === defaultName);

    if (!found) {
      found = {
        id,
        username: defaultName || 'Shiro Anna',
        name: defaultName || 'Shiro Anna',
        role: defaultName === 'Shiro Anna' ? 'Developer' : 'Trainer',
        avatar: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
        status: 'Online',
        coin: 100000,
        carrotCoins: 100000,
        level: 100,
        friends: [],
        createdAt: '2026-01-01',
        totalGame: 0,
        gamesPlayed: 0,
        win: 0,
        gamesWon: 0,
        lose: 0,
        winStreak: 0,
        maxWinStreak: 0,
        lastActive: Date.now(),
        lastOnline: 'Baru saja',
        lastMessage: 'Halo!',
      } as any;
      all.push(found as any);
      StorageService.setItem(STORAGE_KEY_USERS_ALL, all);

      // Async sync to D1
      D1DatabaseService.registerOrLoginUser({
        id: found!.id,
        username: found!.username,
        role: found!.role,
        avatar: found!.avatar,
        coins: found!.carrotCoins,
        totalGame: found!.gamesPlayed,
        win: found!.gamesWon,
        lose: found!.lose,
      }).catch((e) => {
        console.error('[D1 USER INSERT FAIL]:', e);
      });
    }

    // Ensure all compatibility fields exist
    (found as any).carrotCoins = found.carrotCoins !== undefined ? found.carrotCoins : (found.coin || 1000);
    (found as any).coin = (found as any).carrotCoins;
    (found as any).name = found.name || found.username;
    (found as any).gamesPlayed = found.gamesPlayed !== undefined ? found.gamesPlayed : (found.totalGame || 0);
    (found as any).gamesWon = found.gamesWon !== undefined ? found.gamesWon : (found.win || 0);
    (found as any).winStreak = found.winStreak || 0;
    (found as any).maxWinStreak = found.maxWinStreak || 0;

    return found as any;
  }

  public static getCurrentUser(): AppUser {
    return this.getUser('#1');
  }

  public static getAllUsers(): (AppUser & UserProfile)[] {
    const cached = StorageService.getItem<any[]>(STORAGE_KEY_USERS_ALL, []);
    if (cached.length === 0) {
      const defaultUser = {
        id: '#1',
        username: 'Shiro Anna',
        name: 'Shiro Anna',
        role: 'Developer',
        avatar: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
        status: 'Online',
        coin: 100000,
        carrotCoins: 100000,
        level: 100,
        friends: [],
        createdAt: '2026-01-01',
        totalGame: 0,
        gamesPlayed: 0,
        win: 0,
        gamesWon: 0,
        lose: 0,
        winStreak: 0,
        maxWinStreak: 0,
        lastActive: Date.now(),
        lastOnline: 'Baru saja',
        lastMessage: 'Halo!',
      };
      cached.push(defaultUser);
      StorageService.setItem(STORAGE_KEY_USERS_ALL, cached);
    }

    return cached;
  }

  public static async refreshUsersFromD1(): Promise<(AppUser & UserProfile)[]> {
    try {
      const d1Users = await D1DatabaseService.getUsers();
      if (d1Users && Array.isArray(d1Users) && d1Users.length > 0) {
        const cached = StorageService.getItem<any[]>(STORAGE_KEY_USERS_ALL, []);
        const mergedMap = new Map<string, any>();

        // Put cached local users first
        cached.forEach((u) => mergedMap.set(u.id, u));

        // Merge D1 users intelligently
        d1Users.forEach((du) => {
          const local = mergedMap.get(du.id);
          if (local) {
            mergedMap.set(du.id, {
              ...local,
              ...du,
              // Keep local carrotCoins if local has earned coins higher than default
              carrotCoins: Math.max(local.carrotCoins || 0, du.carrotCoins || du.coin || 0),
              coin: Math.max(local.coin || 0, du.coin || du.carrotCoins || 0),
              gamesPlayed: Math.max(local.gamesPlayed || 0, du.totalGame || 0),
              gamesWon: Math.max(local.gamesWon || 0, du.win || 0),
            });
          } else {
            mergedMap.set(du.id, du);
          }
        });

        const mergedList = Array.from(mergedMap.values());
        StorageService.setItem(STORAGE_KEY_USERS_ALL, mergedList);
        return mergedList;
      }
    } catch (err) {
      console.error('[D1 SELECT USERS ERROR]:', err);
    }
    return this.getAllUsers();
  }

  public static saveUser(user: any): AppUser {
    StorageService.setItem(STORAGE_KEY_USER, user);

    const all = StorageService.getItem<any[]>(STORAGE_KEY_USERS_ALL, []);
    const idx = all.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      all[idx] = user;
    } else {
      all.push(user);
    }
    StorageService.setItem(STORAGE_KEY_USERS_ALL, all);

    // Sync to D1 Database
    const coinsToSync = user.carrotCoins !== undefined ? user.carrotCoins : (user.coin || 1000);
    const totalGameToSync = user.gamesPlayed !== undefined ? user.gamesPlayed : (user.totalGame || 0);
    const winToSync = user.gamesWon !== undefined ? user.gamesWon : (user.win || 0);

    D1DatabaseService.updateUserStats({
      id: user.id || '#1',
      username: user.username || user.name,
      role: user.role,
      avatar: user.avatar,
      coins: coinsToSync,
      totalGame: totalGameToSync,
      win: winToSync,
      lose: user.lose || 0,
      status: user.status || 'Online',
    }).catch((e) => {
      console.error('[D1 USER REGISTRATION/UPDATE ERROR]:', e);
    });

    return user;
  }

  public static addCarrotCoins(userIdOrAmount: string | number, amountOrNothing?: number): AppUser {
    let userId = '#1';
    let amount = 0;

    if (typeof userIdOrAmount === 'number') {
      amount = userIdOrAmount;
    } else {
      userId = userIdOrAmount;
      amount = typeof amountOrNothing === 'number' ? amountOrNothing : 0;
    }

    const user = this.getUser(userId);
    user.carrotCoins = (user.carrotCoins || 0) + amount;
    user.coin = user.carrotCoins;
    return this.saveUser(user);
  }

  public static recordGameAttempt(userId: string = '#1', isWon: boolean): AppUser {
    const user = this.getUser(userId);
    user.gamesPlayed = (user.gamesPlayed || 0) + 1;
    user.totalGame = user.gamesPlayed;

    if (isWon) {
      user.gamesWon = (user.gamesWon || 0) + 1;
      user.win = user.gamesWon;
      user.winStreak = (user.winStreak || 0) + 1;
      if (user.winStreak > (user.maxWinStreak || 0)) {
        user.maxWinStreak = user.winStreak;
      }
      user.carrotCoins = (user.carrotCoins || 0) + 100;
      user.coin = user.carrotCoins;
    } else {
      user.lose = (user.lose || 0) + 1;
      user.winStreak = 0;
    }

    return this.saveUser(user);
  }

  public static resetDatabase(): void {
    StorageService.removeItem(STORAGE_KEY_USER);
    StorageService.removeItem(STORAGE_KEY_USERS_ALL);
    StorageService.removeItem(STORAGE_KEY_FRIENDS);
  }

  public static getFriends(userId: string = '#1'): Friend[] {
    const cached = StorageService.getItem<Friend[]>(STORAGE_KEY_FRIENDS, []);
    // Sync with D1 in background
    D1DatabaseService.getFriends(userId).then((d1Friends) => {
      if (d1Friends && d1Friends.length > 0) {
        StorageService.setItem(STORAGE_KEY_FRIENDS, d1Friends);
      }
    }).catch((err) => {
      console.error('[D1 SELECT FRIENDS ERROR]:', err);
    });

    return cached;
  }

  public static addFriend(friend: Friend, userId: string = '#1'): Friend[] {
    const friends = this.getFriends(userId);
    if (!friends.some((f) => f.id === friend.id)) {
      friends.push(friend);
      StorageService.setItem(STORAGE_KEY_FRIENDS, friends);
      D1DatabaseService.addFriend(userId, friend).catch((err) => {
        console.error('[D1 INSERT FRIEND ERROR]:', err);
      });
    }
    return friends;
  }
}

export const userDb = UserDatabaseService;
