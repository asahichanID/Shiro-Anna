import React, { useState, useRef, useEffect } from 'react';
import { useProfile } from '../context/ProfileContext';
import { BotAvatar } from './BotAvatar';
import { D1DatabaseService } from '../services/D1DatabaseService';
import { ALL_BADGES, BADGE_MAP, BadgeConfig } from '../config/badgeThemes';
import { DeveloperBadge } from './DeveloperBadge';
import {
  User,
  Camera,
  Edit3,
  Check,
  X,
  Coins,
  Trophy,
  Gamepad2,
  Calendar,
  Shield,
  Sparkles,
  AlertCircle,
  Hash,
  LogOut,
  Target,
  Swords,
  XCircle,
  Award,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { profile, updateUsername, updateAvatar, logout } = useProfile();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Badge Collection State
  const [ownedBadges, setOwnedBadges] = useState<Array<{ id?: string; badge_id: string; custom_name: string; is_active: number }>>([]);
  const [activeBadgeId, setActiveBadgeId] = useState<string | null>(null);
  const [loadingBadges, setLoadingBadges] = useState<boolean>(true);

  // Rename Modal State
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [customBadgeNameInput, setCustomBadgeNameInput] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [savingBadge, setSavingBadge] = useState<boolean>(false);

  // Fetch badges from D1 Database
  const fetchUserBadges = async () => {
    if (!profile) return;
    try {
      const res = await D1DatabaseService.getUserBadges(profile.id);
      if (res) {
        setOwnedBadges(res.ownedBadges || []);
        setActiveBadgeId(res.activeBadge);
      }
    } catch (err) {
      console.error('[FETCH BADGES ERROR]:', err);
    } finally {
      setLoadingBadges(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchUserBadges();
    }
  }, [profile?.id]);

  if (!profile) return null;

  const isDeveloper = profile.role === 'Developer' || profile.username.toLowerCase() === 'shiro anna';

  const handleStartEdit = () => {
    setNewName(profile.username);
    setEditError(null);
    setIsEditingName(true);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    const res = updateUsername(newName);
    if (res.success) {
      setIsEditingName(false);
    } else {
      setEditError(res.error || 'Gagal mengubah nama.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditError(null);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Format gambar harus JPG, JPEG, PNG, atau WEBP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        updateAvatar(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Set Active Badge
  const handleSetActiveBadge = async (badgeId: string | null) => {
    setSavingBadge(true);
    try {
      const ok = await D1DatabaseService.setActiveBadge(profile.id, badgeId);
      if (ok) {
        setActiveBadgeId(badgeId);
        await fetchUserBadges();
      }
    } catch (err) {
      console.error('[SET ACTIVE BADGE ERROR]:', err);
    } finally {
      setSavingBadge(false);
    }
  };

  // Open Rename Modal
  const handleOpenRename = (badgeId: string, currentCustomName: string) => {
    setEditingBadgeId(badgeId);
    setCustomBadgeNameInput(currentCustomName || '');
    setRenameError(null);
  };

  // Save Custom Badge Name (Max 7 words, fallback to default if empty)
  const handleSaveBadgeRename = async () => {
    if (!editingBadgeId) return;

    const trimmed = customBadgeNameInput.trim();
    if (trimmed) {
      const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
      if (wordCount > 7) {
        setRenameError('Nama badge maksimal 7 kata.');
        return;
      }
    }

    setSavingBadge(true);
    try {
      const res = await D1DatabaseService.renameBadge(profile.id, editingBadgeId, trimmed);
      if (res.success) {
        setEditingBadgeId(null);
        await fetchUserBadges();
      } else {
        setRenameError(res.message || 'Gagal menyimpan nama badge.');
      }
    } catch (err: any) {
      setRenameError(err.message || 'Terjadi kesalahan.');
    } finally {
      setSavingBadge(false);
    }
  };

  // Reset Badge Custom Name to Default
  const handleResetBadgeName = async (badgeId: string) => {
    setSavingBadge(true);
    try {
      const res = await D1DatabaseService.renameBadge(profile.id, badgeId, '');
      if (res.success) {
        await fetchUserBadges();
      }
    } catch (err) {
      console.error('[RESET BADGE NAME ERROR]:', err);
    } finally {
      setSavingBadge(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />

      {/* Main Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Avatar Area */}
          <div className="flex flex-col items-center space-y-3 flex-shrink-0">
            <div className="relative group">
              <BotAvatar
                src={profile.avatar}
                alt={profile.username}
                className="w-32 h-32 sm:w-36 sm:h-36"
                showGlow={true}
              />

              <button
                onClick={handleAvatarClick}
                title="Ubah Foto Profile"
                className="absolute inset-0 rounded-full bg-slate-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-semibold transition-all duration-200 cursor-pointer backdrop-blur-xs z-10"
              >
                <Camera className="w-6 h-6 mb-1 text-sky-400" />
                <span>Ubah Foto</span>
              </button>
            </div>

            <button
              onClick={handleAvatarClick}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span>Ubah Foto</span>
            </button>
          </div>

          {/* Profile Basic Info */}
          <div className="flex-1 space-y-4 text-center md:text-left w-full">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                {/* ID Lokal */}
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-sky-400" />
                  ID {profile.id}
                </span>

                {/* Role Badge */}
                {isDeveloper ? (
                  <span className="relative overflow-hidden inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600 text-white border border-red-400/50 shadow-lg shadow-red-500/40 tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                    <span>Developer</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-badge-shine pointer-events-none"></span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-sky-900/50 text-sky-300 border border-sky-500/30">
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>Trainer</span>
                  </span>
                )}

                {/* Active Badge Display */}
                {activeBadgeId && (
                  <DeveloperBadge badgeId={activeBadgeId} showRarity={false} size="sm" />
                )}
              </div>

              {/* Username with Edit Button */}
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        if (editError) setEditError(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-sky-500 text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
                      title="Simpan"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                      title="Batal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {editError && (
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}
                </form>
              ) : (
                <div className="flex items-center justify-center md:justify-start space-x-3 pt-1">
                  <h2
                    className={
                      isDeveloper
                        ? 'text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-sky-200 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                        : 'text-2xl sm:text-3xl font-bold text-white tracking-tight'
                    }
                  >
                    {profile.username}
                  </h2>
                  <button
                    onClick={handleStartEdit}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer"
                    title="Edit Nama"
                  >
                    <Edit3 className="w-4 h-4 text-sky-400" />
                  </button>
                </div>
              )}

              <p className="text-xs text-slate-400 flex items-center justify-center md:justify-start gap-1.5 pt-0.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Pertama Login: <strong className="text-slate-200">{profile.createdAt}</strong></span>
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
              <button
                onClick={handleStartEdit}
                className="px-3.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Nama</span>
              </button>

              <button
                onClick={logout}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Ganti Akun / Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BADGE COLLECTION SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                Badge Collection
                {isDeveloper && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    Dev Unlocked
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Pilih badge aktif dan kustomisasi nama tampilan badge Anda.</p>
            </div>
          </div>

          <button
            onClick={fetchUserBadges}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBadges ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Currently Active Badge Showcase */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-bold">Badge Aktif Sekarang:</span>
            {activeBadgeId ? (
              <DeveloperBadge badgeId={activeBadgeId} showRarity={true} size="md" />
            ) : (
              <span className="text-xs text-slate-500 italic">Belum ada badge yang dipasang</span>
            )}
          </div>

          {activeBadgeId && (
            <button
              onClick={() => handleSetActiveBadge(null)}
              disabled={savingBadge}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            >
              Lepas Badge
            </button>
          )}
        </div>

        {/* Owned Badges Grid */}
        {loadingBadges ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Memuat koleksi badge D1...</p>
          </div>
        ) : ownedBadges.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <Award className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">Anda belum memiliki badge. Beli badge keren di Shop & Toko Tracen!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedBadges.map((ob) => {
              const badgeConfig = BADGE_MAP[ob.badge_id] || ALL_BADGES[0];
              const isActive = activeBadgeId === ob.badge_id;
              const hasCustomName = !!(ob.custom_name && ob.custom_name.trim());

              return (
                <div
                  key={ob.badge_id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                    isActive
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <DeveloperBadge
                      badgeId={ob.badge_id}
                      badgeName={ob.custom_name}
                      showRarity={true}
                      size="md"
                    />

                    {isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-amber-400" />
                        Aktif
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetActiveBadge(ob.badge_id)}
                        disabled={savingBadge}
                        className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                      >
                        Pasang
                      </button>
                    )}
                  </div>

                  {/* Actions: Custom Rename */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-slate-400 truncate">
                      {hasCustomName ? `Custom: "${ob.custom_name}"` : 'Nama Bawaan'}
                    </span>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {hasCustomName && (
                        <button
                          onClick={() => handleResetBadgeName(ob.badge_id)}
                          disabled={savingBadge}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                          title="Reset ke Nama Bawaan"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenRename(ob.badge_id, ob.custom_name)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Ubahan</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RENAME BADGE MODAL */}
      {editingBadgeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Ubah Nama Badge Kustom</h3>
                <p className="text-xs text-slate-400">Maksimal 7 kata. Kosongkan untuk nama bawaan.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">Nama Tampilan Badge Baru</label>
              <input
                type="text"
                value={customBadgeNameInput}
                onChange={(e) => {
                  setCustomBadgeNameInput(e.target.value);
                  if (renameError) setRenameError(null);
                }}
                placeholder="Contoh: Sang Juara Tracen"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500 transition-all"
                autoFocus
              />

              {renameError && (
                <div className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{renameError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setEditingBadgeId(null)}
                disabled={savingBadge}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer border border-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleSaveBadgeRename}
                disabled={savingBadge}
                className="w-1/2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs transition-all cursor-pointer shadow-lg shadow-sky-600/20 flex items-center justify-center space-x-2"
              >
                {savingBadge ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Nama</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Coin
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300">
            {profile.coins.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-slate-500">Carrot Coins Tracen</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Permainan
            </span>
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <Gamepad2 className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {profile.totalGame}
          </div>
          <p className="text-[11px] text-slate-500">Sesi Game Tebak Kata</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Kemenangan (Win)
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {profile.win}
          </div>
          <p className="text-[11px] text-slate-500">Jawaban Benar</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Kekalahan (Lose)
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <XCircle className="w-5 h-5 text-rose-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400">
            {profile.lose}
          </div>
          <p className="text-[11px] text-slate-500">Timeout / Salah</p>
        </div>
      </div>
    </div>
  );
};
