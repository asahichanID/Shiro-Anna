import React, { useState, useEffect } from 'react';
import { Flame, Sparkles } from 'lucide-react';
import { LiveDuelService } from '../services/LiveDuelService';

export const RunningMarquee: React.FC = () => {
  const [announcement, setAnnouncement] = useState<string | null>(() => LiveDuelService.getCurrentAnnouncement());

  useEffect(() => {
    const unsub = LiveDuelService.onAnnouncementUpdate((text) => {
      setAnnouncement(text);
    });
    return () => unsub();
  }, []);

  if (!announcement) return null;

  return (
    <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-slate-950 font-extrabold text-xs py-1.5 px-4 overflow-hidden shadow-md flex items-center border-b border-amber-400/50">
      <div className="flex items-center space-x-1.5 mr-4 flex-shrink-0 bg-slate-950 text-amber-300 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-black">
        <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
        <span>PENGUMUMAN DUEL</span>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="whitespace-nowrap inline-block animate-marquee font-bold text-white tracking-wide">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 inline" />
            {announcement}
            <Sparkles className="w-3.5 h-3.5 text-amber-300 inline" />
          </span>
        </div>
      </div>
    </div>
  );
};
