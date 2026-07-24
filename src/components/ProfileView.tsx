import React, { useState, useRef } from 'react';
import { useProfile } from '../context/ProfileContext';
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
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { profile, updateUsername, updateAvatar, logout } = useProfile();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Validate image format
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
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Avatar Area with Glow Border & "Ubah Foto" Button */}
          <div className="flex flex-col items-center space-y-3 flex-shrink-0">
            <div className="relative group">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 p-1 shadow-2xl shadow-sky-500/30 overflow-hidden">
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover bg-slate-950"
                />
              </div>

              <button
                onClick={handleAvatarClick}
                title="Ubah Foto Profile"
                className="absolute inset-0 rounded-full bg-slate-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-semibold transition-all duration-200 cursor-pointer backdrop-blur-xs"
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

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Coins */}
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

        {/* Total Permainan */}
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

        {/* Total Kemenangan */}
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

        {/* Total Kekalahan */}
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
