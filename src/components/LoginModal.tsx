import React, { useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { Trophy, Sparkles, User, LogIn, AlertCircle, Shield } from 'lucide-react';
import { BotAvatar } from './BotAvatar';

export const LoginModal: React.FC = () => {
  const { login } = useProfile();
  const [inputName, setInputName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = login(inputName);
    if (!result.success) {
      setErrorMessage(result.error || 'Gagal login.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
      {/* Glow Backdrop Orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-sky-900/20 text-center space-y-6">
        {/* Avatar / Logo Header */}
        <div className="relative mx-auto">
          <BotAvatar
            alt="Tracen Academy"
            className="w-24 h-24 mx-auto"
            showGlow={true}
          />
        </div>

        <div>
          <div className="flex items-center justify-center space-x-2 mb-1">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <h1 className="text-2xl font-black tracking-tight text-white">
              Selamat Datang Trainer!
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Tracen Academy • Bot Simulator Oguri Cap
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              Masukkan Nama Anda
            </label>
            <input
              type="text"
              value={inputName}
              onChange={(e) => {
                setInputName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Contoh: Trainer Sensei / Shiro Anna"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all"
              autoFocus
            />
          </div>

          {errorMessage && (
            <div className="flex items-center space-x-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 rounded-xl animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-purple-500 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Login / Masuk</span>
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1 text-slate-400">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Profil tersimpan secara lokal di browser Anda.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
