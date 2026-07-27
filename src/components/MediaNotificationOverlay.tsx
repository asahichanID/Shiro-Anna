import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Volume2,
  VolumeX,
  Music,
  Heart,
  Minimize2,
  Move,
  Check,
  Scaling,
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useProfile } from '../context/ProfileContext';
import { D1DatabaseService } from '../services/D1DatabaseService';

export const MediaNotificationOverlay: React.FC = () => {
  const { profile } = useProfile();
  const userId = profile?.id || '#1';

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleFavorite,
    isNotificationVisible,
    isNotificationFadingOut,
    closeNotification,
  } = useAudioPlayer();

  // Position and size state (X, Y, Width, Height)
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 440, height: 210 });
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isResizeMode, setIsResizeMode] = useState<boolean>(false);

  // Dragging & Resizing state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Refs to avoid stale closures in window event listeners
  const positionRef = useRef(position);
  positionRef.current = position;

  const sizeRef = useRef(size);
  sizeRef.current = size;

  const isCollapsedRef = useRef(isCollapsed);
  isCollapsedRef.current = isCollapsed;

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 20,
    startY: 20,
  });

  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; startW: number; startH: number }>({
    mouseX: 0,
    mouseY: 0,
    startW: 440,
    startH: 210,
  });

  // Double tap timer ref
  const lastTapRef = useRef<number>(0);

  // Load layout settings on mount / userId change
  useEffect(() => {
    const loadSettings = async () => {
      let loadedPos = { x: Math.max(20, window.innerWidth - 460), y: 20 };
      let loadedSize = { width: 440, height: 210 };
      let loadedCollapsed = false;

      // 1. Try local storage first
      const localKey = `jukebox_layout_${userId}`;
      const savedLocal = localStorage.getItem(localKey);
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            loadedPos = { x: parsed.x, y: parsed.y };
          }
          if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
            loadedSize = { width: parsed.width, height: parsed.height };
          }
          if (typeof parsed.isCollapsed === 'boolean') {
            loadedCollapsed = parsed.isCollapsed;
          }
        } catch (e) {
          console.warn('Failed parsing local layout settings:', e);
        }
      }

      // 2. Fetch from D1 Database
      try {
        const d1Settings = await D1DatabaseService.getJukeboxLayoutSettings(userId);
        if (d1Settings) {
          loadedPos = { x: d1Settings.pos_x, y: d1Settings.pos_y };
          loadedSize = { width: d1Settings.width, height: d1Settings.height };
          loadedCollapsed = d1Settings.is_collapsed === 1;
        }
      } catch (err) {
        console.warn('Failed fetching D1 layout settings:', err);
      }

      // Clamp inside current window dimensions
      const bubbleSize = 64;
      const curW = loadedCollapsed ? bubbleSize : loadedSize.width;
      const curH = loadedCollapsed ? bubbleSize : loadedSize.height;

      const clampedX = Math.min(Math.max(0, loadedPos.x), Math.max(0, window.innerWidth - curW));
      const clampedY = Math.min(Math.max(0, loadedPos.y), Math.max(0, window.innerHeight - curH));

      setPosition({ x: clampedX, y: clampedY });
      setSize(loadedSize);
      setIsCollapsed(loadedCollapsed);
    };

    loadSettings();
  }, [userId]);

  // Persist settings
  const saveLayoutSettings = (
    newPos = positionRef.current,
    newSize = sizeRef.current,
    newCollapsed = isCollapsedRef.current
  ) => {
    const localKey = `jukebox_layout_${userId}`;
    localStorage.setItem(
      localKey,
      JSON.stringify({
        x: newPos.x,
        y: newPos.y,
        width: newSize.width,
        height: newSize.height,
        isCollapsed: newCollapsed,
      })
    );

    D1DatabaseService.saveJukeboxLayoutSettings({
      userId,
      posX: newPos.x,
      posY: newPos.y,
      width: newSize.width,
      height: newSize.height,
      isCollapsed: newCollapsed,
    });
  };

  // Window Pointer Event Listeners for Smooth Dragging & Resizing across entire screen
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;

        const elemW = isCollapsedRef.current ? 64 : sizeRef.current.width;
        const elemH = isCollapsedRef.current ? 64 : sizeRef.current.height;

        const maxX = Math.max(0, window.innerWidth - elemW);
        const maxY = Math.max(0, window.innerHeight - elemH);

        const newX = Math.min(Math.max(0, dragStartRef.current.startX + dx), maxX);
        const newY = Math.min(Math.max(0, dragStartRef.current.startY + dy), maxY);

        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        const dx = e.clientX - resizeStartRef.current.mouseX;
        const dy = e.clientY - resizeStartRef.current.mouseY;

        const maxAllowedW = Math.max(300, window.innerWidth - positionRef.current.x - 10);
        const maxAllowedH = Math.max(160, window.innerHeight - positionRef.current.y - 10);

        const newW = Math.min(Math.max(300, resizeStartRef.current.startW + dx), maxAllowedW);
        const newH = Math.min(Math.max(160, resizeStartRef.current.startH + dy), maxAllowedH);

        setSize({ width: newW, height: newH });
      }
    };

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
        saveLayoutSettings();
      }
      if (isResizing) {
        setIsResizing(false);
        saveLayoutSettings();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, isResizing]);

  // Handle Drag Start
  const handlePointerDownDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a, .no-drag')) return;

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  // Handle Resize Start
  const handlePointerDownResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startW: size.width,
      startH: size.height,
    };
  };

  // Double Tap to Restore from Collapsed Bubble
  const handleCircleClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      const nextCollapsed = false;
      setIsCollapsed(nextCollapsed);
      saveLayoutSettings(position, size, nextCollapsed);
    }
    lastTapRef.current = now;
  };

  // Toggle Collapse
  const handleToggleCollapse = () => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    if (nextCollapsed) {
      setIsResizeMode(false);
    }
    saveLayoutSettings(position, size, nextCollapsed);
  };

  // Toggle Resize Mode
  const handleToggleResizeMode = () => {
    const nextMode = !isResizeMode;
    setIsResizeMode(nextMode);
    if (!nextMode) {
      saveLayoutSettings(position, size, isCollapsed);
    }
  };

  const formatTime = (timeInSec: number) => {
    if (isNaN(timeInSec) || timeInSec <= 0) return '0:00';
    const minutes = Math.floor(timeInSec / 60);
    const seconds = Math.floor(timeInSec % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!currentTrack || !isNotificationVisible) return null;

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isCollapsed ? 'auto' : `${size.width}px`,
        height: isCollapsed ? 'auto' : `${size.height}px`,
      }}
      onPointerDown={handlePointerDownDrag}
      className={`fixed z-50 select-none touch-none transition-opacity duration-[4000ms] ${
        isNotificationFadingOut ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* MODE 1: CIRCLE BUBBLE MODE (±56-64px Oguri Avatar Style)      */}
      {/* ------------------------------------------------------------- */}
      {isCollapsed ? (
        <div
          onClick={handleCircleClick}
          title="Klik 2x / Double Tap untuk Buka Player"
          className="relative group cursor-pointer flex items-center justify-center p-0.5 bg-slate-900/90 backdrop-blur-2xl border-2 border-sky-400/80 rounded-full shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:scale-110 active:scale-95 transition-all duration-300 w-14 h-14 sm:w-16 sm:h-16"
        >
          {/* 1:1 Aspect Ratio Thumbnail Circle */}
          <div className="relative w-full h-full rounded-full overflow-hidden aspect-square border border-slate-700 bg-slate-950 flex-shrink-0">
            {currentTrack.thumbnail ? (
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className={`w-full h-full object-cover object-center aspect-square overflow-hidden ${
                  isPlaying ? 'animate-spin-slow' : ''
                }`}
                style={{ objectFit: 'cover', objectPosition: 'center', aspectRatio: '1 / 1' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sky-400 bg-sky-950/50">
                <Music className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Status Dot: 🟢 Playing / 🟡 Pause */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 p-1 rounded-full border-2 border-slate-900 shadow-md ${
              isPlaying ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
            }`}
            title={isPlaying ? '🟢 Playing' : '🟡 Pause'}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-white animate-ping' : 'bg-white'
              }`}
            />
          </div>

          {/* Tooltip Overlay */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover:block bg-slate-950/95 border border-sky-500/40 text-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-xl pointer-events-none">
            Klik 2x: Restore Player
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* MODE 2: EXPANDED UNIFIED FLOATING MEDIA NOTIFICATION          */
        /* ------------------------------------------------------------- */
        <div
          className={`relative w-full h-full bg-slate-900/95 backdrop-blur-2xl border-2 rounded-2xl p-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-slate-100 flex flex-col justify-between overflow-hidden transition-colors ${
            isResizeMode
              ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]'
              : 'border-sky-500/50 shadow-[0_0_25px_rgba(56,189,248,0.2)]'
          }`}
        >
          {/* Top Control Bar */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80 cursor-grab active:cursor-grabbing flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-wide text-sky-300 flex items-center gap-1">
                  Media Notification
                  <Move className="w-3 h-3 text-slate-400 ml-1 opacity-70" title="Drag Bebas (X & Y)" />
                </span>
                {isResizeMode && (
                  <span className="text-[10px] font-bold text-amber-400 animate-pulse">
                    📐 Mode Resize Aktif
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1.5 no-drag">
              {/* Status Indicator */}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border ${
                  isPlaying
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
                {isPlaying ? '🟢 Playing' : '🟡 Pause'}
              </span>

              {/* Resize Mode Button */}
              <button
                onClick={handleToggleResizeMode}
                className={`p-1.5 rounded-lg border transition-all text-xs flex items-center gap-1 ${
                  isResizeMode
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
                }`}
                title={isResizeMode ? 'Selesai Resize' : 'Masuk Mode Resize'}
              >
                {isResizeMode ? <Check className="w-3.5 h-3.5" /> : <Scaling className="w-3.5 h-3.5" />}
              </button>

              {/* Collapse Button */}
              <button
                onClick={handleToggleCollapse}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-xs"
                title="Collapse ke Bubble"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>

              {/* Close Button */}
              <button
                onClick={closeNotification}
                title="Tutup Notifikasi"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 border border-transparent transition-all text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Track Body */}
          <div className="flex items-center space-x-3 py-1 flex-1 min-h-0 overflow-hidden">
            {/* 1:1 Aspect Ratio Thumbnail */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden aspect-square bg-slate-950 flex-shrink-0 border border-slate-700 shadow-lg group">
              {currentTrack.thumbnail ? (
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className={`w-full h-full object-cover object-center aspect-square overflow-hidden ${
                    isPlaying ? 'animate-spin-slow' : ''
                  }`}
                  style={{ objectFit: 'cover', objectPosition: 'center', aspectRatio: '1 / 1' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <Music className="w-8 h-8" />
                </div>
              )}

              {/* Favorite Badge */}
              <button
                onClick={() => toggleFavorite(currentTrack)}
                className="no-drag absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 hover:bg-slate-900 text-rose-400 transition-all shadow"
                title="Sukai / Favorite Lagu"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    currentTrack.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'
                  }`}
                />
              </button>
            </div>

            {/* Title & Artist & Controls */}
            <div className="flex-1 overflow-hidden flex flex-col justify-between h-full">
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-extrabold text-white truncate leading-snug">
                  {currentTrack.title}
                </h4>
                <p className="text-[11px] font-semibold text-sky-300/90 truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-1.5 mt-2 no-drag">
                <button
                  onClick={prevTrack}
                  className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow transition-all active:scale-95"
                  title="Lagu Sebelumnya"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={togglePlayPause}
                  className="p-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={nextTrack}
                  className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 shadow transition-all active:scale-95"
                  title="Lagu Berikutnya"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>

                {/* Volume & Mute */}
                <div className="flex items-center space-x-1 ml-auto">
                  <button
                    onClick={toggleMute}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-14 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    title="Atur Volume"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seek Progress Bar */}
          <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 no-drag flex-shrink-0">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 hover:accent-sky-300"
            />
          </div>

          {/* Corner Resize Handle in Resize Mode */}
          {isResizeMode && (
            <div
              onPointerDown={handlePointerDownResize}
              className="absolute bottom-0 right-0 w-7 h-7 bg-amber-400 text-slate-950 rounded-tl-xl cursor-se-resize flex items-center justify-center shadow-lg font-bold text-xs no-drag select-none z-10"
              title="Tarik sudut ini untuk ubah Lebar & Tinggi"
            >
              📐
            </div>
          )}
        </div>
      )}
    </div>
  );
};
