import React, { useEffect, useState, useRef } from 'react';

interface GlowParticle {
  id: string;
  dx: number;
  dy: number;
}

interface TapEffectItem {
  id: string;
  x: number;
  y: number;
  particles: GlowParticle[];
}

const LOCAL_SOUND_URL = '/assets/touch.mp3';
const LOCAL_SOUND_FALLBACK = '/assets/touch.mp4';
const CDN_SOUND_URL = 'https://raw.githubusercontent.com/asahichanID/SoundMp3/main/touch.mp3';

export const UmaMusumeTapEffect: React.FC = () => {
  const [taps, setTaps] = useState<TapEffectItem[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    // Preload audio into memory via Web Audio API for zero-delay playback
    const loadAudioBuffer = async () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }

        const fetchBuffer = async (url: string): Promise<ArrayBuffer> => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.arrayBuffer();
        };

        let rawBuffer: ArrayBuffer | null = null;
        try {
          rawBuffer = await fetchBuffer(LOCAL_SOUND_URL);
        } catch {
          try {
            rawBuffer = await fetchBuffer(LOCAL_SOUND_FALLBACK);
          } catch {
            rawBuffer = await fetchBuffer(CDN_SOUND_URL);
          }
        }

        if (rawBuffer && audioCtxRef.current) {
          audioCtxRef.current.decodeAudioData(
            rawBuffer,
            (decoded) => {
              audioBufferRef.current = decoded;
            },
            () => {}
          );
        }
      } catch {
        // Fallback gracefully if Web Audio API is unsupported
      }
    };

    loadAudioBuffer();
  }, []);

  const playTapSound = () => {
    try {
      // 1. Web Audio API (Zero Latency Instant Trigger)
      if (audioCtxRef.current && audioBufferRef.current) {
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        const gainNode = audioCtxRef.current.createGain();
        gainNode.gain.value = 0.5; // Set volume to 50%
        source.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);
        source.start(0);
        return;
      }

      // 2. HTML5 Audio Element Fallback
      const audio = new Audio(LOCAL_SOUND_URL);
      audio.volume = 0.5;
      audio.play().catch(() => {
        const cdnAudio = new Audio(CDN_SOUND_URL);
        cdnAudio.volume = 0.5;
        cdnAudio.play().catch(() => {});
      });
    } catch {
      // Audio playback silent catch
    }
  };

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent | MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as PointerEvent).clientX;
        clientY = (e as PointerEvent).clientY;
      } else {
        return;
      }

      if (clientX === 0 && clientY === 0) return;

      // Play zero-delay tap sound
      playTapSound();

      const tapId = `tap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const particleCount = 5; // 5 lightweight glowing particles
      const particles: GlowParticle[] = [];

      for (let i = 0; i < particleCount; i++) {
        const angle = i * ((2 * Math.PI) / particleCount) + (Math.random() * 0.4 - 0.2);
        const distance = 20 + Math.random() * 16; // 20px - 36px outward burst
        particles.push({
          id: `p_${i}`,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
        });
      }

      const newTap: TapEffectItem = {
        id: tapId,
        x: clientX,
        y: clientY,
        particles,
      };

      setTaps((prev) => [...prev.slice(-10), newTap]);

      // Auto cleanup after animation finishes (500ms)
      setTimeout(() => {
        setTaps((prev) => prev.filter((item) => item.id !== tapId));
      }, 500);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  return (
    <>
      {/* Injected Keyframe Animations for Hardware-Accelerated 120fps Rendering */}
      <style>{`
        @keyframes tapRingExpand {
          0% {
            transform: translate(-50%, -50%) scale(0.15);
            opacity: 0.85;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.85);
            opacity: 0;
          }
        }

        @keyframes tapStarPop {
          0% {
            transform: translate(-50%, -50%) scale(0.3) rotate(-12deg);
            opacity: 0;
          }
          28% {
            transform: translate(-50%, -50%) scale(1.25) rotate(0deg);
            opacity: 0.95;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.75) rotate(12deg);
            opacity: 0;
          }
        }

        @keyframes tapParticleBurst {
          0% {
            transform: translate(-50%, -50%) translate(0px, 0px) scale(1);
            opacity: 0.95;
          }
          100% {
            transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.2);
            opacity: 0;
          }
        }
      `}</style>

      <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden" aria-hidden="true">
        {taps.map((tap) => (
          <React.Fragment key={tap.id}>
            {/* 1. Thin Transparent Expanding Circle directly centered at (x, y) */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${tap.x}px`,
                top: `${tap.y}px`,
                width: '64px',
                height: '64px',
                border: '1.5px solid rgba(255, 255, 255, 0.85)',
                boxShadow: '0 0 10px rgba(255, 255, 255, 0.5), inset 0 0 6px rgba(255, 255, 255, 0.3)',
                animation: 'tapRingExpand 480ms cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                willChange: 'transform, opacity',
              }}
            />

            {/* 2. Transparent White SVG Star centered directly at (x, y) */}
            <div
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                left: `${tap.x}px`,
                top: `${tap.y}px`,
                animation: 'tapStarPop 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                willChange: 'transform, opacity',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                style={{
                  filter:
                    'drop-shadow(0 0 6px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 14px rgba(255, 255, 255, 0.6))',
                }}
              >
                {/* 4-Point Diamond Vector Star */}
                <path
                  d="M12 2 C12 8 16 12 22 12 C16 12 12 16 12 22 C12 16 8 12 2 12 C8 12 12 8 12 2 Z"
                  fill="rgba(255, 255, 255, 0.95)"
                />
                {/* Inner Core Bright Sparkle */}
                <path
                  d="M12 7 C12 10 14 12 17 12 C14 12 12 14 12 17 C12 14 10 12 7 12 C10 12 12 10 12 7 Z"
                  fill="rgba(255, 255, 255, 1)"
                />
              </svg>
            </div>

            {/* 3. Lightweight Glow Particles */}
            {tap.particles.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: `${tap.x}px`,
                  top: `${tap.y}px`,
                  width: '4px',
                  height: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 0 6px rgba(255, 255, 255, 0.9), 0 0 10px rgba(255, 255, 255, 0.6)',
                  animation: 'tapParticleBurst 420ms cubic-bezier(0.2, 0.8, 0.4, 1) forwards',
                  willChange: 'transform, opacity',
                  ['--dx' as any]: `${p.dx}px`,
                  ['--dy' as any]: `${p.dy}px`,
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </>
  );
};
