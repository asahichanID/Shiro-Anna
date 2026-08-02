import React, { useState, useEffect, useRef } from 'react';

interface IntroProps {
  onFinish: () => void;
  logoUrl?: string;
  videoUrl?: string;
  audioUrl?: string | null;
}

type Stage = 'BLACK' | 'LOGO' | 'LIGHT_EFFECT' | 'VIDEO_LOADING' | 'DONE';

export const IntroSplashScreen: React.FC<IntroProps> = ({
  onFinish,
  logoUrl = '/assets/logo.jpg',
  videoUrl = '/assets/splash.mp4',
  audioUrl = null,
}) => {
  const [stage, setStage] = useState<Stage>('BLACK');
  const [progress, setProgress] = useState<number>(0);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const timer1 = setTimeout(() => setStage('LOGO'), 2000);
    const timer2 = setTimeout(() => setStage('LIGHT_EFFECT'), 4000);
    const timer3 = setTimeout(() => setStage('VIDEO_LOADING'), 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  useEffect(() => {
    if (audioUrl && stage === 'VIDEO_LOADING') {
      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      audio.volume = 1;
      audio.muted = true;
      audioRef.current = audio;

      return () => {
        audio.pause();
        audio.src = '';
        audioRef.current = null;
      };
    }

    return undefined;
  }, [audioUrl, stage]);

  useEffect(() => {
    if (stage === 'VIDEO_LOADING' && videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      videoRef.current.play().catch((e) => console.warn('Autoplay blocked:', e));
    }
  }, [stage]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration || 12;

    let rawPercent = (current / duration) * 100;

    if (rawPercent > 32 && rawPercent < 38) {
      rawPercent = 33;
    } else if (rawPercent > 74 && rawPercent < 80) {
      rawPercent = 75;
    }

    setProgress(Math.min(rawPercent, 100));
  };

  const handleVideoEnded = () => {
    setProgress(100);
    setTimeout(() => {
      setStage('DONE');
      onFinish();
    }, 300);
  };

  if (stage === 'DONE') return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center overflow-hidden select-none">
      {stage === 'LOGO' && (
        <div className="animate-fade-in flex items-center justify-center p-6">
          <img
            src={logoUrl}
            alt="Logo"
            className="max-w-[80vw] max-h-[40vh] object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.7)]"
          />
        </div>
      )}

      {stage === 'LIGHT_EFFECT' && (
        <div className="relative flex items-center justify-center w-full h-full">
          <div className="absolute rounded-full bg-white opacity-90 blur-3xl animate-ping-fast w-40 h-40" />
          <div className="absolute inset-0 bg-radial-glow animate-pull-zoom" />
        </div>
      )}

      {stage === 'VIDEO_LOADING' && (
        <div className="relative w-full h-full flex flex-col items-center justify-between">
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            muted
            preload="auto"
            autoPlay
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            className="absolute inset-0 w-full h-full object-cover z-0"
          />

          <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2 w-[82%] max-w-[380px] z-20 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const video = videoRef.current;
                const audio = audioRef.current;
                if (video) {
                  video.muted = false;
                  video.volume = 1;
                }
                if (audio) {
                  audio.muted = false;
                  audio.volume = 1;
                }

                void Promise.all([
                  video ? video.play().catch(() => false) : Promise.resolve(false),
                  audio ? audio.play().catch(() => false) : Promise.resolve(true),
                ]).then(([videoOk, audioOk]) => {
                  if (videoOk || audioOk) {
                    setNeedsAudioUnlock(false);
                  }
                });
              }}
              className={`mb-2 px-3 py-1.5 rounded-full bg-amber-400/95 text-slate-950 text-[11px] font-black shadow-lg shadow-amber-500/25 border border-white/20 ${
                needsAudioUnlock || audioUrl ? 'animate-pulse' : ''
              }`}
            >
              {needsAudioUnlock ? 'Tap untuk menyalakan audio' : 'Audio lokal siap'}
            </button>

            <div className="w-full bg-black/60 backdrop-blur-md h-3.5 rounded-full p-[2px] border border-white/30 shadow-2xl overflow-hidden">
              <div
                className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 h-full rounded-full transition-all duration-150 ease-out shadow-[0_0_15px_rgba(236,72,153,0.9)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between w-full px-1 text-[11px] font-mono font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <span>CONNECTING SYSTEM...</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes pingFast {
          0% { transform: scale(0.1); opacity: 1; }
          100% { transform: scale(10); opacity: 0; }
        }
        @keyframes pullZoom {
          0% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(0.6); filter: brightness(2.5); }
          100% { transform: scale(3); filter: brightness(6); }
        }
        .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-ping-fast { animation: pingFast 1.8s cubic-bezier(0, 0, 0.2, 1) forwards; }
        .animate-pull-zoom { animation: pullZoom 1.8s ease-in-out forwards; }
        .bg-radial-glow {
          background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(236,72,153,0.6) 45%, rgba(0,0,0,1) 85%);
        }
      `}</style>
    </div>
  );
};
