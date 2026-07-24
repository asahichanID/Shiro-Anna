import { AppUser, Friend } from '../types';
import { StorageService } from './StorageService';
import { DeveloperService } from './DeveloperService';

const STORAGE_KEY_FRIENDS = 'friends';
const STORAGE_KEY_USERS = 'users';

const DEFAULT_RECOMMENDED_NAMES = [
  'Oguri Cap',
  'Rice Shower',
  'Gold Ship',
  'Mejiro McQueen',
  'Special Week',
  'Vodka',
  'Daiwa Scarlet',
  'Symboli Rudolf',
  'Haru Urara',
  'Narita Brian',
  'Super Creek',
  'Inari One',
  'Tokai Teio',
  'Silence Suzuka',
  'MachiKanefukukitaru',
  'Nice Nature', 'Twin Turbo', 'Biwa Hayahide', 'Winning Ticket', 'Narita Taishin',
  'Agnes Tachyon', 'Manhattan Cafe', 'Eishin Flash', 'Smart Falcon', 'Kopano Rickey',
  'Hokko Tarumae', 'Wonder Acute', 'Curren Chan', 'Aston Machan', 'Kawakami Princess',
  'Sweep Tosho', 'Fine Motion', 'Mejiro Dober', 'Mejiro Ardan', 'Sakura Chiyo O',
  'Sirius Symboli', 'Nakayama Festa', 'Tamamo Cross', 'Kitasan Black', 'Satono Diamond',
  'Maruzensky', 'Taiki Shuttle', 'Grass Wonder', 'El Condor Pasa', 'Air Groove',
  'Mayano Top Gun', 'Ikuno Dictus', 'Matikanetannhauser', 'Mejiro Ryan', 'Sirius'
];

export class FriendService {
  /**
   * Ensure default users exist in storage if empty
   */
  public static initDefaultUsers(): AppUser[] {
    let users = StorageService.getItem<AppUser[]>(STORAGE_KEY_USERS, []);
    if (users.length === 0) {
      DeveloperService.generateDummyUsers(50);
      users = StorageService.getItem<AppUser[]>(STORAGE_KEY_USERS, []);
    }
    return users;
  }

  /**
   * Get all friends added by current user
   */
  public static getFriends(): Friend[] {
    return StorageService.getItem<Friend[]>(STORAGE_KEY_FRIENDS, []);
  }

  /**
   * Search users by name query
   */
  public static searchUsers(query: string): AppUser[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const allUsers = this.initDefaultUsers();
    return allUsers.filter((u) => u.username.toLowerCase().includes(cleanQuery));
  }

  /**
   * Get friend recommendations (up to 50)
   */
  public static getRecommendations(maxCount: number = 50): AppUser[] {
    const allUsers = this.initDefaultUsers();
    const friendList = this.getFriends();
    const friendIds = new Set(friendList.map((f) => f.id));

    // Filter out users who are already friends
    const nonFriends = allUsers.filter((u) => !friendIds.has(u.id));
    return nonFriends.slice(0, maxCount);
  }

  /**
   * Add a user to friend list
   */
  public static addFriend(user: AppUser): Friend {
    const currentFriends = this.getFriends();
    const existing = currentFriends.find((f) => f.id === user.id);
    if (existing) return existing;

    const newFriend: Friend = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      status: user.status,
      lastMessage: user.lastMessage || 'Halo! Baru berteman.',
      lastOnline: user.lastOnline || 'Sebab aktif',
    };

    const updatedFriends = [newFriend, ...currentFriends];
    StorageService.setItem(STORAGE_KEY_FRIENDS, updatedFriends);

    // Update user's friends list array in users DB
    const allUsers = StorageService.getItem<AppUser[]>(STORAGE_KEY_USERS, []);
    const userIdx = allUsers.findIndex((u) => u.id === user.id);
    if (userIdx !== -1) {
      if (!allUsers[userIdx].friends.includes('me')) {
        allUsers[userIdx].friends.push('me');
        StorageService.setItem(STORAGE_KEY_USERS, allUsers);
      }
    }

    return newFriend;
  }

  /**
   * Remove a friend
   */
  public static removeFriend(friendId: string): boolean {
    const currentFriends = this.getFriends();
    const filtered = currentFriends.filter((f) => f.id !== friendId);
    StorageService.setItem(STORAGE_KEY_FRIENDS, filtered);
    return true;
  }
}
