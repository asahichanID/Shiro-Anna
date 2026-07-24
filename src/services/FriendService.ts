import { AppUser, Friend, UserStatus } from '../types';
import { StorageService } from './StorageService';
import { ActivityService } from './ActivityService';
import { BOT_DEFAULT_AVATAR } from '../config/constants';

const STORAGE_KEY_FRIENDS = 'friends';
const STORAGE_KEY_ACCOUNTS = 'oguri_registered_accounts';
const STORAGE_KEY_PROFILE = 'oguri_profile';

export class FriendService {
  /**
   * Helper to ensure Shiro Anna is in registered accounts
   */
  private static ensureDevAccountInMap(accountsMap: Record<string, any>): Record<string, any> {
    const hasDev = Object.values(accountsMap).some(
      (acc) => acc.id === '#1' || acc.username?.toLowerCase() === 'shiro anna'
    );

    if (!hasDev) {
      accountsMap['#1'] = {
        id: '#1',
        username: 'Shiro Anna',
        role: 'Developer',
        avatar: BOT_DEFAULT_AVATAR,
        createdAt: '24 Juli 2026',
        coins: 10000,
        totalGame: 0,
        win: 0,
        lose: 0,
      };
      StorageService.setItem(STORAGE_KEY_ACCOUNTS, accountsMap);
    }
    return accountsMap;
  }

  /**
   * Get all registered accounts converted to AppUser format
   */
  public static getAllRegisteredUsers(): AppUser[] {
    let accountsMap = StorageService.getItem<Record<string, any>>(STORAGE_KEY_ACCOUNTS, {});
    accountsMap = this.ensureDevAccountInMap(accountsMap);

    const registeredList = Object.values(accountsMap);

    const users = registeredList.map((acc) => {
      const isDev = acc.role === 'Developer' || acc.id === '#1' || acc.username?.toLowerCase() === 'shiro anna';
      const userAvatar =
        acc.avatar && acc.avatar !== '/assets/avatar.png' && acc.avatar.trim() !== ''
          ? acc.avatar
          : BOT_DEFAULT_AVATAR;

      const role: 'Developer' | 'Trainer' = isDev ? 'Developer' : 'Trainer';

      return {
        id: acc.id || '#1',
        username: acc.username || 'User',
        avatar: userAvatar,
        role,
        status: (acc.status as UserStatus) || 'Online',
        coin: acc.coins || 1000,
        level: acc.level || 1,
        friends: [],
        createdAt: acc.createdAt || '24 Juli 2026',
        totalGame: acc.totalGame || 0,
        win: acc.win || 0,
        lose: acc.lose || 0,
        lastOnline: isDev ? 'Aktif Sekarang' : 'Sebab aktif',
        lastMessage: isDev
          ? 'Halo! Saya Shiro Anna (Developer Tracen Academy).'
          : 'Halo! Salam kenal sesama Trainer!',
      };
    });

    // Always sort Shiro Anna (Developer / ID #1) to top
    users.sort((a, b) => {
      const aIsDev = a.id === '#1' || a.role === 'Developer' || a.username.toLowerCase() === 'shiro anna';
      const bIsDev = b.id === '#1' || b.role === 'Developer' || b.username.toLowerCase() === 'shiro anna';
      if (aIsDev && !bIsDev) return -1;
      if (!aIsDev && bIsDev) return 1;
      return 0;
    });

    return users;
  }

  /**
   * Get all friends for the active user dynamically from registered users database.
   * Shiro Anna (Developer) is ALWAYS sorted to the top.
   */
  public static getFriends(): Friend[] {
    const allUsers = this.getAllRegisteredUsers();
    const activeProfile = StorageService.getItem<any | null>(STORAGE_KEY_PROFILE, null);
    const activeUserId = activeProfile?.id;

    // Filter out active self
    const otherUsers = allUsers.filter((u) => u.id !== activeUserId);

    // Get stored custom friend state if any
    const storedFriends = StorageService.getItem<Friend[]>(STORAGE_KEY_FRIENDS, []);
    const storedMap = new Map(storedFriends.map((f) => [f.id, f]));

    const friendsList: Friend[] = otherUsers.map((u) => {
      const custom = storedMap.get(u.id);
      return {
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        status: custom?.status || u.status || 'Online',
        lastMessage: custom?.lastMessage || u.lastMessage || 'Halo! Salam kenal!',
        lastOnline: custom?.lastOnline || u.lastOnline || 'Sebab aktif',
      };
    });

    // Sort Shiro Anna (Developer / ID #1) ALWAYS to top
    friendsList.sort((a, b) => {
      const aIsDev = a.id === '#1' || a.username.toLowerCase() === 'shiro anna';
      const bIsDev = b.id === '#1' || b.username.toLowerCase() === 'shiro anna';
      if (aIsDev && !bIsDev) return -1;
      if (!aIsDev && bIsDev) return 1;
      return 0;
    });

    return friendsList;
  }

  /**
   * Search users by name or ID query from real registered accounts
   */
  public static searchUsers(query: string): AppUser[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const allUsers = this.getAllRegisteredUsers();
    return allUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(cleanQuery) ||
        u.id.toLowerCase().includes(cleanQuery)
    );
  }

  /**
   * Get friend recommendations strictly from real registered users who logged in
   * Shiro Anna (Developer) is ALWAYS sorted to the top!
   */
  public static getRecommendations(maxCount: number = 50): AppUser[] {
    const allUsers = this.getAllRegisteredUsers();
    const friendList = this.getFriends();
    const friendIds = new Set(friendList.map((f) => f.id));

    // Get active current user ID to avoid recommending oneself
    const activeProfile = StorageService.getItem<any | null>(STORAGE_KEY_PROFILE, null);
    const activeUserId = activeProfile?.id;

    // Filter out active self and existing friends
    const nonFriends = allUsers.filter((u) => u.id !== activeUserId && !friendIds.has(u.id));

    // Sort Shiro Anna (Developer / ID #1) to top
    nonFriends.sort((a, b) => {
      const aIsDev = a.id === '#1' || a.role === 'Developer' || a.username.toLowerCase() === 'shiro anna';
      const bIsDev = b.id === '#1' || b.role === 'Developer' || b.username.toLowerCase() === 'shiro anna';
      if (aIsDev && !bIsDev) return -1;
      if (!aIsDev && bIsDev) return 1;
      return 0;
    });

    return nonFriends.slice(0, maxCount);
  }

  /**
   * Add a real registered user to the friend list
   */
  public static addFriend(user: AppUser): Friend {
    const currentFriends = this.getFriends();
    const existing = currentFriends.find((f) => f.id === user.id);
    if (existing) return existing;

    const newFriend: Friend = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      status: user.status || 'Online',
      lastMessage: user.lastMessage || 'Halo! Baru berteman.',
      lastOnline: user.lastOnline || 'Sebab aktif',
    };

    const updatedFriends = [newFriend, ...currentFriends];
    StorageService.setItem(STORAGE_KEY_FRIENDS, updatedFriends);

    ActivityService.logActivity(
      'system',
      'Menambah Teman Baru',
      `Menambahkan ${user.username} (${user.id}) ke dalam daftar teman.`,
      undefined,
      undefined,
      'Friends'
    );

    return newFriend;
  }

  /**
   * Remove a friend from list
   */
  public static removeFriend(friendId: string): boolean {
    const currentFriends = this.getFriends();
    const filtered = currentFriends.filter((f) => f.id !== friendId);
    StorageService.setItem(STORAGE_KEY_FRIENDS, filtered);
    return true;
  }
}
