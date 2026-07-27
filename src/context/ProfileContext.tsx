import React, { createContext, useContext, useState, useEffect } from 'react';
import { ActivityService } from '../services/ActivityService';
import { BOT_DEFAULT_AVATAR } from '../config/constants';
import { D1DatabaseService } from '../services/D1DatabaseService';
import { NotificationService } from '../services/NotificationService';

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
}

interface ProfileContextType {
  profile: UserAccount | null;
  isLoggedIn: boolean;
  login: (username: string) => { success: boolean; error?: string };
  updateUsername: (newUsername: string) => { success: boolean; error?: string };
  updateAvatar: (base64Image: string) => void;
  updateStats: (coins: number, totalGame: number, win: number, lose: number) => void;
  getRegisteredNames: () => string[];
  logout: () => void;
}

const STORAGE_KEY_PROFILE = 'oguri_profile';
const STORAGE_KEY_ACCOUNTS = 'oguri_registered_accounts';
const STORAGE_KEY_ID_COUNTER = 'oguri_player_id_counter';

const RESERVED_NAMES = ['shiro anna'];

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserAccount | null>(null);

  // Request browser notifications permission
  useEffect(() => {
    NotificationService.requestPermission();
  }, []);

  // Load profile on startup & sync with D1
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (savedProfile) {
        const parsed: UserAccount = JSON.parse(savedProfile);
        if (!parsed.avatar || parsed.avatar === '/assets/avatar.png' || parsed.avatar.trim() === '') {
          parsed.avatar = BOT_DEFAULT_AVATAR;
        }
        setProfile(parsed);

        // Register/Login to D1
        D1DatabaseService.registerOrLoginUser({
          username: parsed.username,
          role: parsed.role,
          avatar: parsed.avatar,
        });
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
  }, []);

  // Real-time Presence & Sync Polling Engine (3–5 seconds)
  useEffect(() => {
    if (!profile) return;

    const intervalId = setInterval(() => {
      // 1. Send Presence Heartbeat
      D1DatabaseService.updatePresence({
        userId: profile.id,
        status: 'Online',
        device: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop',
        browser: navigator.userAgent,
      }).catch((e) => console.warn('Presence heartbeat skipped:', e));

      // 2. Poll Sync
      D1DatabaseService.pollSync(profile.id, Date.now() - 10000)
        .then((syncData) => {
          if (!syncData) return;
          if (syncData.unreadNotificationsCount && syncData.unreadNotificationsCount > 0) {
            NotificationService.sendNotification(
              'Oguri Cap Notice',
              `Anda memiliki ${syncData.unreadNotificationsCount} pesan/notifikasi baru.`
            );
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(intervalId);
  }, [profile]);

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

  // Save profile to active storage and accounts map & D1
  const saveProfile = (newProfile: UserAccount) => {
    setProfile(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile));
      const map = getRegisteredAccountsMap();
      map[newProfile.id] = newProfile;
      saveRegisteredAccountsMap(map);

      D1DatabaseService.registerOrLoginUser({
        id: newProfile.id,
        username: newProfile.username,
        role: newProfile.role,
        avatar: newProfile.avatar,
        coins: newProfile.coins,
        totalGame: newProfile.totalGame,
        win: newProfile.win,
        lose: newProfile.lose,
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
        avatar: BOT_DEFAULT_AVATAR,
        createdAt: formattedDate,
        coins: 10000,
        totalGame: 0,
        win: 0,
        lose: 0,
      };
    } else {
      const nextIdNum = getNextPlayerId();
      incrementNextPlayerId();

      newAccount = {
        id: `#${nextIdNum}`,
        username: trimmed,
        role: 'Trainer',
        avatar: BOT_DEFAULT_AVATAR,
        createdAt: formattedDate,
        coins: 1000,
        totalGame: 0,
        win: 0,
        lose: 0,
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

  const updateStats = (coins: number, totalGame: number, win: number, lose: number) => {
    if (!profile) return;

    if (coins > profile.coins) {
      ActivityService.logActivity('coin_earned', 'Mendapat Carrot Coin', `Mendapatkan +${coins - profile.coins} Carrot Coin. Total saat ini: 🥕 ${coins}`);
    }

    const updatedProfile: UserAccount = {
      ...profile,
      coins,
      totalGame,
      win,
      lose,
    };
    saveProfile(updatedProfile);
  };

  const logout = () => {
    if (profile) {
      D1DatabaseService.updatePresence({ userId: profile.id, status: 'Offline' }).catch(() => {});
    }
    setProfile(null);
    localStorage.removeItem(STORAGE_KEY_PROFILE);
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoggedIn: !!profile,
        login,
        updateUsername,
        updateAvatar,
        updateStats,
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
