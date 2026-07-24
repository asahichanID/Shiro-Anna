import React, { createContext, useContext, useState, useEffect } from 'react';
import { ActivityService } from '../services/ActivityService';
import { BOT_DEFAULT_AVATAR } from '../config/constants';

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

  // Load profile on startup
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (savedProfile) {
        const parsed: UserAccount = JSON.parse(savedProfile);
        if (!parsed.avatar || parsed.avatar === '/assets/avatar.png' || parsed.avatar.trim() === '') {
          parsed.avatar = BOT_DEFAULT_AVATAR;
        }
        setProfile(parsed);
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
  }, []);

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

  // Save profile to active storage and accounts map
  const saveProfile = (newProfile: UserAccount) => {
    setProfile(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile));
      const map = getRegisteredAccountsMap();
      map[newProfile.id] = newProfile;
      saveRegisteredAccountsMap(map);
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  };

  // Login / Create Account
  const login = (inputName: string): { success: boolean; error?: string } => {
    const trimmed = inputName.trim();
    if (!trimmed) {
      return { success: false, error: 'Nama tidak boleh kosong.' };
    }

    const lower = trimmed.toLowerCase();
    const accountsMap = getRegisteredAccountsMap();
    const registeredUsernames = Object.values(accountsMap).map((a) => a.username.toLowerCase());

    // Check if it's the Developer Name: Shiro Anna
    if (lower === 'shiro anna') {
      // Find if Shiro Anna account already exists
      const existingDev = Object.values(accountsMap).find((a) => a.username.toLowerCase() === 'shiro anna');
      if (existingDev) {
        saveProfile(existingDev);
        return { success: true };
      }

      // Create new Developer account
      const formattedDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const devAccount: UserAccount = {
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

      saveProfile(devAccount);
      ActivityService.logActivity('login', 'Login Akun', `Shiro Anna (#1) berhasil login sebagai Developer.`);
      return { success: true };
    }

    // If trying to use a reserved name or already taken username
    if (RESERVED_NAMES.includes(lower) || registeredUsernames.includes(lower)) {
      return { success: false, error: 'Nama sudah dipakai.' };
    }

    // Create new Trainer account
    const formattedDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const nextIdNum = getNextPlayerId();
    incrementNextPlayerId();

    const newAccount: UserAccount = {
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

    saveProfile(newAccount);
    ActivityService.logActivity('login', 'Login / Register', `${trimmed} (${newAccount.id}) berhasil masuk ke aplikasi.`);
    return { success: true };
  };

  // Edit Username
  const updateUsername = (newUsername: string): { success: boolean; error?: string } => {
    if (!profile) return { success: false, error: 'Belum login.' };

    const trimmed = newUsername.trim();
    if (!trimmed) {
      return { success: false, error: 'Nama tidak boleh kosong.' };
    }

    const lower = trimmed.toLowerCase();
    if (lower === profile.username.toLowerCase()) {
      return { success: true }; // No change
    }

    const accountsMap = getRegisteredAccountsMap();
    const existingUsernames = Object.values(accountsMap)
      .filter((a) => a.id !== profile.id)
      .map((a) => a.username.toLowerCase());

    // Disallow reserved developer name unless current user is already Developer
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

  // Edit Avatar Photo
  const updateAvatar = (base64Image: string) => {
    if (!profile) return;
    const updatedProfile: UserAccount = {
      ...profile,
      avatar: base64Image,
    };
    saveProfile(updatedProfile);
    ActivityService.logActivity('profile_avatar', 'Mengubah Foto Profile', `Pembaruan foto profil untuk akun ${profile.username}.`);
  };

  // Sync Stats (Coins, totalGame, win, lose)
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
