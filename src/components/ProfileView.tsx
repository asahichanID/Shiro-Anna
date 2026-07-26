import React, { useState, useRef, useMemo } from 'react';
import { useProfile } from '../context/ProfileContext';
import { BotAvatar } from './BotAvatar';
import { BadgePill } from './BadgePill';
import { BADGE_CATALOG, getBadgeDefinition, clampBadgeText } from '../config/userBadges';
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
  BadgeCheck,
  Crown,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { profile, updateUsername, updateAvatar, logout, equipBadge, renameBadge, purchaseBadge, purchasePremium, isPremiumActive } = useProfile();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [showBadgeManager, setShowBadgeManager] = useState(false);
  const [badgeRename, setBadgeRename] = useState('');
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ownedBadgeMap = useMemo(() => {
    const map = new Map<string, string>();
    profile?.badgeInventory?.forEach((badge) => map.set(badge.id, badge.customName));
    return map;
  }, [profile?.badgeInventory]);

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
      if (base64) updateAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  const activeBadge = profile.equippedBadgeId ? getBadgeDefinition(profile.equippedBadgeId) : undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg, image/webp" className="hidden" />

      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="absolute top-0 right-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex flex-col items-center space-y-3 flex-shrink-0">
            <div className="relative group">
              <BotAvatar src={profile.avatar} alt={profile.username} className="w-32 h-32 sm:w-36 sm:h-36" showGlow />
              <button
                onClick={handleAvatarClick}
                title="Ubah Foto Profile"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-full bg-slate-950/60 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 cursor-pointer text-white text-xs font-semibold"
              >
                <Camera className="mb-1 h-6 w-6 text-sky-400" />
                <span>Ubah Foto</span>
              </button>
            </div>

            <button onClick={handleAvatarClick} className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-sky-300 shadow-sm transition-all hover:bg-slate-700 cursor-pointer">
              <Camera className="h-3.5 w-3.5 text-sky-400" />
              <span>Ubah Foto</span>
            </button>
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
                <span className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-xs font-bold text-slate-300">
                  <Hash className="h-3 w-3 text-sky-400" />
                  ID {profile.id}
                </span>

                {activeBadge ? (
                  <BadgePill badgeId={activeBadge.id} ownedBadge={profile.badgeInventory?.find((b) => b.id === activeBadge.id)} />
                ) : isDeveloper ? (
                  <span className="relative inline-flex items-center gap-1.5 rounded-full border border-red-400/50 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 px-3.5 py-1 text-xs font-black tracking-wider text-white shadow-lg shadow-red-500/40 overflow-hidden">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-200" />
                    <span>Developer</span>
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-badge-shine" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-900/50 px-3 py-1 text-xs font-semibold text-sky-300">
                    <Shield className="h-3.5 w-3.5 text-sky-400" />
                    <span>Trainer</span>
                  </span>
                )}
              </div>

              {isEditingName ? (
                <form onSubmit={handleSaveName} className="space-y-2 pt-1">
                  <div className="flex items-center justify-center gap-2 md:justify-start">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        if (editError) setEditError(null);
                      }}
                      className="rounded-lg border border-sky-500 bg-slate-950 px-3 py-1.5 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      autoFocus
                    />
                    <button type="submit" className="rounded-lg bg-emerald-600 p-2 text-white transition-all hover:bg-emerald-500 cursor-pointer" title="Simpan">
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setIsEditingName(false)} className="rounded-lg bg-slate-800 p-2 text-slate-300 transition-all hover:bg-slate-700 cursor-pointer" title="Batal">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {editError && (
                    <div className="flex items-center space-x-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}
                </form>
              ) : (
                <div className="flex items-center justify-center gap-3 pt-1 md:justify-start">
                  <h2 className={isDeveloper ? 'text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-sky-200 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'text-2xl sm:text-3xl font-bold text-white tracking-tight'}>
                    {profile.username}
                  </h2>
                  <button onClick={handleStartEdit} className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-300 transition-all hover:bg-slate-700 cursor-pointer" title="Edit Nama">
                    <Edit3 className="h-4 w-4 text-sky-400" />
                  </button>
                </div>
              )}

              <p className="flex items-center justify-center gap-1.5 pt-0.5 text-xs text-slate-400 md:justify-start">
                <Calendar className="h-3.5 w-3.5 text-sky-400" />
                <span>
                  Pertama Login: <strong className="text-slate-200">{profile.createdAt}</strong>
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 md:justify-start">
              <button onClick={handleStartEdit} className="flex items-center space-x-1.5 rounded-lg border border-sky-500/30 bg-sky-600/20 px-3.5 py-1.5 text-xs font-semibold text-sky-300 transition-all hover:bg-sky-600/30 cursor-pointer">
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Nama</span>
              </button>

              <button onClick={() => setShowBadgeManager((v) => !v)} className="flex items-center space-x-1.5 rounded-lg border border-violet-500/30 bg-violet-600/15 px-3.5 py-1.5 text-xs font-semibold text-violet-300 transition-all hover:bg-violet-600/25 cursor-pointer">
                <BadgeCheck className="h-3.5 w-3.5 text-violet-300" />
                <span>Badge</span>
              </button>

              <button onClick={logout} className="flex items-center space-x-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/20 cursor-pointer">
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span>Ganti Akun / Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showBadgeManager && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white">Badge Profile</h3>
              <p className="text-sm text-slate-400">Pakai badge, ubah nama, dan pilih yang paling cocok.</p>
            </div>
            {profile.equippedBadgeId ? <BadgePill badgeId={profile.equippedBadgeId} ownedBadge={profile.badgeInventory?.find((b) => b.id === profile.equippedBadgeId) || undefined} /> : <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-400">Belum dipasang</span>}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Inventory</h4>
                <button onClick={() => setShowBadgeManager(false)} className="text-xs text-slate-400 hover:text-white">Tutup</button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {profile.badgeInventory?.length ? (
                  profile.badgeInventory.map((badge) => (
                    <button
                      key={badge.id}
                      type="button"
                      onClick={() => {
                        setSelectedBadgeId(badge.id);
                        setBadgeRename(badge.customName);
                        equipBadge(badge.id);
                      }}
                      className={`rounded-2xl border px-3 py-2 transition-all hover:scale-[1.01] ${profile.equippedBadgeId === badge.id ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900 hover:bg-slate-800'}`}
                    >
                      <BadgePill badgeId={badge.id} ownedBadge={badge} compact />
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-500">Belum ada badge yang dibeli.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-4">
              <h4 className="text-sm font-bold text-white">Kelola Badge</h4>
              {selectedBadgeId && profile.badgeInventory?.some((b) => b.id === selectedBadgeId) ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nama badge custom (maks 7 huruf)</label>
                    <input
                      value={badgeRename}
                      onChange={(e) => setBadgeRename(clampBadgeText(e.target.value, getBadgeDefinition(selectedBadgeId)?.displayName || 'Badge'))}
                      maxLength={7}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => renameBadge(selectedBadgeId as any, badgeRename)} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white">Simpan Nama</button>
                    <button onClick={() => equipBadge(selectedBadgeId as any)} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-black text-white">Pakai Badge</button>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-500">Pilih badge dari inventory dulu.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Coin</span>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2"><Coins className="h-5 w-5 text-amber-400" /></div>
          </div>
          <div className="text-2xl font-black text-amber-300">{profile.coins.toLocaleString('id-ID')}</div>
          <p className="text-[11px] text-slate-500">Carrot Coins Tracen</p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Permainan</span>
            <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-2"><Gamepad2 className="h-5 w-5 text-sky-400" /></div>
          </div>
          <div className="text-2xl font-black text-white">{profile.totalGame}</div>
          <p className="text-[11px] text-slate-500">Sesi Game Tebak Kata</p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kemenangan</span>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2"><Trophy className="h-5 w-5 text-emerald-400" /></div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{profile.win}</div>
          <p className="text-[11px] text-slate-500">Jawaban Benar</p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kekalahan</span>
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2"><XCircle className="h-5 w-5 text-rose-400" /></div>
          </div>
          <div className="text-2xl font-black text-rose-400">{profile.lose}</div>
          <p className="text-[11px] text-slate-500">Timeout / Salah</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white">Status Premium</h3>
            <p className="text-sm text-slate-400">Paket premium muncul di shop dan tampil di profile.</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${isPremiumActive ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-950 text-slate-400'}`}>
            {isPremiumActive ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tanggal aktif</div>
            <div className="mt-1 text-sm font-bold text-white">{profile.premiumUntil ? new Date(profile.premiumUntil).toLocaleString('id-ID') : '-'}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Badge aktif</div>
            <div className="mt-2">{profile.equippedBadgeId ? <BadgePill badgeId={profile.equippedBadgeId} ownedBadge={profile.badgeInventory?.find((b) => b.id === profile.equippedBadgeId) || undefined} /> : <span className="text-sm text-slate-500">Belum ada</span>}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Badge dibeli</div>
            <div className="mt-1 text-sm font-bold text-white">{profile.badgeInventory?.length || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
