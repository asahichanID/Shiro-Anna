import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Coins, Zap, HelpCircle, Gamepad2, Database, ShieldCheck, Music, Sparkles, Wrench, MoreVertical } from 'lucide-react';
import { ProjectDownloadButton } from './ProjectDownloadButton';
import { useProfile } from '../context/ProfileContext';
import { BotService, BotProfile } from '../services/BotService';
import { BotAvatar } from './BotAvatar';
import { BOT_DEFAULT_AVATAR } from '../config/constants';

export type HeaderTab = 'chat' | 'play' | 'devpanel' | 'database' | 'queue' | 'analysis' | 'profile';

interface OguriCapHeaderProps {
  userCoins: number;
  userName: string;
  userWinStreak?: number;
  activeSessionCount: number;
  activeTab: HeaderTab;
  setActiveTab: (tab: HeaderTab) => void;
}

export const OguriCapHeader: React.FC<OguriCapHeaderProps> = ({
  userCoins,
  userName,
  userWinStreak = 0,
  activeSessionCount,
  activeTab,
  setActiveTab,
}) => {
  const { profile } = useProfile();
  const isDeveloper = profile?.role === 'Developer' || profile?.username.toLowerCase() === 'shiro anna';

  const [botProfile, setBotProfile] = useState<BotProfile>(() => BotService.getBotProfile());
  const [isDevMenuOpen, setIsDevMenuOpen] = useState(false);
  const devMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = BotService.onBotProfileUpdate((updated) => {
      setBotProfile(updated);
    });
    return () => unsub();
  }, []);

  // Close dev menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (devMenuRef.current && !devMenuRef.current.contains(event.target as Node)) {
        setIsDevMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDevTabActive = ['devpanel', 'database', 'queue', 'analysis'].includes(activeTab);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 backdrop-blur-md bg-slate-900/90 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Persona Badge */}
          <div className="flex items-center space-x-3">
            <div className="relative cursor-pointer group" onClick={() => setActiveTab('chat')}>
              <BotAvatar
                src={botProfile.avatar}
                alt={botProfile.name}
                className="w-11 h-11"
                imgClassName="group-hover:scale-105 transition-transform"
                showGlow={true}
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center z-10">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-sky-300 via-indigo-200 to-white bg-clip-text text-transparent">
                  {botProfile.name}
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {botProfile.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate max-w-xs sm:max-w-md">
                <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{botProfile.bio}</span>
              </p>
            </div>
          </div>

          {/* User Status Bar */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
            {/* Active Session Badge */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
              <Zap className={`w-3.5 h-3.5 ${activeSessionCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-slate-400">Session:</span>
              <span className={`font-semibold ${activeSessionCount > 0 ? 'text-amber-300' : 'text-slate-300'}`}>
                {activeSessionCount > 0 ? '1 Aktif (60s)' : 'Idle'}
              </span>
            </div>

            {/* User Coin Balance Badge */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
              <Coins className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>{userCoins.toLocaleString('id-ID')}</span>
              <span className="text-[10px] uppercase tracking-wider text-amber-400/80">Carrot Coins</span>
            </div>

            {/* Win Streak Badge */}
            {userWinStreak > 0 && (
              <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border transition-all ${
                userWinStreak >= 3
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400/50 text-amber-300 animate-pulse'
                  : 'bg-orange-500/10 border-orange-500/30 text-orange-300'
              }`}>
                <span>🔥 {userWinStreak}x Combo</span>
                {userWinStreak >= 3 && <span className="text-[10px] px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-extrabold">1.5x</span>}
              </div>
            )}

            {/* User Profile Tag Button (Single Primary Profile Button) */}
            <button
              onClick={() => setActiveTab('profile')}
              title="Buka Profile"
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer group ${
                activeTab === 'profile'
                  ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700'
              }`}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden border border-sky-400/50 flex-shrink-0">
                <img
                  src={profile?.avatar && profile.avatar !== '/assets/avatar.png' ? profile.avatar : BOT_DEFAULT_AVATAR}
                  alt="User Avatar"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = BOT_DEFAULT_AVATAR;
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center space-x-1.5 text-xs font-medium">
                <span className={isDeveloper ? "font-extrabold bg-gradient-to-r from-white via-sky-200 to-purple-300 bg-clip-text text-transparent" : "text-slate-200"}>
                  {profile?.username || userName}
                </span>

                {isDeveloper ? (
                  <span className="relative overflow-hidden text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white border border-red-400/40 shadow-sm shadow-red-500/50 inline-flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-amber-200" />
                    <span>Dev</span>
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-badge-shine pointer-events-none"></span>
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-300 border border-sky-500/30">
                    ID {profile?.id || '#1'}
                  </span>
                )}
              </div>
            </button>

            {/* Download Project Button */}
            <ProjectDownloadButton />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800 text-xs font-medium">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md transition-all flex-shrink-0 ${
                activeTab === 'chat'
                  ? 'bg-sky-600 text-white font-semibold shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Chat Bot Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('play')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md transition-all flex-shrink-0 ${
                activeTab === 'play'
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                  : 'text-sky-400 hover:text-sky-200 hover:bg-sky-950/40 border border-sky-500/20'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>🎵 Play</span>
            </button>
          </div>

          {/* Unified Developer Tools Dropdown Menu (Shiro Anna ONLY) */}
          {isDeveloper && (
            <div className="relative flex-shrink-0" ref={devMenuRef}>
              <button
                onClick={() => setIsDevMenuOpen((prev) => !prev)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all font-bold cursor-pointer border ${
                  isDevTabActive || isDevMenuOpen
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 text-white border-rose-400 shadow-md shadow-indigo-600/30'
                    : 'bg-rose-950/30 text-rose-300 hover:text-white hover:bg-rose-900/40 border-rose-500/30'
                }`}
              >
                <MoreVertical className="w-4 h-4 text-rose-300" />
                <span>Developer Tools</span>
              </button>

              {/* Popup / Dropdown Menu */}
              {isDevMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl p-1.5 z-50 space-y-1 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-400 border-b border-slate-800 flex items-center justify-between">
                    <span>Developer Utilities</span>
                    <span className="text-slate-500 font-normal">Shiro Anna</span>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('devpanel');
                      setIsDevMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
                      activeTab === 'devpanel'
                        ? 'bg-rose-600/30 text-rose-200 border border-rose-500/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5 text-rose-400" />
                    <span>Developer Panel</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('database');
                      setIsDevMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
                      activeTab === 'database'
                        ? 'bg-sky-600/30 text-sky-200 border border-sky-500/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                    <span>Database Inspector</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('queue');
                      setIsDevMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
                      activeTab === 'queue'
                        ? 'bg-amber-600/30 text-amber-200 border border-amber-500/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Word Data & Queue</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('analysis');
                      setIsDevMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
                      activeTab === 'analysis'
                        ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                    <span>Project Architecture Analysis</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
