import React, { useEffect, useState } from 'react';
import { videoCacheService } from '../services/VideoCacheService';

export const VideoDownloadIndicator: React.FC = () => {
  const [downloadState, setDownloadState] = useState({
    isDownloading: false,
    progress: 0,
    isCompleted: false,
  });

  useEffect(() => {
    const unsub = videoCacheService.subscribe((state) => {
      setDownloadState(state);
    });
    return unsub;
  }, []);

  if (!downloadState.isDownloading) {
    return null;
  }

  // Calculate SVG stroke DashOffset
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (downloadState.progress / 100) * circumference;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999999] pointer-events-none animate-fadeIn flex items-center justify-center">
      <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-md">
        {/* SVG Circular Progress */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <svg className="w-8 h-8 transform -rotate-90">
            <circle
              cx="16"
              cy="16"
              r={radius}
              className="text-slate-800"
              strokeWidth="3"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="16"
              cy="16"
              r={radius}
              className="text-emerald-400 transition-all duration-300 ease-out"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-amber-300 font-mono">
            {downloadState.progress}%
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] font-extrabold text-emerald-300 tracking-wider uppercase">
            Downloading Splash Video
          </span>
          <span className="text-[9px] text-slate-400 font-medium">
            Latar Belakang ({downloadState.progress}%)
          </span>
        </div>
      </div>
    </div>
  );
};
