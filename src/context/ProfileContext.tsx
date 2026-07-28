import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ActivityService } from '../services/ActivityService';
import { BOT_DEFAULT_AVATAR } from '../config/constants';
import { D1DatabaseService } from '../services/D1DatabaseService';
import { NotificationService } from '../services/NotificationService';
import { StateSyncService } from '../services/StateSyncService';
import { userDb } from '../database/userDb';
import { RealtimeService } from '../services/SupabaseService';
import { FriendsService } from '../services/FriendsService';
import { StorageService } from '../services/StorageService';

function generateUuid(): string {
  if (typeof globalThis !== 'undefined') {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
      return cryptoObj.randomUUID();
    }
  }

  return `uuid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateEightDigitCode(existingCodes: Iterable<string> = []): string {
  const used = new Set(Array.from(existingCodes, (value) => String(value)));
  let code = '';

  do {
    code = String(Math.floor(10_000_000 + Math.random() * 90_000_000));
  } while (used.has(code));

  return code;
}


export interface UserAccount {
  id: string;
  username: string;
  role: 'Developer' | 'Trainer';
  avatar: string;
  createdAt: string;
  coins: number;
  totalGame: number;
  win: number;
  lose: number;
  accountCode?: string;
  sessionToken?: string;
  sessionActive?: boolean;
  lastSeen?: number;
  updatedAt?: number;
}

interface ProfileContextType {
  profile: UserAccount | null;
  isLoggedIn: boolean;
  activeBadge: string | null;
  activeBadgeCustomName: string;
  refreshBadges: () => Promise<void>;
  login: (username: string) => { success: boolean; error?: string };
  updateUsername: (newUsername: string) => { success: boolean; error?: string };
  updateAvatar: (base64Image: string) => void;
  updateStats: (coins: number, totalGame: number, win: number, lose: number) => void;
  updateCoins: (newCoins: number) => void;
  getRegisteredNames: () => string[];
  logout: () => void;
}

const STORAGE_KEY_PROFILE = 'oguri_profile';
const STORAGE_KEY_ACCOUNTS = 'oguri_registered_accounts';
const STORAGE_KEY_ID_COUNTER = 'oguri_player_id_counter';

const RESERVED_NAMES = ['shiro anna'];


const DEFAULT_AVATAR = BOT_DEFAULT_AVATAR;

const ensureSessionMeta = (account: UserAccount): UserAccount => ({
  ...account,
  accountCode: account.accountCode || generateEightDigitCode(),
  sessionToken: account.sessionToken || generateUuid(),
  sessionActive: account.sessionActive !== false,
  lastSeen: account.lastSeen || Date.now(),
  updatedAt: account.updatedAt || Date.now(),
});

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserAccount | null>(null);
  const [activeBadge, setActiveBadge] = useState<string | null>(null);
  const [activeBadgeCustomName, setActiveBadgeCustomName] = useState<string>('');
  const lastSyncRef = useRef<number>(0);
  const lastProfileSnapshotRef = useRef<string>('');

  const refreshBadges = async () => {
    const targetUserId = profile?.id || '#1';
    try {
      const res = await D1DatabaseService.getUserBadges(targetUserId);
      if (res) {
        setActiveBadge(res.activeBadge);
        setActiveBadgeCustomName(res.customName || '');
      }
    } catch (e) {
      console.warn('Failed to load user badges in ProfileContext:', e);
    }
  };

  useEffect(() => {
    refreshBadges();

    const unsubRealtime = RealtimeService.subscribe('user_badge_updated', (payload: any) => {
      const targetUserId = profile?.id || '#1';
      if (!payload || payload.userId === targetUserId || payload.userId === '#1') {
        refreshBadges();
      }
    });

    return () => {
      unsubRealtime();
    };
  }, [profile?.id]);

  // Request browser notifications permission
  useEffect(() => {
    NotificationService.requestPermission();
  }, []);

  // Load profile on startup & sync with D1
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (savedProfile) {
        const parsed: UserAccount = ensureSessionMeta(JSON.parse(savedProfile));
        if (!parsed.avatar || parsed.avatar === '/assets/avatar.png' || parsed.avatar.trim() === '') {
          parsed.avatar = DEFAULT_AVATAR;
        }
        setProfile(parsed);
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(parsed));

        // Register/Login to D1
        D1DatabaseService.registerOrLoginUser({
          id: parsed.id,
          username: parsed.username,
          role: parsed.role,
          avatar: parsed.avatar,
          coins: parsed.coins,
          totalGame: parsed.totalGame,
          win: parsed.win,
          lose: parsed.lose,
          accountCode: parsed.accountCode,
          sessionToken: parsed.sessionToken,
        });
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
  }, []);

  // Real-time Presence & Sync Polling Engine (1 second)
  useEffect(() => {
    if (!profile) return;

    lastSyncRef.current = Math.max(lastSyncRef.current, Date.now() - 1000);

    const syncOnce = async () => {
      const since = lastSyncRef.current || Date.now() - 1000;

      try {
        await D1DatabaseService.updatePresence({
          userId: profile.id,
          status: 'Online',
          sessionToken: profile.sessionToken,
          device: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop',
          browser: navigator.userAgent,
        });
      } catch (e) {
        console.warn('Presence heartbeat skipped:', e);
      }

      try {
        const syncData = await D1DatabaseService.pollSync(profile.id, since);
        if (!syncData) return;

        if (typeof syncData.lastTimestamp === 'number' && syncData.lastTimestamp > lastSyncRef.current) {
          lastSyncRef.current = syncData.lastTimestamp;
        }

        const changed: any = syncData.changed || (syncData as any);
        if (changed?.users?.length) {
          const currentId = profile.id;
          const currentName = profile.username.toLowerCase();

          changed.users.forEach((u: any) => {
            const payload = {
              id: u.id,
              username: u.username,
              role: u.role,
              avatar: u.avatar,
              coins: u.coin ?? u.coins,
              carrotCoins: u.carrotCoins ?? u.coins,
              totalGame: u.totalGame ?? 0,
              win: u.win ?? 0,
              lose: u.lose ?? 0,
              status: u.status,
              accountCode: u.accountCode,
              sessionToken: u.sessionToken,
              sessionActive: u.sessionActive,
              lastSeen: u.lastSeen,
              updatedAt: u.updatedAt,
            };

            const currentProfileRaw = localStorage.getItem(STORAGE_KEY_PROFILE);
            const parsedProfile = currentProfileRaw ? JSON.parse(currentProfileRaw) : null;
            const isCurrentProfile = u.id === currentId || (u.username && u.username.toLowerCase() === currentName);
            const hasMeaningfulChange = !parsedProfile || (
              parsedProfile.username !== payload.username ||
              parsedProfile.role !== payload.role ||
              parsedProfile.avatar !== payload.avatar ||
              parsedProfile.coins !== payload.coins ||
              parsedProfile.totalGame !== payload.totalGame ||
              parsedProfile.win !== payload.win ||
              parsedProfile.lose !== payload.lose ||
              parsedProfile.accountCode !== payload.accountCode ||
              parsedProfile.sessionToken !== payload.sessionToken ||
              parsedProfile.sessionActive !== payload.sessionActive ||
              parsedProfile.status !== payload.status
            );

            if (hasMeaningfulChange) {
              RealtimeService.broadcast('user_stats_updated', payload);
            }

            if (isCurrentProfile && hasMeaningfulChange) {
              try {
                const merged = {
                  ...parsedProfile,
                  username: u.username || parsedProfile?.username,
                  role: u.role || parsedProfile?.role,
                  avatar: u.avatar || parsedProfile?.avatar,
                  coins: u.coin ?? u.coins ?? parsedProfile?.coins,
                  totalGame: u.totalGame ?? parsedProfile?.totalGame,
                  win: u.win ?? parsedProfile?.win,
                  lose: u.lose ?? parsedProfile?.lose,
                  accountCode: u.accountCode || parsedProfile?.accountCode,
                  sessionToken: u.sessionToken || parsedProfile?.sessionToken,
                  sessionActive: u.sessionActive ?? parsedProfile?.sessionActive,
                  lastSeen: u.lastSeen ?? parsedProfile?.lastSeen,
                  updatedAt: u.updatedAt ?? parsedProfile?.updatedAt,
                };
                const snapshot = JSON.stringify(merged);
                if (snapshot !== lastProfileSnapshotRef.current) {
                  lastProfileSnapshotRef.current = snapshot;
                  localStorage.setItem(STORAGE_KEY_PROFILE, snapshot);
                  setProfile(merged);
                }
              } catch (e) {
                // ignored
              }
            }
          });
        }

        if (changed?.presence?.length) {
          changed.presence.forEach((p: any) => {
            const currentFriends = FriendsService.getFriendsSync();
            const matchedFriend = currentFriends.find((f) => f.id === p.userId);
            const nextStatus = p.status || 'Offline';
            if (!matchedFriend || matchedFriend.status === nextStatus) return;
            RealtimeService.broadcast('user_presence_updated', { userId: p.userId, status: nextStatus, lastActive: p.lastActive });
          });
        }

        if (changed?.friends?.length) {
          const currentFriends = FriendsService.getFriendsSync();
          const merged = [...currentFriends];
          let mutated = false;
          changed.friends.forEach((f: any) => {
            const idx = merged.findIndex((x) => x.id === f.id || x.id === f.friendId);
            const normalized = {
              id: f.id || f.friendId,
              username: f.username || 'Trainer',
              avatar: f.avatar || 'https://cdn.jsdelivr.net/gh/asahichanID/media@main/images%20(6).jpeg?v=1',
              status: f.status || 'Offline',
              lastMessage: f.bio || '',
              lastOnline: f.isOnline ? 'Online Sekarang' : 'Baru saja',
              bio: f.bio || '',
              role: f.role || 'Trainer',
              isOnline: !!f.isOnline || f.status === 'Online',
            };
            if (idx >= 0) {
              const prev = merged[idx];
              const changedFields =
                prev.username !== normalized.username ||
                prev.avatar !== normalized.avatar ||
                prev.status !== normalized.status ||
                prev.lastMessage !== normalized.lastMessage ||
                prev.lastOnline !== normalized.lastOnline ||
                prev.bio !== normalized.bio ||
                prev.role !== normalized.role ||
                prev.isOnline !== normalized.isOnline;
              if (changedFields) {
                merged[idx] = { ...merged[idx], ...normalized };
                mutated = true;
              }
            } else {
              merged.push(normalized as any);
              mutated = true;
            }
          });
          if (mutated) {
            StorageService.setItem('oguri_friends_list', merged);
            RealtimeService.broadcast('friend_updated', { action: 'sync', friends: merged });
          }
        }

        if (changed?.botProfile) {
          StorageService.setItem('oguri_bot_profile', changed.botProfile);
          RealtimeService.broadcast('bot_profile_updated', changed.botProfile);
        }

        if (changed?.developerBadge) {
          RealtimeService.broadcast('developer_badge_updated', changed.developerBadge);
        }

        if (changed?.userBadges?.length) {
          const userBadgeChanged = changed.userBadges.some((b: any) => b.user_id === profile.id);
          if (userBadgeChanged) {
            refreshBadges();
          }
          RealtimeService.broadcast('user_badge_updated', { action: 'sync', userId: profile.id });
        }

        if (changed?.notifications?.length) {
          if (changed.notifications.length > 0) {
            NotificationService.sendNotification(
              'Oguri Cap Notice',
              `Ada ${changed.notifications.length} pembaruan/notifikasi baru.`
            );
          }
        }
      } catch (e) {
        console.warn('Sync polling skipped:', e);
      }
    };

    syncOnce();
    const intervalId = setInterval(syncOnce, 1000);
    return () => clearInterval(intervalId);
  }, [profile?.id, profile?.username]);

  // Helper to get all registered accounts map
  const getRegisteredAccountsMap = (): Record<string, UserAccount> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  };

  // Helper to save accounts map
  const saveRegisteredAccountsMap = (map: Record<string, UserAccount>) => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(map));
    } catch (e) {
      console.error('Failed to save accounts map:', e);
    }
  };

  // Get list of registered usernames
  const getRegisteredNames = (): string[] => {
    const map = getRegisteredAccountsMap();
    return Object.values(map).map((acc) => acc.username);
  };

  // Get next player ID counter
  const getNextPlayerId = (): number => {
    try {
      const counter = localStorage.getItem(STORAGE_KEY_ID_COUNTER);
      return counter ? parseInt(counter, 10) : 2;
    } catch (e) {
      return 2;
    }
  };

  const incrementNextPlayerId = () => {
    const next = getNextPlayerId() + 1;
    localStorage.setItem(STORAGE_KEY_ID_COUNTER, next.toString());
  };

  // Real-time Event Listener & Cross-Tab Storage Sync
  useEffect(() => {
    const unsubStats = StateSyncService.on('user_stats_updated', (data) => {
      handleUserStatsUpdate(data);
    });

    const unsubRealtimeStats = RealtimeService.subscribe('user_stats_updated', (data) => {
      handleUserStatsUpdate(data);
    });

    const handleUserStatsUpdate = (data: any) => {
      setProfile((prev) => {
        if (!prev) return prev;
        if (data && (data.id === prev.id || (data.username && data.username.toLowerCase() === prev.username.toLowerCase()))) {
          const isDev = prev.id === '#1' || prev.role === 'Developer' || prev.username.toLowerCase() === 'shiro anna';
          const newCoins = isDev ? 999999999 : (data.coins !== undefined ? data.coins : (data.carrotCoins !== undefined ? data.carrotCoins : prev.coins));
          const updated = {
            ...prev,
            coins: newCoins,
            totalGame: data.totalGame !== undefined ? data.totalGame : (data.gamesPlayed !== undefined ? data.gamesPlayed : prev.totalGame),
            win: data.win !== undefined ? data.win : (data.gamesWon !== undefined ? data.gamesWon : prev.win),
            lose: data.lose !== undefined ? data.lose : prev.lose,
          };
          try {
            localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        }
        return prev;
      });
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PROFILE && e.newValue) {
        try {
          const parsed: UserAccount = JSON.parse(e.newValue);
          setProfile(parsed);
        } catch (err) {
          // ignored
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      unsubStats();
      unsubRealtimeStats();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save profile to active storage and accounts map & D1 & userDb
  const saveProfile = (newProfile: UserAccount) => {
    const nextProfile = ensureSessionMeta(newProfile);
    setProfile(nextProfile);
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(nextProfile));
      const map = getRegisteredAccountsMap();
      map[nextProfile.id] = nextProfile;
      saveRegisteredAccountsMap(map);

      D1DatabaseService.registerOrLoginUser({
        id: nextProfile.id,
        username: nextProfile.username,
        role: nextProfile.role,
        avatar: nextProfile.avatar,
        coins: nextProfile.coins,
        totalGame: nextProfile.totalGame,
        win: nextProfile.win,
        lose: nextProfile.lose,
        accountCode: nextProfile.accountCode,
        sessionToken: nextProfile.sessionToken,
      });

      userDb.saveUser({
        id: nextProfile.id,
        username: nextProfile.username,
        name: nextProfile.username,
        role: nextProfile.role,
        avatar: nextProfile.avatar,
        carrotCoins: nextProfile.coins,
        coin: nextProfile.coins,
        totalGame: nextProfile.totalGame,
        gamesPlayed: nextProfile.totalGame,
        win: nextProfile.win,
        gamesWon: nextProfile.win,
        lose: nextProfile.lose,
        accountCode: nextProfile.accountCode,
        sessionToken: nextProfile.sessionToken,
        sessionActive: true,
        lastSeen: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  };

  // Login / Register Account
  const login = (inputName: string): { success: boolean; error?: string } => {
    const trimmed = inputName.trim();
    if (!trimmed) {
      return { success: false, error: 'Nama tidak boleh kosong.' };
    }

    const lower = trimmed.toLowerCase();
    const accountsMap = getRegisteredAccountsMap();

    const existingUser = Object.values(accountsMap).find((a) => a.username.toLowerCase() === lower);

    if (existingUser) {
      if (!existingUser.avatar || existingUser.avatar === '/assets/avatar.png' || existingUser.avatar.trim() === '') {
        existingUser.avatar = BOT_DEFAULT_AVATAR;
      }
      saveProfile(existingUser);
      ActivityService.logActivity('login', 'Login Akun', `${existingUser.username} (${existingUser.id}) berhasil login.`);
      return { success: true };
    }

    const isDevName = lower === 'shiro anna';
    const formattedDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let newAccount: UserAccount;

    if (isDevName) {
      newAccount = {
        id: '#1',
        username: 'Shiro Anna',
        role: 'Developer',
        avatar: DEFAULT_AVATAR,
        createdAt: formattedDate,
        coins: 999999999,
        totalGame: 0,
        win: 0,
        lose: 0,
        accountCode: '00000001',
        sessionToken: generateUuid(),
        sessionActive: true,
        lastSeen: Date.now(),
        updatedAt: Date.now(),
      };
    } else {
      const accountsMap = getRegisteredAccountsMap();
      const nextId = `u_${generateUuid().replace(/-/g, '').slice(0, 12)}`;
      const nextAccountCode = generateEightDigitCode(Object.values(accountsMap).map((a) => a.accountCode).filter(Boolean) as string[]);

      newAccount = {
        id: nextId,
        username: trimmed,
        role: 'Trainer',
        avatar: DEFAULT_AVATAR,
        createdAt: formattedDate,
        coins: 0,
        totalGame: 0,
        win: 0,
        lose: 0,
        accountCode: nextAccountCode,
        sessionToken: generateUuid(),
        sessionActive: true,
        lastSeen: Date.now(),
        updatedAt: Date.now(),
      };
    }

    saveProfile(newAccount);
    ActivityService.logActivity('login', 'Register & Login', `${newAccount.username} (${newAccount.id}) berhasil mendaftar dan masuk.`);
    return { success: true };
  };

  const updateUsername = (newUsername: string): { success: boolean; error?: string } => {
    if (!profile) return { success: false, error: 'Belum login.' };

    const trimmed = newUsername.trim();
    if (!trimmed) {
      return { success: false, error: 'Nama tidak boleh kosong.' };
    }

    const lower = trimmed.toLowerCase();
    if (lower === profile.username.toLowerCase()) {
      return { success: true };
    }

    const accountsMap = getRegisteredAccountsMap();
    const existingUsernames = Object.values(accountsMap)
      .filter((a) => a.id !== profile.id)
      .map((a) => a.username.toLowerCase());

    if (RESERVED_NAMES.includes(lower) && profile.role !== 'Developer') {
      return { success: false, error: 'Nama sudah dipakai.' };
    }

    if (existingUsernames.includes(lower)) {
      return { success: false, error: 'Nama sudah dipakai.' };
    }

    const oldName = profile.username;
    const updatedProfile: UserAccount = {
      ...profile,
      username: trimmed,
    };

    saveProfile(updatedProfile);
    ActivityService.logActivity('profile_name', 'Mengubah Nama', `Mengubah nama profil dari "${oldName}" menjadi "${trimmed}".`);
    return { success: true };
  };

  const updateAvatar = (base64Image: string) => {
    if (!profile) return;
    const updatedProfile: UserAccount = {
      ...profile,
      avatar: base64Image,
    };
    saveProfile(updatedProfile);
    ActivityService.logActivity('profile_avatar', 'Mengubah Foto Profile', `Pembaruan foto profil untuk akun ${profile.username}.`);
  };

  const updateCoins = (newCoins: number) => {
    if (!profile) return;
    const isDev = profile.id === '#1' || profile.role === 'Developer' || profile.username.toLowerCase() === 'shiro anna';
    const finalCoins = isDev ? 999999999 : Math.max(0, newCoins);
    const updatedProfile: UserAccount = {
      ...profile,
      coins: finalCoins,
    };
    saveProfile(updatedProfile);
  };

  const updateStats = (coins: number, totalGame: number, win: number, lose: number) => {
    if (!profile) return;
    const isDev = profile.id === '#1' || profile.role === 'Developer' || profile.username.toLowerCase() === 'shiro anna';
    const finalCoins = isDev ? 999999999 : Math.max(0, coins);

    if (finalCoins > profile.coins) {
      ActivityService.logActivity('coin_earned', 'Mendapat Carrot Coin', `Mendapatkan +${finalCoins - profile.coins} Carrot Coin. Total saat ini: 🥕 ${finalCoins}`);
    }

    const updatedProfile: UserAccount = {
      ...profile,
      coins: finalCoins,
      totalGame,
      win,
      lose,
    };
    saveProfile(updatedProfile);
  };

  const logout = () => {
    if (profile) {
      D1DatabaseService.logoutUser({ userId: profile.id, sessionToken: profile.sessionToken }).catch(() => {});
      D1DatabaseService.updatePresence({ userId: profile.id, status: 'Offline', sessionToken: profile.sessionToken }).catch(() => {});
    }
    setProfile(null);
    localStorage.removeItem(STORAGE_KEY_PROFILE);
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoggedIn: !!profile,
        activeBadge,
        activeBadgeCustomName,
        refreshBadges,
        login,
        updateUsername,
        updateAvatar,
        updateStats,
        updateCoins,
        getRegisteredNames,
        logout,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
