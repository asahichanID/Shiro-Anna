import { D1DatabaseService } from './D1DatabaseService';
import { StorageService } from './StorageService';
import { Friend } from '../types';

const STORAGE_KEY_FRIENDS = 'oguri_friends_list';

export const DEVELOPER_FRIEND_RECORD: Friend = {
  id: '#1',
  username: 'Shiro Anna',
  avatar: 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
  status: 'Online',
  lastMessage: 'Salam dari Lead Developer Tracen Academy! 🐎⚡',
  lastOnline: 'Online Sekarang',
  bio: 'Lead Developer & Creator of Oguri Cap Bot',
  role: 'Developer',
  isOnline: true,
};

type FriendsListener = (friends: Friend[]) => void;

export class FriendsService {
  private static listeners: FriendsListener[] = [];

  public static onFriendsUpdate(listener: FriendsListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }

  private static notifyListeners(friends: Friend[]) {
    this.listeners.forEach((fn) => fn(friends));
  }

  /**
   * Sort friends ensuring Developer Shiro Anna is ALWAYS pinned at index 0
   */
  public static ensureDeveloperAtTop(friends: Friend[]): Friend[] {
    const withoutDev = friends.filter((f) => f.id !== '#1' && f.username.toLowerCase() !== 'shiro anna');
    return [DEVELOPER_FRIEND_RECORD, ...withoutDev];
  }

  public static getFriendsSync(): Friend[] {
    const cached = StorageService.getItem<Friend[]>(STORAGE_KEY_FRIENDS, []);
    return this.ensureDeveloperAtTop(cached);
  }

  public static async getFriends(userId: string = 'trainer_01'): Promise<Friend[]> {
    const cached = this.getFriendsSync();
    try {
      const d1Friends = await D1DatabaseService.getFriends(userId);
      if (d1Friends && Array.isArray(d1Friends)) {
        const sorted = this.ensureDeveloperAtTop(d1Friends);
        StorageService.setItem(STORAGE_KEY_FRIENDS, sorted);
        this.notifyListeners(sorted);
        return sorted;
      }
    } catch (e) {
      console.warn('Error fetching friends from D1:', e);
    }
    return cached;
  }

  public static async addFriend(userId: string = 'trainer_01', friend: Partial<Friend>): Promise<Friend[]> {
    const current = this.getFriendsSync();
    const friendId = friend.id || `fr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Don't duplicate developer
    if (friendId === '#1' || friend.username?.toLowerCase() === 'shiro anna') {
      return current;
    }

    const newFriend: Friend = {
      id: friendId,
      username: friend.username || 'Trainer Musume',
      avatar: friend.avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
      status: friend.status || 'Online',
      lastMessage: friend.lastMessage || 'Halo! Mari berteman!',
      lastOnline: friend.lastOnline || 'Baru saja',
      bio: friend.bio || 'Trainer Tracen Academy',
      role: friend.role || 'Trainer',
      isOnline: friend.isOnline !== undefined ? friend.isOnline : true,
    };

    const updated = this.ensureDeveloperAtTop([newFriend, ...current.filter((f) => f.id !== friendId)]);
    StorageService.setItem(STORAGE_KEY_FRIENDS, updated);
    this.notifyListeners(updated);

    try {
      await D1DatabaseService.addFriend(userId, newFriend);
    } catch (e) {
      console.warn('Error adding friend to D1:', e);
    }

    return updated;
  }

  public static async removeFriend(userId: string = 'trainer_01', friendId: string): Promise<Friend[]> {
    // Cannot remove developer
    if (friendId === '#1') {
      return this.getFriendsSync();
    }

    const current = this.getFriendsSync();
    const updated = current.filter((f) => f.id !== friendId);
    const sorted = this.ensureDeveloperAtTop(updated);

    StorageService.setItem(STORAGE_KEY_FRIENDS, sorted);
    this.notifyListeners(sorted);

    try {
      await D1DatabaseService.removeFriend(userId, friendId);
    } catch (e) {
      console.warn('Error removing friend from D1:', e);
    }

    return sorted;
  }
}
