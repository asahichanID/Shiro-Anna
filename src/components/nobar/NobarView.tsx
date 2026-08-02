import React, { useState, useEffect } from 'react';
import { Video, Music, Tv, Sparkles, Volume2, Info, Users, Disc, ShieldCheck } from 'lucide-react';
import { NobarPlayer } from './NobarPlayer';
import { NobarSearchModal } from './NobarSearchModal';
import { NobarChat } from './NobarChat';
import { NobarMedia, NobarService } from '../../services/NobarService';

export const NobarView: React.FC = () => {
  const [currentMedia, setCurrentMedia] = useState<NobarMedia | null>(() => NobarService.getCurrentMediaSync());
  const [searchModalType, setSearchModalType] = useState<'video' | 'music' | null>(null);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  useEffect(() => {
    const unsub = NobarService.onMediaChange((media, notification) => {
      setCurrentMedia(media);
      if (notification) {
        setToastNotification(notification);
        const timer = setTimeout(() => {
          setToastNotification(null);
        }, 5000);
        return () => clearTimeout(timer);
      }
    });
    return () => unsub();
  }, []);

  const handleSelectMedia = (media: NobarMedia) => {
    NobarService.playMedia(media);
  };

  const handleStopMedia = () => {
    NobarService.stopMedia();
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto space-y-4 animate-fadeIn">
      {/* Top Bar Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl gap-3">
        {/* Left Title & Status */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Ruang Nobar Global</span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Realtime Sync
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Nonton video YouTube & dengar musik bersama seluruh Trainer Tracen Academy!
            </p>
          </div>
        </div>

        {/* Right Search Action Buttons (🎥 Video & 🎵 Musik) */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setSearchModalType('video')}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Video className="w-4 h-4" />
            <span>🎥 Video</span>
          </button>

          <button
            onClick={() => setSearchModalType('music')}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Music className="w-4 h-4" />
            <span>🎵 Musik</span>
          </button>
        </div>
      </div>

      {/* Realtime Notification Toast Alert (e.g. "Shiro Anna memutar video") */}
      {toastNotification && (
        <div className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-950 via-indigo-900 to-slate-900 border border-sky-500/40 text-sky-200 text-xs font-bold flex items-center justify-between shadow-xl animate-slideDown">
          <div className="flex items-center space-x-2">
            <span className="text-base animate-bounce">📢</span>
            <span>{toastNotification}</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
            Nobar Live
          </span>
        </div>
      )}

      {/* Top Player Component (Memakan ~30% tinggi, otomatis mengecil jika tidak ada media) */}
      <NobarPlayer media={currentMedia} onStopMedia={handleStopMedia} />

      {/* Discussion Chat Component (Memenuhi ruang di bawah player) */}
      <NobarChat />

      {/* Floating Search Modal */}
      {searchModalType && (
        <NobarSearchModal
          isOpen={!!searchModalType}
          type={searchModalType}
          onClose={() => setSearchModalType(null)}
          onSelectMedia={handleSelectMedia}
        />
      )}
    </div>
  );
};
