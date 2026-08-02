import React, { useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from '../context/AudioPlayerContext';

// Link CDN MP3 Background Music (Dapat diganti dengan mudah)
export const BGM_DEFAULT_URL = 'https://cdn.jsdelivr.net/gh/asahichanID/SoundMp3@main/girl_legend_official.mp3';

export interface BackgroundMusicPlayerProps {
  isAppLoading?: boolean;
}

export const BackgroundMusicPlayer: React.FC<BackgroundMusicPlayerProps> = ({ isAppLoading = false }) => {
  const { currentTrack, isPlaying: isUserPlaying } = useAudioPlayer();
  const userIsPlayingMedia = Boolean(currentTrack && isUserPlaying);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Status BGM diputar atau tidak
  const [isBgmPlaying, setIsBgmPlaying] = useState<boolean>(false);
  // Flag jika user menekan tombol 🎵 untuk pause manual BGM
  const isManualPausedRef = useRef<boolean>(false);

  // Ref menyimpan status isAppLoading
  const isAppLoadingRef = useRef<boolean>(isAppLoading);
  useEffect(() => {
    const prevLoading = isAppLoadingRef.current;
    isAppLoadingRef.current = isAppLoading;

    if (isAppLoading) {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsBgmPlaying(false);
    } else if (prevLoading && !isAppLoading) {
      // Splash loading screen baru saja selesai!
      // Jalankan audio default secara otomatis ~500ms setelah loading screen berakhir
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }

      delayTimerRef.current = setTimeout(() => {
        delayTimerRef.current = null;
        if (
          audioRef.current &&
          !isManualPausedRef.current &&
          !userIsPlayingMediaRef.current &&
          !isAppLoadingRef.current &&
          !document.hidden &&
          document.visibilityState === 'visible'
        ) {
          audioRef.current
            .play()
            .then(() => {
              setIsBgmPlaying(true);
              wasPlayingBeforeHideRef.current = true;
            })
            .catch((err) => {
              console.warn('[BGM AUTOSTART AFTER SPLASH BLOCKED BY BROWSER]', err);
            });
        }
      }, 500); // Tepat ~500ms setelah loading screen selesai
    }
  }, [isAppLoading]);

  // Ref menyimpan status userIsPlayingMedia
  const userIsPlayingMediaRef = useRef<boolean>(userIsPlayingMedia);
  const prevUserIsPlayingMediaRef = useRef<boolean>(userIsPlayingMedia);

  // Ref menyimpan status apakah BGM seharusnya aktif diputar sebelum app ke background
  const wasPlayingBeforeHideRef = useRef<boolean>(false);

  // Keep userIsPlayingMediaRef up to date
  useEffect(() => {
    userIsPlayingMediaRef.current = userIsPlayingMedia;
  }, [userIsPlayingMedia]);

  // 1. Inisialisasi Audio Element & Auto Play saat pertama kali web dibuka
  useEffect(() => {
    const audio = new Audio(BGM_DEFAULT_URL);
    audio.volume = 0.5; // Volume khusus BGM
    audio.loop = true; // Infinite loop
    audio.preload = 'auto';

    const handleSeamlessLoop = () => {
      if (audio.duration && audio.duration > 1 && audio.currentTime >= audio.duration - 0.18) {
        audio.currentTime = 0;
        if (audio.paused) {
          audio.play().catch(() => {});
        }
      }
    };
    audio.addEventListener('timeupdate', handleSeamlessLoop);
    
    audioRef.current = audio;

    const startBgm = async () => {
      if (isManualPausedRef.current || userIsPlayingMediaRef.current || isAppLoadingRef.current) return;
      if (document.hidden || document.visibilityState === 'hidden') {
        wasPlayingBeforeHideRef.current = true;
        return;
      }
      try {
        await audio.play();
        setIsBgmPlaying(true);
        wasPlayingBeforeHideRef.current = true;
      } catch (err) {
        // Autoplay terblokir kebijakan browser, menunggu gestures
        setIsBgmPlaying(false);
      }
    };

    startBgm();

    // Fallback autoplay via user interaction jika terblokir gesture browser:
    const handleUserInteraction = () => {
      if (
        audioRef.current &&
        !isManualPausedRef.current &&
        !userIsPlayingMediaRef.current &&
        !isAppLoadingRef.current &&
        audioRef.current.paused &&
        !document.hidden
      ) {
        audioRef.current
          .play()
          .then(() => {
            setIsBgmPlaying(true);
            wasPlayingBeforeHideRef.current = true;
            window.removeEventListener('pointerdown', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
          })
          .catch(() => {});
      }
    };

    window.addEventListener('pointerdown', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);

    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      audio.removeEventListener('timeupdate', handleSeamlessLoop);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  // 2. Handler Visibility & Focus (Pause saat background/berpindah tab, resume saat kembali ke foreground)
  useEffect(() => {
    const handleAppBackground = () => {
      if (!audioRef.current) return;

      // Batalkan timer delay 4s jika sedang berjalan agar BGM tidak menyala saat di background
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }

      // Catat apakah BGM sedang diputar sebelum masuk background
      if (!audioRef.current.paused) {
        wasPlayingBeforeHideRef.current = true;
        audioRef.current.pause();
        setIsBgmPlaying(false);
      }
    };

    const handleAppForeground = () => {
      if (!audioRef.current) return;

      // Resume BGM HANYA jika:
      // - User tidak sedang memutar media di fitur Play (!userIsPlayingMediaRef.current)
      // - User tidak mempause BGM secara manual (!isManualPausedRef.current)
      // - BGM sebelumnya sedang aktif/seharusnya aktif sebelum ke background (wasPlayingBeforeHideRef.current)
      if (
        !userIsPlayingMediaRef.current &&
        !isManualPausedRef.current &&
        wasPlayingBeforeHideRef.current
      ) {
        audioRef.current.play().then(() => {
          setIsBgmPlaying(true);
        }).catch((err) => {
          console.warn('[BGM FOREGROUND RESUME ERROR]', err);
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        handleAppBackground();
      } else if (document.visibilityState === 'visible') {
        handleAppForeground();
      }
    };

    const handleBlur = () => {
      handleAppBackground();
    };

    const handleFocus = () => {
      if (!document.hidden && document.visibilityState === 'visible') {
        handleAppForeground();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // 3. Integrasi dengan Fitur Play (Prioritas Audio & Delay 4 Detik)
  useEffect(() => {
    const wasUserPlaying = prevUserIsPlayingMediaRef.current;
    prevUserIsPlayingMediaRef.current = userIsPlayingMedia;

    if (userIsPlayingMedia) {
      // User sedang memutar lagu sendiri dari fitur Play
      // Batalkan segenap timer delay & pause BGM seketika
      wasPlayingBeforeHideRef.current = false;
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsBgmPlaying(false);
    } else if (wasUserPlaying && !userIsPlayingMedia) {
      // User BARU SAJA menyelesaikan / mempause lagu fitur Play
      // Tunggu 4 detik sebelum memutar kembali BGM
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);

      delayTimerRef.current = setTimeout(() => {
        delayTimerRef.current = null;
        if (!isManualPausedRef.current && audioRef.current) {
          if (!document.hidden && document.visibilityState === 'visible') {
            audioRef.current.play().then(() => {
              setIsBgmPlaying(true);
              wasPlayingBeforeHideRef.current = true;
            }).catch((err) => {
              console.warn('[BGM RESUME ERROR]', err);
            });
          } else {
            wasPlayingBeforeHideRef.current = true;
          }
        }
      }, 4000); // 4000ms = 4 detik delay
    }
  }, [userIsPlayingMedia]);

  // Handle klik tombol 🎵 (Manual toggle BGM)
  const handleToggleBgm = () => {
    if (!audioRef.current) return;

    if (isBgmPlaying) {
      // Pause manual
      audioRef.current.pause();
      setIsBgmPlaying(false);
      isManualPausedRef.current = true;
      wasPlayingBeforeHideRef.current = false;
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    } else {
      // Jika user sedang memutar lagu dari Play tab, prioritas diberikan ke Play tab
      if (userIsPlayingMedia) {
        return;
      }

      // Resume manual
      isManualPausedRef.current = false;
      wasPlayingBeforeHideRef.current = true;

      if (!document.hidden && document.visibilityState === 'visible') {
        audioRef.current.play().then(() => {
          setIsBgmPlaying(true);
        }).catch((err) => {
          console.warn('[BGM MANUAL PLAY ERROR]', err);
        });
      }
    }
  };

  return (
    <div className="fixed top-3 right-3 z-[60] flex items-center space-x-2 pointer-events-auto">
      <button
        onClick={handleToggleBgm}
        type="button"
        title={
          userIsPlayingMedia
            ? "Background music dijeda (Lagu Play sedang diputar)"
            : isBgmPlaying
            ? "Pause Background Music"
            : "Play Background Music"
        }
        className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border shadow-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer group ${
          isBgmPlaying
            ? 'bg-slate-900/90 border-sky-400/80 text-sky-300 shadow-sky-500/20 hover:scale-105'
            : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-500'
        }`}
      >
        <span
          className="text-base sm:text-lg inline-block transition-transform duration-200 select-none"
          style={{
            animationName: 'bgmSpin',
            animationDuration: '8s',
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationPlayState: isBgmPlaying ? 'running' : 'paused',
          }}
        >
          🎵
        </span>

        {/* Pulsing ring indicator saat diputar */}
        {isBgmPlaying && (
          <span className="absolute -inset-0.5 rounded-full border border-sky-400/40 animate-ping pointer-events-none opacity-40"></span>
        )}
      </button>
    </div>
  );
};
