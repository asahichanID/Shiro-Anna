import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Activity,
  UserCheck,
  Database,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Search,
  RefreshCw,
  Lock,
  Sparkles,
  Coins,
  Gamepad2,
  MessageSquare,
  Users,
  HardDrive,
  Info,
  Server,
  Clock,
  Eye,
  RotateCcw,
  Bot,
  Image as ImageIcon,
  Edit3,
  Save,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { ActivityService, ActivityLog } from '../services/ActivityService';
import { StorageService } from '../services/StorageService';
import { ChatService } from '../services/ChatService';
import { BotService, BotProfile } from '../services/BotService';
import { BOT_DEFAULT_AVATAR } from '../config/constants';
import { BotAvatar } from './BotAvatar';

interface ResetModalConfig {
  isOpen: boolean;
  type: 'log' | 'chat' | 'game' | 'coin' | 'all';
  title: string;
  description: string;
}

export const DeveloperPanelView: React.FC = () => {
  const { profile, updateStats } = useProfile();

  // Access control check
  const isDeveloper =
    profile?.username.toLowerCase() === 'shiro anna' ||
    profile?.id === '#1' ||
    profile?.role === 'Developer';

  // Sub-tab navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'bot' | 'storage' | 'system'>('dashboard');

  // Logs state
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logFilterCategory, setLogFilterCategory] = useState<string>('all');

  // Bot Profile Manager state
  const [botProfile, setBotProfileState] = useState<BotProfile>(() => BotService.getBotProfile());
  const [botNameInput, setBotNameInput] = useState(botProfile.name);
  const [botStatusInput, setBotStatusInput] = useState(botProfile.status);
  const [botBioInput, setBotBioInput] = useState(botProfile.bio);
  const [botAvatarPreview, setBotAvatarPreview] = useState(botProfile.avatar);
  const [botSuccessMsg, setBotSuccessMsg] = useState<string | null>(null);

  // Storage Inspector state
  const [selectedStorageKey, setSelectedStorageKey] = useState<string | null>(null);
  const [storageModalContent, setStorageModalContent] = useState<any>(null);

  // Reset confirmation modal state
  const [resetModal, setResetModal] = useState<ResetModalConfig>({
    isOpen: false,
    type: 'log',
    title: '',
    description: '',
  });

  // Action status message
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();

    const handleLogUpdate = () => {
      loadLogs();
    };

    window.addEventListener('activity_log_updated', handleLogUpdate);
    return () => {
      window.removeEventListener('activity_log_updated', handleLogUpdate);
    };
  }, []);

  useEffect(() => {
    const unsub = BotService.onBotProfileUpdate((updated) => {
      setBotProfileState(updated);
      setBotNameInput(updated.name);
      setBotStatusInput(updated.status);
      setBotBioInput(updated.bio);
      setBotAvatarPreview(updated.avatar);
    });
    return () => unsub();
  }, []);

  const loadLogs = () => {
    setLogs(ActivityService.getLogs());
  };

  // Bot Profile Image File Change Handler
  const handleBotAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file foto terlalu besar! Maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setBotAvatarPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Save Bot Profile
  const handleSaveBotProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botNameInput.trim()) {
      alert('Nama bot tidak boleh kosong!');
      return;
    }

    const updated = BotService.updateBotProfile({
      name: botNameInput.trim(),
      status: botStatusInput.trim() || 'Online',
      bio: botBioInput.trim() || 'Grey Monster Tracen',
      avatar: botAvatarPreview,
    });

    setBotSuccessMsg('Profile Bot berhasil diperbarui & disinkronkan secara GLOBAL untuk semua user!');
    setTimeout(() => setBotSuccessMsg(null), 4000);
  };

  // Helper stats calculation
  const getAppStats = () => {
    const regAccountsMap = StorageService.getItem<Record<string, any>>('oguri_registered_accounts', {});
    const registeredCount = Object.keys(regAccountsMap).length;

    const chatRooms = ChatService.getRooms();
    let totalMessagesCount = 0;
    chatRooms.forEach((r) => {
      totalMessagesCount += r.messages?.length || 0;
    });

    let totalCoins = 0;
    Object.values(regAccountsMap).forEach((acc: any) => {
      totalCoins += acc.coins || 0;
    });

    let totalGamesPlayed = 0;
    Object.values(regAccountsMap).forEach((acc: any) => {
      totalGamesPlayed += acc.totalGame || 0;
    });

    return {
      totalUsers: registeredCount,
      totalMessagesCount: Math.max(totalMessagesCount, 12),
      totalCoins,
      totalGamesPlayed,
    };
  };

  const appStats = getAppStats();

  // Reset Trigger
  const triggerResetModal = (type: ResetModalConfig['type']) => {
    const configMap: Record<ResetModalConfig['type'], { title: string; description: string }> = {
      log: {
        title: 'Reset Activity Log Global',
        description: 'Apakah Anda yakin ingin menghapus seluruh histori Log Aktivitas Global? Data ini tidak dapat dikembalikan.',
      },
      chat: {
        title: 'Reset Chat System',
        description: 'Apakah Anda yakin ingin menghapus semua pesan & obrolan room chat? Ruang obrolan akan dikembalikan ke kondisi awal.',
      },
      game: {
        title: 'Reset Database Tebak Kata',
        description: 'Apakah Anda yakin ingin me-reset status sesi permainan Tebak Kata? Sesi aktif akan dihentikan.',
      },
      coin: {
        title: 'Reset Carrot Coin',
        description: 'Apakah Anda yakin ingin me-reset jumlah Carrot Coin ke nilai standar (1.000 Coins)?',
      },
      all: {
        title: '🚨 RESET SEMUA DATA (FACTORY RESET)',
        description: 'PERINGATAN DANGER! Seluruh data aplikasi di LocalStorage (Profil, Chat, Game, Log, Coin, Registered Users) akan DIDELETE TOTAL!',
      },
    };

    setResetModal({
      isOpen: true,
      type,
      title: configMap[type].title,
      description: configMap[type].description,
    });
  };

  const executeReset = () => {
    const { type } = resetModal;
    setResetModal({ ...resetModal, isOpen: false });

    if (type === 'log') {
      ActivityService.clearLogs();
      setActionSuccess('Berhasil membersihkan seluruh Log Aktivitas Global.');
    } else if (type === 'chat') {
      localStorage.removeItem('chatRooms');
      localStorage.removeItem('messages');
      ActivityService.logActivity('system', 'Reset Chat', 'Seluruh data pesan dan room chat telah dibersihkan.');
      setActionSuccess('Berhasil me-reset sistem Chat & Pesan.');
    } else if (type === 'game') {
      localStorage.removeItem('tebak_kata_game');
      ActivityService.logActivity('system', 'Reset Tebak Kata', 'Status game Tebak Kata telah di-reset ke kondisi awal.');
      setActionSuccess('Berhasil me-reset sesi game Tebak Kata.');
    } else if (type === 'coin') {
      if (profile) {
        updateStats(1000, profile.totalGame, profile.win, profile.lose);
        ActivityService.logActivity('system', 'Reset Coin', 'Carrot Coin dikembalikan ke standar 1.000.');
        setActionSuccess('Berhasil me-reset Carrot Coin menjadi 1.000 Coins.');
      }
    } else if (type === 'all') {
      localStorage.clear();
      window.location.reload();
    }

    setTimeout(() => setActionSuccess(null), 4000);
    loadLogs();
  };

  // Export Data JSON
  const handleExportData = () => {
    const exportObject: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          exportObject[key] = JSON.parse(localStorage.getItem(key) || '');
        } catch {
          exportObject[key] = localStorage.getItem(key);
        }
      }
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(exportObject, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `oguri_app_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    ActivityService.logActivity('system', 'Export Data', 'Mengeksport backup data LocalStorage ke berkas JSON.');
    setActionSuccess('Berhasil mengunduh backup data JSON.');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Import Data JSON
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.keys(parsed).forEach((k) => {
            const val = typeof parsed[k] === 'string' ? parsed[k] : JSON.stringify(parsed[k]);
            localStorage.setItem(k, val);
          });

          ActivityService.logActivity('system', 'Import Data', 'Mengimpor data LocalStorage dari berkas JSON.');
          setActionSuccess('Data berhasil diimpor! Halaman akan dimuat ulang...');
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }
      } catch (err) {
        alert('Gagal membaca berkas JSON. Format tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  // Access Denied Screen for Non-Developer
  if (!isDeveloper) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 my-8 animate-fadeIn">
        <div className="bg-gradient-to-b from-slate-900 to-red-950/60 border-2 border-red-500/50 rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="w-20 h-20 bg-red-500/20 border-2 border-red-500/40 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
            <Lock className="w-10 h-10 text-red-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold rounded-full uppercase tracking-wider">
              Access Restricted
            </span>
            <h2 className="text-2xl font-black text-white">Akses Ditolak (Developer Only)</h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Seluruh Developer Panel hanya dapat diakses oleh akun khusus developer:{' '}
              <span className="font-extrabold text-sky-300">Shiro Anna (ID #1)</span>.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-left max-w-md mx-auto text-xs space-y-1">
            <p className="text-slate-400 font-semibold">Identitas Akun Anda Saat Ini:</p>
            <p className="text-slate-200">
              • Username: <span className="text-amber-300 font-bold">{profile?.username || 'Guest'}</span>
            </p>
            <p className="text-slate-200">
              • ID: <span className="text-sky-300 font-bold">{profile?.id || 'Unregistered'}</span>
            </p>
            <p className="text-slate-200">
              • Role: <span className="text-purple-300 font-bold">{profile?.role || 'User'}</span>
            </p>
          </div>

          <div className="pt-2">
            <p className="text-xs text-slate-400">
              Silakan ganti nama profil Anda menjadi <span className="text-sky-300 font-bold">Shiro Anna</span> untuk masuk ke mode Developer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Filter logs for display
  const filteredLogs = logs.filter((l) => {
    const matchCategory =
      logFilterCategory === 'all' ||
      l.category.toLowerCase().includes(logFilterCategory.toLowerCase());
    const matchQuery =
      !logSearch.trim() ||
      l.title.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.detail.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.userId.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.time.toLowerCase().includes(logSearch.toLowerCase());
    return matchCategory && matchQuery;
  });

  const getLogIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'login':
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'profile_name':
      case 'profile_avatar':
        return <Sparkles className="w-4 h-4 text-sky-400" />;
      case 'game_start':
        return <Gamepad2 className="w-4 h-4 text-indigo-400" />;
      case 'game_win':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'game_lose':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'coin_earned':
        return <Coins className="w-4 h-4 text-amber-400" />;
      case 'music_play':
        return <Activity className="w-4 h-4 text-purple-400" />;
      case 'download_audio':
      case 'download_video':
        return <Download className="w-4 h-4 text-blue-400" />;
      case 'bot_update':
        return <Bot className="w-4 h-4 text-sky-400" />;
      default:
        return <Server className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-1 sm:p-2 animate-fadeIn">
      {/* Dev Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border border-indigo-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 to-rose-500 text-white shadow-lg shadow-indigo-500/30">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">Developer Dashboard</h2>
                <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-500/30 uppercase tracking-wider">
                  Shiro Anna (#1)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                Pusat kontrol sistem, pemantau aktivitas global, bot profile manager, dan reset controls.
              </p>
            </div>
          </div>

          {/* Export / Import Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportData}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionSuccess && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-4 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Global History Log ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bot')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'bot'
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md'
              : 'text-sky-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Bot Profile Manager</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'storage'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Storage Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'system'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-rose-400 hover:text-white hover:bg-rose-950/40 border border-rose-500/30'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Controls</span>
        </button>
      </div>

      {/* ===================== TAB 1: OVERVIEW ===================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* User Info & App Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* User Information Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-sky-400" />
                  <span>Informasi Akun Active</span>
                </h3>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold border border-sky-500/30">
                  Developer Session
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <img
                  src={profile?.avatar && profile.avatar !== '/assets/avatar.png' ? profile.avatar : BOT_DEFAULT_AVATAR}
                  alt="Dev Avatar"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = BOT_DEFAULT_AVATAR;
                  }}
                  className="w-16 h-16 rounded-2xl border-2 border-indigo-500 object-cover shadow-md flex-shrink-0"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white">{profile?.username || 'Shiro Anna'}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold">
                      {profile?.role || 'Developer'}
                    </span>
                  </div>
                  <p className="text-xs text-sky-300 font-semibold">ID: {profile?.id || '#1'}</p>
                  <p className="text-[11px] text-slate-400">Dibuat: {profile?.createdAt || '24 Juli 2026'}</p>
                </div>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 font-medium">Coins</p>
                  <p className="text-xs font-bold text-amber-400">🥕 {profile?.coins.toLocaleString('id-ID') || 0}</p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 font-medium">Total Game</p>
                  <p className="text-xs font-bold text-sky-300">{profile?.totalGame || 0}</p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 font-medium">Menang</p>
                  <p className="text-xs font-bold text-emerald-400">{profile?.win || 0}</p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-400 font-medium">Kalah</p>
                  <p className="text-xs font-bold text-rose-400">{profile?.lose || 0}</p>
                </div>
              </div>
            </div>

            {/* App Information Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-purple-400" />
                  <span>Informasi Aplikasi</span>
                </h3>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                  System Live
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Versi Aplikasi:</span>
                  <span className="font-bold text-sky-300">v2.5.0-pro (Oguri Cap Build)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Nama Project:</span>
                  <span className="font-bold text-slate-200">Oguri Cap Bot & Social Simulator</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Jumlah User Terdaftar:</span>
                  <span className="font-bold text-indigo-300">{appStats.totalUsers} User</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Jumlah Pesan Chat:</span>
                  <span className="font-bold text-emerald-300">{appStats.totalMessagesCount} Pesan</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Coins Beredar:</span>
                  <span className="font-bold text-amber-300">🥕 {appStats.totalCoins.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Game Dimainkan:</span>
                  <span className="font-bold text-rose-300">{appStats.totalGamesPlayed} Sesi</span>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Recent Activity Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>Aktivitas Terbaru Global</span>
              </h3>
              <button
                onClick={() => setActiveTab('logs')}
                className="text-xs text-sky-400 hover:underline font-semibold"
              >
                Lihat Semua Log →
              </button>
            </div>

            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Belum ada aktivitas tercatat.</p>
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 mt-0.5">
                        {getLogIcon(log.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sky-300 font-mono">{log.userId}</span>
                          <span className="font-bold text-white">{log.userName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                            {log.category}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs mt-0.5">{log.title}</p>
                        <p className="text-slate-400 text-[11px]">{log.detail}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap font-mono">{log.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: GLOBAL HISTORY LOG ===================== */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Global Activity Monitor & History Log</span>
              </h3>
              <p className="text-xs text-slate-400">
                Pencatatan aktivitas otomatis seluruh user (Nama, ID, Waktu, Aktivitas, Kategori) secara real-time.
              </p>
            </div>

            <button
              onClick={() => triggerResetModal('log')}
              className="px-3 py-1.5 bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua Log</span>
            </button>
          </div>

          {/* Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari berdasarkan Nama User, ID (#1), Judul, atau Detail..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={logFilterCategory}
              onChange={(e) => setLogFilterCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 w-full sm:w-auto"
            >
              <option value="all">Semua Kategori</option>
              <option value="Auth">Auth & Profile</option>
              <option value="Game">Game (Tebak Kata)</option>
              <option value="Coins">Carrot Coins</option>
              <option value="Music">Music & Play</option>
              <option value="Bot Profile">Bot Profile</option>
              <option value="Friends">Friends</option>

              <option value="System">System</option>
            </select>
          </div>

          {/* Log List Feed */}
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">Tidak ada log aktivitas ditemukan.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 flex items-start justify-between gap-3 text-xs hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0 mt-0.5">
                      {getLogIcon(log.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sky-300">{log.userId}</span>
                        <span className="font-extrabold text-white">{log.userName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-semibold">
                          {log.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">| {log.time}</span>
                      </div>
                      <p className="font-bold text-slate-100 mt-1">{log.title}</p>
                      <p className="text-slate-300 text-xs mt-0.5">{log.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: BOT PROFILE MANAGER ===================== */}
      {activeTab === 'bot' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-sky-400" />
                <span>Bot Profile Manager (Global Synchronization)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Ubah Nama, Foto Profile, Status, dan Bio Bot. Seluruh user secara otomatis melihat profile bot yang baru secara permanen!
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              Synced Globally
            </span>
          </div>

          {botSuccessMsg && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-4 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>{botSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveBotProfile} className="space-y-6">
            
            {/* Live Bot Preview Card */}
            <div className="bg-slate-950 border border-sky-500/30 rounded-2xl p-5 shadow-inner flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group flex-shrink-0">
                <BotAvatar
                  src={botAvatarPreview}
                  alt="Bot Preview"
                  className="w-24 h-24"
                  imgClassName="border-2 border-sky-400 shadow-lg shadow-sky-500/20"
                />
                <label className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10">
                  <ImageIcon className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBotAvatarFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h4 className="text-lg font-black text-white">{botNameInput || 'Oguri Cap'}</h4>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    {botStatusInput || 'Online'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
                  "{botBioInput || 'Siap membantu Trainer!'}"
                </p>
                <p className="text-[11px] text-slate-500">
                  Preview Tampilan Bot yang akan dilihat oleh seluruh Trainer & User di aplikasi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Field 1: Bot Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Nama Bot</span>
                </label>
                <input
                  type="text"
                  value={botNameInput}
                  onChange={(e) => setBotNameInput(e.target.value)}
                  placeholder="Contoh: Oguri Cap 🐎"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Field 2: Bot Status */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Status Bot</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={['Online', 'Sedang Mengetik', 'Sedang Bermain', 'Sedang Tidur'].includes(botStatusInput) ? botStatusInput : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setBotStatusInput(e.target.value);
                      }
                    }}
                    className="bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Online">Online</option>
                    <option value="Sedang Mengetik">Sedang Mengetik</option>
                    <option value="Sedang Bermain">Sedang Bermain</option>
                    <option value="Sedang Tidur">Sedang Tidur</option>
                    <option value="custom">Status Custom...</option>
                  </select>

                  <input
                    type="text"
                    value={botStatusInput}
                    onChange={(e) => setBotStatusInput(e.target.value)}
                    placeholder="Status custom..."
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Field 3: Bot Photo File Picker */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>Foto Profile Bot (File Upload)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBotAvatarFileChange}
                    className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer bg-slate-950 border border-slate-800 rounded-xl"
                  />
                  {botAvatarPreview && (
                    <button
                      type="button"
                      onClick={() => setBotAvatarPreview(BOT_DEFAULT_AVATAR)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex-shrink-0 cursor-pointer"
                    >
                      Reset Default Avatar
                    </button>
                  )}
                </div>
              </div>

              {/* Field 4: Bot Bio */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bio / Deskripsi Bot</span>
                </label>
                <textarea
                  rows={3}
                  value={botBioInput}
                  onChange={(e) => setBotBioInput(e.target.value)}
                  placeholder="Ketik deskripsi atau bio bot di sini..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl p-3 text-xs text-white focus:outline-none"
                />
              </div>

            </div>

            <div className="pt-2 text-right">
              <button
                type="submit"
                className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2 ml-auto cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan & Sinkronisasi Profile Bot</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ===================== TAB 4: STORAGE INSPECTOR ===================== */}
      {activeTab === 'storage' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span>LocalStorage Inspector</span>
            </h3>
            <p className="text-xs text-slate-400">
              Inspeksi data terstruktur dalam LocalStorage tanpa perlu melihat format JSON mentah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Storage Item Card: Bot Profile */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Bot className="w-4 h-4" />
                  <span>oguri_bot_profile</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                  Active Bot
                </span>
              </div>
              <p className="text-xs text-slate-300">Konfigurasi foto, nama, status, dan bio bot global.</p>
              <button
                onClick={() => {
                  setSelectedStorageKey('oguri_bot_profile');
                  setStorageModalContent(StorageService.getItem('oguri_bot_profile', {}));
                }}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Detail Card</span>
              </button>
            </div>

            {/* Storage Item Card: User Profile */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  <span>oguri_profile</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Terisi
                </span>
              </div>
              <p className="text-xs text-slate-300">Data akun profil user yang sedang aktif login.</p>
              <button
                onClick={() => {
                  setSelectedStorageKey('oguri_profile');
                  setStorageModalContent(StorageService.getItem('oguri_profile', {}));
                }}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Detail Card</span>
              </button>
            </div>

            {/* Storage Item Card: Registered Accounts */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>oguri_registered_accounts</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  {Object.keys(StorageService.getItem('oguri_registered_accounts', {})).length} Akun
                </span>
              </div>
              <p className="text-xs text-slate-300">Daftar semua akun trainer/developer yang terdaftar.</p>
              <button
                onClick={() => {
                  setSelectedStorageKey('oguri_registered_accounts');
                  setStorageModalContent(StorageService.getItem('oguri_registered_accounts', {}));
                }}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Detail Card</span>
              </button>
            </div>

            {/* Storage Item Card: Friends List */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>friends</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {StorageService.getItem<any[]>('friends', []).length} Teman
                </span>
              </div>
              <p className="text-xs text-slate-300">Daftar teman yang telah ditambahkan oleh user.</p>
              <button
                onClick={() => {
                  setSelectedStorageKey('friends');
                  setStorageModalContent(StorageService.getItem('friends', []));
                }}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Detail Card</span>
              </button>
            </div>

            {/* Storage Item Card: Chat Rooms */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" />
                  <span>chatRooms & messages</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-300">Data percakapan obrolan langsung dan simulator.</p>
              <button
                onClick={() => {
                  setSelectedStorageKey('chatRooms');
                  setStorageModalContent(StorageService.getItem('chatRooms', []));
                }}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Detail Card</span>
              </button>
            </div>

            {/* Storage Item Card: Activity Logs */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>activity_logs</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  {logs.length} Log
                </span>
              </div>
              <p className="text-xs text-slate-300">Catatan riwayat aksi user dan aktivitas sistem.</p>
              <button
                onClick={() => {
                  setSelectedStorageKey('activity_logs');
                  setStorageModalContent(logs);
                }}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Detail Card</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===================== TAB 5: RESET CONTROLS ===================== */}
      {activeTab === 'system' && (
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-xl space-y-6">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-extrabold text-rose-400 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>Reset & System Control Center</span>
            </h3>
            <p className="text-xs text-slate-400">
              Gunakan tombol reset di bawah ini untuk membersihkan data spesifik secara aman dengan dialog konfirmasi.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Reset 1: Activity Log */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-white">Reset Activity Log</h4>
              </div>
              <p className="text-[11px] text-slate-400">Bersihkan semua riwayat log aktivitas yang tersimpan.</p>
              <button
                onClick={() => triggerResetModal('log')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold rounded-lg border border-slate-700 transition-all cursor-pointer"
              >
                Reset Activity Log
              </button>
            </div>

            {/* Reset 2: Chat */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white">Reset Chat System</h4>
              </div>
              <p className="text-[11px] text-slate-400">Hapus seluruh percakapan room chat dan kembalikan ke default.</p>
              <button
                onClick={() => triggerResetModal('chat')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold rounded-lg border border-slate-700 transition-all cursor-pointer"
              >
                Reset Chat System
              </button>
            </div>

            {/* Reset 3: Tebak Kata */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2">
                <Gamepad2 className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">Reset Tebak Kata</h4>
              </div>
              <p className="text-[11px] text-slate-400">Hentikan sesi aktif dan reset database Tebak Kata.</p>
              <button
                onClick={() => triggerResetModal('game')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-lg border border-slate-700 transition-all cursor-pointer"
              >
                Reset Tebak Kata
              </button>
            </div>

            {/* Reset 4: Coin */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white">Reset Carrot Coin</h4>
              </div>
              <p className="text-[11px] text-slate-400">Kembalikan Carrot Coin profil aktif ke nilai standar 1.000 Coins.</p>
              <button
                onClick={() => triggerResetModal('coin')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-lg border border-slate-700 transition-all cursor-pointer"
              >
                Reset Coin ke 1.000
              </button>
            </div>

            {/* Reset 5: DANGER - Factory Reset */}
            <div className="bg-red-950/30 p-4 rounded-xl border border-red-500/40 space-y-3 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h4 className="text-xs font-bold text-red-300">🚨 RESET SEMUA DATA (FACTORY RESET)</h4>
              </div>
              <p className="text-[11px] text-red-200/80">
                Tindakan berbahaya ini akan MENGHAPUS SELURUH LocalStorage aplikasi dan melakukan muat ulang total.
              </p>
              <button
                onClick={() => triggerResetModal('all')}
                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold rounded-lg transition-all shadow-lg shadow-red-600/30 cursor-pointer"
              >
                Reset Semua Data Aplikasi
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===================== STORAGE INSPECTOR MODAL ===================== */}
      {selectedStorageKey && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-sky-400" />
                <span>Storage Key: <code className="text-sky-300">{selectedStorageKey}</code></span>
              </h3>
              <button
                onClick={() => setSelectedStorageKey(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 space-y-2">
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(storageModalContent, null, 2)}</pre>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedStorageKey(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Tutup Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== RESET CONFIRMATION MODAL ===================== */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative text-center">
            <div className="w-14 h-14 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto text-rose-400 shadow-md">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-white">{resetModal.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{resetModal.description}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setResetModal({ ...resetModal, isOpen: false })}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex-1 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={executeReset}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl flex-1 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Ya, Lanjutkan Reset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
