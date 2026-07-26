import React, { createContext, useContext, useState, useEffect } from 'react';
import { ActivityService } from '../services/ActivityService';
import { BOT_DEFAULT_AVATAR } from '../config/constants';
import { D1DatabaseService } from '../services/D1DatabaseService';
import { NotificationService } from '../services/NotificationService';
import { userDb } from '../database/userDb';
import { BadgeId, OwnedBadge, PremiumPlanId, BADGE_BY_ID, PREMIUM_BY_ID, clampBadgeText, createOwnedBadge, normalizeOwnedBadges } from '../config/userBadges';

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
  badgeInventory?: OwnedBadge[];
  equippedBadgeId?: BadgeId | null;
  premiumUntil?: number | null;
}

interface ProfileContextType {
  profile: UserAccount | null;
  isLoggedIn: boolean;
  login: (username: string) => { success: boolean; error?: string };
  updateUsername: (newUsername: string) => { success: boolean; error?: string };
  updateAvatar: (base64Image: string) => void;
  updateStats: (coins: number, totalGame: number, win: number, lose: number) => void;
  updateCoins: (coins: number) => void;
  purchaseBadge: (badgeId: BadgeId) => { success: boolean; error?: string };
  equipBadge: (badgeId: BadgeId | null) => { success: boolean; error?: string };
  renameBadge: (badgeId: BadgeId, newName: string) => { success: boolean; error?: string };
  purchasePremium: (planId: PremiumPlanId) => { success: boolean; error?: string };
  isPremiumActive: boolean;
  getRegisteredNames: () => string[];
  logout: () => void;
}

const STORAGE_KEY_PROFILE = 'oguri_profile';
const STORAGE_KEY_ACCOUNTS = 'oguri_registered_accounts';
const STORAGE_KEY_ID_COUNTER = 'oguri_player_id_counter';

const RESERVED_NAMES = ['shiro anna'];

const DEFAULT_BADGE_STATE = {
  badgeInventory: [] as OwnedBadge[],
  equippedBadgeId: null as BadgeId | null,
  premiumUntil: null as number | null,
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

function normalizeProfile(profile: UserAccount): UserAccount {
  return {
    ...profile,
    badgeInventory: normalizeOwnedBadges(profile.badgeInventory),
    equippedBadgeId: profile.equippedBadgeId || null,
    premiumUntil: profile.premiumUntil ? Number(profile.premiumUntil) : null,
  };
}

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserAccount | null>(null);

  useEffect(() => {
    NotificationService.requestPermission();
  }, []);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (savedProfile) {
        const parsed: UserAccount = normalizeProfile(JSON.parse(savedProfile));
        if (!parsed.avatar || parsed.avatar === '/assets/avatar.png' || parsed.avatar.trim() === '') {
          parsed.avatar = BOT_DEFAULT_AVATAR;
        }
        setProfile(parsed);

        D1DatabaseService.registerOrLoginUser({
          id: parsed.id,
          username: parsed.username,
          role: parsed.role,
          avatar: parsed.avatar,
          coins: parsed.coins,
          totalGame: parsed.totalGame,
          win: parsed.win,
          lose: parsed.lose,
        }).then((remote) => {
          if (remote) {
            setProfile((prev) => {
              const current = prev || parsed;
              const merged = normalizeProfile({
                id: remote.id,
                username: remote.username,
                role: remote.role || current.role,
                avatar: remote.avatar || current.avatar,
                createdAt: current.createdAt,
                coins: Number(remote.coins ?? remote.carrotCoins ?? current.coins ?? 0),
                totalGame: Number(remote.totalGame ?? current.totalGame ?? 0),
                win: Number(remote.win ?? current.win ?? 0),
                lose: Number(remote.lose ?? current.lose ?? 0),
                badgeInventory: current.badgeInventory,
                equippedBadgeId: current.equippedBadgeId,
                premiumUntil: current.premiumUntil,
              });
              localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(merged));
              return merged;
            });
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;

    const intervalId = setInterval(() => {
      D1DatabaseService.updatePresence({
        userId: profile.id,
        status: 'Online',
        device: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop',
        browser: navigator.userAgent,
      }).catch((e) => console.warn('Presence heartbeat skipped:', e));

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

  const getRegisteredAccountsMap = (): Record<string, UserAccount> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveRegisteredAccountsMap = (map: Record<string, UserAccount>) => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(map));
    } catch (e) {
      console.error('Failed to save accounts map:', e);
    }
  };

  const getRegisteredNames = (): string[] => {
    const map = getRegisteredAccountsMap();
    return Object.values(map).map((acc) => acc.username);
  };

  const getNextPlayerId = (): number => {
    try {
      const counter = localStorage.getItem(STORAGE_KEY_ID_COUNTER);
      return counter ? parseInt(counter, 10) : 2;
    } catch {
      return 2;
    }
  };

  const incrementNextPlayerId = () => {
    const next = getNextPlayerId() + 1;
    localStorage.setItem(STORAGE_KEY_ID_COUNTER, next.toString());
  };

  const syncUserDb = (newProfile: UserAccount) => {
    try {
      userDb.saveUser({
        id: newProfile.id,
        username: newProfile.username,
        name: newProfile.username,
        role: newProfile.role,
        avatar: newProfile.avatar,
        status: 'Online',
        coin: newProfile.coins,
        carrotCoins: newProfile.coins,
        coins: newProfile.coins,
        gamesPlayed: newProfile.totalGame,
        totalGame: newProfile.totalGame,
        gamesWon: newProfile.win,
        win: newProfile.win,
        lose: newProfile.lose,
        createdAt: newProfile.createdAt,
        badgeInventory: newProfile.badgeInventory || [],
        equippedBadgeId: newProfile.equippedBadgeId || null,
        premiumUntil: newProfile.premiumUntil || null,
      } as any);
    } catch (e) {
      console.warn('Legacy userDb sync skipped:', e);
    }
  };

  const saveProfile = async (newProfile: UserAccount) => {
    const normalized = normalizeProfile(newProfile);
    setProfile(normalized);
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(normalized));
      const map = getRegisteredAccountsMap();
      map[normalized.id] = normalized;
      saveRegisteredAccountsMap(map);
      syncUserDb(normalized);

      const remote = await D1DatabaseService.registerOrLoginUser({
        id: normalized.id,
        username: normalized.username,
        role: normalized.role,
        avatar: normalized.avatar,
        coins: normalized.coins ?? 0,
        totalGame: normalized.totalGame ?? 0,
        win: normalized.win ?? 0,
        lose: normalized.lose ?? 0,
      });

      if (remote) {
        const merged: UserAccount = normalizeProfile({
          id: remote.id || normalized.id,
          username: remote.username || normalized.username,
          role: remote.role || normalized.role,
          avatar: remote.avatar || normalized.avatar,
          createdAt: normalized.createdAt,
          coins: Number(remote.coins ?? remote.carrotCoins ?? normalized.coins ?? 0),
          totalGame: Number(remote.totalGame ?? normalized.totalGame ?? 0),
          win: Number(remote.win ?? normalized.win ?? 0),
          lose: Number(remote.lose ?? normalized.lose ?? 0),
          badgeInventory: normalized.badgeInventory,
          equippedBadgeId: normalized.equippedBadgeId,
          premiumUntil: normalized.premiumUntil,
        });
        setProfile(merged);
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(merged));
        map[merged.id] = merged;
        saveRegisteredAccountsMap(map);
        syncUserDb(merged);
      }
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  };

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
      saveProfile(normalizeProfile(existingUser));
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
        coins: 0,
        totalGame: 0,
        win: 0,
        lose: 0,
        ...DEFAULT_BADGE_STATE,
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
        coins: 0,
        totalGame: 0,
        win: 0,
        lose: 0,
        ...DEFAULT_BADGE_STATE,
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

  const updateCoins = (coins: number) => {
    if (!profile) return;
    const updatedProfile: UserAccount = {
      ...profile,
      coins,
    };
    saveProfile(updatedProfile);
  };

  const purchaseBadge = (badgeId: BadgeId): { success: boolean; error?: string } => {
    if (!profile) return { success: false, error: 'Belum login.' };
    const badge = BADGE_BY_ID[badgeId];
    if (!badge) return { success: false, error: 'Badge tidak ditemukan.' };

    const owned = profile.badgeInventory || [];
    if (owned.some((item) => item.id === badgeId)) {
      return { success: false, error: 'Badge ini sudah dimiliki.' };
    }

    if ((profile.coins || 0) < badge.price) {
      return { success: false, error: 'Coin Carrot tidak cukup.' };
    }

    const updatedProfile: UserAccount = {
      ...profile,
      coins: profile.coins - badge.price,
      badgeInventory: [...owned, createOwnedBadge(badgeId, badge.displayName)],
    };
    saveProfile(updatedProfile);
    ActivityService.logActivity('badge', 'Membeli Badge', `Membeli badge ${badge.name} seharga 🥕 ${badge.price.toLocaleString('id-ID')}.`);
    return { success: true };
  };

  const equipBadge = (badgeId: BadgeId | null): { success: boolean; error?: string } => {
    if (!profile) return { success: false, error: 'Belum login.' };
    if (!badgeId) {
      saveProfile({ ...profile, equippedBadgeId: null });
      return { success: true };
    }

    const owned = profile.badgeInventory || [];
    if (!owned.some((item) => item.id === badgeId)) {
      return { success: false, error: 'Badge belum dimiliki.' };
    }

    const updatedProfile: UserAccount = {
      ...profile,
      equippedBadgeId: badgeId,
      badgeInventory: owned.map((item) =>
        item.id === badgeId ? { ...item, equippedAt: Date.now(), customName: clampBadgeText(item.customName, BADGE_BY_ID[badgeId].displayName) } : item
      ),
    };
    saveProfile(updatedProfile);
    ActivityService.logActivity('badge', 'Menggunakan Badge', `Badge ${BADGE_BY_ID[badgeId].name} dipakai di profile.`);
    return { success: true };
  };

  const renameBadge = (badgeId: BadgeId, newName: string): { success: boolean; error?: string } => {
    if (!profile) return { success: false, error: 'Belum login.' };
    const owned = profile.badgeInventory || [];
    const idx = owned.findIndex((item) => item.id === badgeId);
    if (idx === -1) return { success: false, error: 'Badge belum dimiliki.' };

    const cleaned = clampBadgeText(newName, BADGE_BY_ID[badgeId].displayName);
    const updated = [...owned];
    updated[idx] = {
      ...updated[idx],
      customName: cleaned,
    };

    saveProfile({ ...profile, badgeInventory: updated });
    ActivityService.logActivity('badge', 'Ubah Nama Badge', `Nama badge ${BADGE_BY_ID[badgeId].name} diubah menjadi "${cleaned}".`);
    return { success: true };
  };

  const purchasePremium = (planId: PremiumPlanId): { success: boolean; error?: string } => {
    if (!profile) return { success: false, error: 'Belum login.' };
    const plan = PREMIUM_BY_ID[planId];
    if (!plan) return { success: false, error: 'Paket premium tidak ditemukan.' };

    if ((profile.coins || 0) < plan.price) {
      return { success: false, error: 'Coin Carrot tidak cukup.' };
    }

    const now = Date.now();
    const currentPremiumUntil = profile.premiumUntil && profile.premiumUntil > now ? profile.premiumUntil : now;
    const updatedProfile: UserAccount = {
      ...profile,
      coins: profile.coins - plan.price,
      premiumUntil: currentPremiumUntil + plan.durationMs,
    };
    saveProfile(updatedProfile);
    ActivityService.logActivity('badge', 'Membeli Premium', `Membeli ${plan.name} seharga 🥕 ${plan.price.toLocaleString('id-ID')}.`);
    return { success: true };
  };

  const isPremiumActive = !!profile?.premiumUntil && profile.premiumUntil > Date.now();

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
        updateCoins,
        purchaseBadge,
        equipBadge,
        renameBadge,
        purchasePremium,
        isPremiumActive,
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
