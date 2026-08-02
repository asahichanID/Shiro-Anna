import React, { useEffect, useRef, useState } from 'react';
import { videoCacheService } from '../services/VideoCacheService';

interface InitialLaunchLoadingScreenProps {
  onComplete: () => void;
  logoUrl?: string;
  videoUrl?: string;
  audioUrl?: string | null;
}

const DEFAULT_LOGO_URL = '/assets/logo.jpg';
const DEFAULT_VIDEO_URL = '/assets/splash.mp4';

const TRACEN_TIPS = [
  'Memuat data Pacemaker Tracen Academy...',
  'Oguri Cap sedang mengunyah wortel spesial...',
  'Menyiapkan arena pacuan & tata suara...',
  'Menyinkronkan data statistik Trainer...',
  'Mengirim sinyal ke lapangan Tracen Academy...',
];

const LOGO_FADE_IN_MS = 800;
const LOGO_VISIBLE_MS = 3400;
const LOGO_FADE_OUT_MS = 800;
const LOGO_TOTAL_MS = LOGO_FADE_IN_MS + LOGO_VISIBLE_MS + LOGO_FADE_OUT_MS; // 5000ms (~5s)
const FINISH_FADEOUT_MS = 750;
const LOADING_BAR_DURATION_MS = 12000; // 12 detik loading bar mandiri

export const InitialLaunchLoadingScreen: React.FC<InitialLaunchLoadingScreenProps> = ({
  onComplete,
  logoUrl = DEFAULT_LOGO_URL,
  videoUrl = DEFAULT_VIDEO_URL,
  audioUrl = null,
}) => {
  const [phase, setPhase] = useState<'logo' | 'video' | 'fadeout'>('logo');
  const [containerOpacity, setContainerOpacity] = useState<number>(1);
  const [containerScale, setContainerScale] = useState<number>(1);
  const [logoOpacity, setLogoOpacity] = useState<number>(0);
  const [logoScale, setLogoScale] = useState<number>(0.94);
  const [progress, setProgress] = useState<number>(0);
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const [videoSrc, setVideoSrc] = useState<string>(videoUrl);
  const [videoReady, setVideoReady] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const phaseTimerRefs = useRef<number[]>([]);
  const isFinishedRef = useRef<boolean>(false);
  const blobUrlRef = useRef<string | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const clearAllTimers = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    phaseTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
    phaseTimerRefs.current = [];
  };

  const pauseMedia = () => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (video) {
      try {
        video.pause();
      } catch {
        // ignore
      }
    }

    if (audio) {
      try {
        audio.pause();
      } catch {
        // ignore
      }
    }
  };

  const finishLoading = () => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;

    clearAllTimers();
    setProgress(100);
    setPhase('fadeout');
    setContainerOpacity(0);
    setContainerScale(1.02);

    window.setTimeout(() => {
      try {
        sessionStorage.setItem('app_initial_splash_done', 'true');
      } catch {
        // ignore storage errors
      }
      pauseMedia();
      onComplete();
    }, FINISH_FADEOUT_MS);
  };

  const syncMediaStates = (soundEnabled: boolean) => {
    const video = videoRef.current;
    if (video) {
      video.muted = !soundEnabled;
      video.volume = soundEnabled ? 1 : 0;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.muted = !soundEnabled;
      audio.volume = soundEnabled ? 1 : 0;
    }
  };

  const startPlayback = async (soundEnabled: boolean, restartFromBeginning = false) => {
    const video = videoRef.current;
    if (!video) return false;

    syncMediaStates(soundEnabled);

    try {
      if (restartFromBeginning && Math.abs(video.currentTime) > 0.1) {
        video.currentTime = 0;
      }
    } catch {
      // ignore seek errors
    }

    try {
      await video.play();
      setVideoReady(true);
    } catch (err) {
      console.warn('[Splash] video play blocked or waiting user gesture:', err);
      if (soundEnabled) {
        syncMediaStates(false);
        try {
          await video.play();
          setVideoReady(true);
        } catch {
          // ignore
        }
      }
      return false;
    }

    if (audioUrl && audioRef.current) {
      if (soundEnabled) {
        try {
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
        } catch (err) {
          console.warn('[Splash] audio play blocked:', err);
          syncMediaStates(false);
          return false;
        }
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }

    return true;
  };

  const handleLogoTap = () => {
    if (phase !== 'logo' || isFinishedRef.current) return;
    skipLogoToVideo();
  };

  const skipLogoToVideo = () => {
    if (phase !== 'logo' || isFinishedRef.current) return;
    phaseTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
    phaseTimerRefs.current = [];

    setLogoOpacity(0);
    setPhase('video');
  };

  // Preload & Background Download MP4 using VideoCacheService
  useEffect(() => {
    let isMounted = true;

    const prepareVideo = async () => {
      try {
        const cachedOrFreshUrl = await videoCacheService.getOrFetchVideo(videoUrl);
        if (isMounted) {
          if (cachedOrFreshUrl.startsWith('blob:')) {
            blobUrlRef.current = cachedOrFreshUrl;
          }
          setVideoSrc(cachedOrFreshUrl);
        }
      } catch (err) {
        console.warn('[Splash] Preload fallback to direct URL:', err);
        if (isMounted) setVideoSrc(videoUrl);
      }
    };

    void prepareVideo();

    return () => {
      isMounted = false;
    };
  }, [videoUrl]);

  // Logo Phase Timers
  useEffect(() => {
    const timerIds = [
      window.setTimeout(() => setLogoOpacity(1), 50),
      window.setTimeout(() => setLogoScale(1), 50),
      window.setTimeout(() => {
        setLogoOpacity(0);
        setLogoScale(1.04);
      }, LOGO_FADE_IN_MS + LOGO_VISIBLE_MS), // 800 + 3400 = 4200ms
      window.setTimeout(() => {
        setPhase('video');
      }, LOGO_TOTAL_MS), // 5000ms (~5s)
    ];

    phaseTimerRefs.current = timerIds;

    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  // Video Element Setup & Autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.preload = 'auto';
    video.playsInline = true;
    video.muted = true;
    video.volume = 0;

    const onCanPlay = () => {
      setVideoReady(true);
      void video.play().catch(() => {});
    };

    video.addEventListener('canplay', onCanPlay);
    video.load();

    if (video.readyState >= 2) {
      setVideoReady(true);
      void video.play().catch(() => {});
    }

    return () => {
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [videoSrc]);

  // Mandiri 12-second loading bar timer independent of video state
  useEffect(() => {
    if (phase !== 'video') return;

    setAudioUnlocked(false);
    setProgress(0);

    // Attempt autoplay video (muted)
    void startPlayback(false, true);

    const startTime = performance.now();

    const updateProgress = (now: number) => {
      if (isFinishedRef.current) return;

      const elapsed = now - startTime;
      const currentProgress = Math.min(100, (elapsed / LOADING_BAR_DURATION_MS) * 100);
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        finishLoading();
        return;
      }

      rafIdRef.current = requestAnimationFrame(updateProgress);
    };

    rafIdRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [phase]);

  // Rotate tips
  useEffect(() => {
    if (phase !== 'video') return;
    const rotateTip = window.setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TRACEN_TIPS.length);
    }, 2400);

    return () => window.clearInterval(rotateTip);
  }, [phase]);

  // Audio preload
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    audio.loop = false;
    audio.volume = 1;
    audio.muted = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [audioUrl]);

  // User gesture handler to unlock audio
  useEffect(() => {
    if (phase !== 'video') return;

    const unlockAudio = () => {
      void (async () => {
        const ok = await startPlayback(true, false);
        if (ok) {
          setAudioUnlocked(true);
        }
      })();
    };

    const options: AddEventListenerOptions = { once: true, passive: true };
    document.addEventListener('pointerdown', unlockAudio, options);
    document.addEventListener('touchstart', unlockAudio, options);
    document.addEventListener('keydown', unlockAudio, options);

    return () => {
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, [phase, audioUrl]);

  return (
    <div
      onClick={() => {
        if (phase === 'logo') handleLogoTap();
      }}
      className="fixed inset-0 z-[999999] bg-slate-950 flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer"
      style={{
        opacity: containerOpacity,
        transform: `scale(${containerScale})`,
        transition: `opacity ${FINISH_FADEOUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${FINISH_FADEOUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1), filter ${FINISH_FADEOUT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        filter: phase === 'fadeout' ? 'blur(4px)' : 'blur(0px)',
        pointerEvents: phase === 'fadeout' ? 'none' : 'auto',
        willChange: 'opacity, transform, filter',
      }}
    >
      {/* Background canvas fallback (prevents ANY black screen if video is buffering or fails) */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/80 to-slate-950 flex items-center justify-center overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-emerald-500/15 blur-[140px] animate-pulse" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-teal-500/10 blur-[100px]" />
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        // @ts-ignore
        webkit-playsinline="true"
        preload="auto"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
          videoReady && !videoError ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          willChange: 'opacity, transform',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
        onCanPlay={() => setVideoReady(true)}
        onPlaying={() => setVideoReady(true)}
        onError={() => {
          console.warn('[SplashVideo] Error loading video src:', videoSrc);
          if (videoSrc !== videoUrl) {
            setVideoSrc(videoUrl);
          } else {
            setVideoError(true);
          }
        }}
        onEnded={finishLoading}
      />

      {phase === 'logo' && (
        <div className="relative z-10 flex flex-col items-center justify-center px-4">
          <div
            className="transition-[opacity,transform] ease-out flex items-center justify-center"
            style={{
              opacity: logoOpacity,
              transform: `scale(${logoScale})`,
              transitionDuration: `${LOGO_FADE_IN_MS}ms`,
            }}
          >
            <img
              src={logoUrl}
              alt="Logo"
              className="max-w-[260px] sm:max-w-[340px] max-h-[260px] sm:max-h-[340px] w-auto h-auto object-contain drop-shadow-[0_0_35px_rgba(16,185,129,0.35)]"
              loading="eager"
              decoding="async"
            />
          </div>

          <div
            className="mt-6 text-center transition-opacity duration-700 flex flex-col items-center"
            style={{ opacity: logoOpacity }}
          >
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
              TRACEN ACADEMY
            </h1>
            <p className="text-xs sm:text-sm text-emerald-400/90 font-semibold tracking-widest uppercase mt-1">
              Oguri Cap • Musume Bot
            </p>
            <div className="mt-5 px-4 py-1.5 rounded-full bg-slate-900/80 border border-emerald-400/60 shadow-[0_0_15px_rgba(16,185,129,0.3)] backdrop-blur-md animate-pulse">
              <p className="text-xs sm:text-sm text-emerald-300 font-bold tracking-wider uppercase">
                Tap layar untuk melewati
              </p>
            </div>
          </div>
        </div>
      )}

      {(phase === 'video' || phase === 'fadeout') && (
        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/35" />
      )}

      {(phase === 'video' || phase === 'fadeout') && (
        <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 w-[92%] max-w-2xl z-30 flex flex-col items-center">
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const ok = await startPlayback(true, false);
                if (ok) {
                  setAudioUnlocked(true);
                }
              })();
            }}
            className="mb-3 px-3 py-1.5 rounded-full bg-amber-400/95 text-slate-950 text-[11px] font-black shadow-lg shadow-amber-500/25 border border-white/20 animate-pulse cursor-pointer hover:scale-105 transition-all"
          >
            {audioUnlocked ? 'Audio aktif' : 'Tap untuk menyalakan audio'}
          </button>

          <div className="w-full flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-md shadow-emerald-500/30 animate-pulse">
                NOW LOADING
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-300 tracking-wide truncate max-w-[200px] sm:max-w-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {TRACEN_TIPS[currentTipIndex]}
              </span>
            </div>
            <span className="text-sm sm:text-base font-black text-amber-300 font-mono tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {Math.floor(progress)}%
            </span>
          </div>

          <div className="relative w-full h-5 sm:h-6 rounded-full bg-slate-900/90 border-2 border-emerald-400/60 p-0.5 shadow-[0_0_20px_rgba(16,185,129,0.4)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 transition-all duration-75 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div
                className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%,transparent)]"
                style={{ backgroundSize: '1rem 1rem' }}
              />
            </div>

            <div
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-75 pointer-events-none flex items-center justify-center -ml-3"
              style={{ left: `${Math.max(3, Math.min(97, progress))}%` }}
            >
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-400 border border-white text-slate-950 flex items-center justify-center text-xs shadow-lg animate-bounce">
                🐎
              </div>
            </div>
          </div>

          <div className="mt-2 text-[10px] sm:text-xs text-slate-200 font-medium tracking-wider text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            TRACEN ACADEMY SYSTEM • INITIALIZING PACEMAKER SESSION
          </div>
        </div>
      )}
    </div>
  );
};
