import React, { createContext, useContext, useState, useEffect } from 'react';

export type FpsOption = 30 | 60 | 90 | 120;

interface FpsContextType {
  targetFps: FpsOption;
  effectiveFps: number;
  setTargetFps: (fps: FpsOption) => void;
  detectedFpsCap: number | null;
}

const STORAGE_KEY_FPS = 'oguri_app_target_fps';

const FpsContext = createContext<FpsContextType | undefined>(undefined);

export const FpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [targetFps, setTargetFpsState] = useState<FpsOption>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FPS);
      if (saved) {
        const val = parseInt(saved, 10);
        if ([30, 60, 90, 120].includes(val)) {
          return val as FpsOption;
        }
      }
    } catch {
      // Ignore fallback
    }
    return 60;
  });

  const [detectedFpsCap, setDetectedFpsCap] = useState<number | null>(null);

  // Measure hardware max refresh rate on mount safely
  useEffect(() => {
    let frameCount = 0;
    let startTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      frameCount++;
      const elapsed = now - startTime;
      if (elapsed >= 1000) {
        const calculatedFps = Math.round((frameCount * 1000) / elapsed);
        // Normalize common monitor refresh rates (30, 60, 75, 90, 120, 144, 240)
        let normalizedCap = calculatedFps;
        if (calculatedFps >= 110) normalizedCap = 120;
        else if (calculatedFps >= 85) normalizedCap = 90;
        else if (calculatedFps >= 55) normalizedCap = 60;
        else normalizedCap = 30;

        setDetectedFpsCap(normalizedCap);
      } else if (frameCount < 150) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Calculate effective FPS (capped by device capabilities)
  const effectiveFps = detectedFpsCap ? Math.min(targetFps, Math.max(30, detectedFpsCap)) : targetFps;

  const setTargetFps = (fps: FpsOption) => {
    setTargetFpsState(fps);
    try {
      localStorage.setItem(STORAGE_KEY_FPS, fps.toString());
    } catch (e) {
      console.warn('Failed to save FPS to localStorage:', e);
    }
  };

  useEffect(() => {
    // Apply CSS variables and data attributes for web app CSS animations & transitions
    document.documentElement.style.setProperty('--app-target-fps', effectiveFps.toString());
    document.documentElement.style.setProperty('--app-frame-ms', `${(1000 / effectiveFps).toFixed(2)}ms`);
    document.documentElement.setAttribute('data-target-fps', effectiveFps.toString());

    // Patch global requestAnimationFrame throttling when FPS target is set
    if (typeof window !== 'undefined') {
      const nativeRAF = (window as any)._nativeRAF || window.requestAnimationFrame.bind(window);
      const nativeCancel = (window as any)._nativeCancel || window.cancelAnimationFrame.bind(window);
      (window as any)._nativeRAF = nativeRAF;
      (window as any)._nativeCancel = nativeCancel;

      const targetInterval = 1000 / effectiveFps;
      let lastFrameTime = 0;
      let scheduledCallbacks: { id: number; cb: FrameRequestCallback }[] = [];
      let nextId = 1;
      let rafLoopScheduled = false;

      const processCallbacks = (now: number) => {
        rafLoopScheduled = false;
        const elapsed = now - lastFrameTime;

        if (elapsed >= targetInterval - 1.5) {
          lastFrameTime = now;
          const currentQueue = scheduledCallbacks;
          scheduledCallbacks = [];
          currentQueue.forEach(({ cb }) => {
            try {
              cb(now);
            } catch (e) {
              console.error('RAF Callback error:', e);
            }
          });
        } else if (scheduledCallbacks.length > 0) {
          rafLoopScheduled = true;
          nativeRAF(processCallbacks);
        }
      };

      window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
        const id = nextId++;
        scheduledCallbacks.push({ id, cb: callback });
        if (!rafLoopScheduled) {
          rafLoopScheduled = true;
          nativeRAF(processCallbacks);
        }
        return id;
      };

      window.cancelAnimationFrame = (id: number): void => {
        scheduledCallbacks = scheduledCallbacks.filter((item) => item.id !== id);
        nativeCancel(id);
      };
    }
  }, [targetFps, effectiveFps]);

  return (
    <FpsContext.Provider value={{ targetFps, effectiveFps, setTargetFps, detectedFpsCap }}>
      {children}
    </FpsContext.Provider>
  );
};

export const useFps = () => {
  const ctx = useContext(FpsContext);
  if (!ctx) {
    throw new Error('useFps must be used within an FpsProvider');
  }
  return ctx;
};

