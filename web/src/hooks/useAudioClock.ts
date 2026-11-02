import { useState, useEffect, useRef } from 'react';

export interface UseAudioClockOptions {
  serverTimestamp?: number;
  trackPositionMs?: number;
  isPlaying?: boolean;
  isPaused?: boolean;
  duration?: number;
  latencyCompensationMs?: number;
  isSeeking?: boolean;
  seekingTime?: number;
}

export interface UseAudioClockResult {
  currentTime: number;
  formattedTime: string;
  progressPercent: number;
  setManualTime: (seconds: number) => void;
}

export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const useAudioClock = ({
  serverTimestamp,
  trackPositionMs,
  isPlaying = false,
  isPaused = false,
  duration = 0,
  latencyCompensationMs = 200,
  isSeeking = false,
  seekingTime = 0,
}: UseAudioClockOptions): UseAudioClockResult => {
  const [internalTime, setInternalTime] = useState<number>(() => {
    if (trackPositionMs !== undefined) {
      return Math.max(0, (trackPositionMs - latencyCompensationMs) / 1000);
    }
    return 0;
  });

  // Keep latest parameters in ref for the 60fps animation frame loop
  const paramsRef = useRef({
    serverTimestamp,
    trackPositionMs,
    isPlaying,
    isPaused,
    duration,
    latencyCompensationMs,
    isSeeking,
  });

  useEffect(() => {
    paramsRef.current = {
      serverTimestamp,
      trackPositionMs,
      isPlaying,
      isPaused,
      duration,
      latencyCompensationMs,
      isSeeking,
    };
  }, [
    serverTimestamp,
    trackPositionMs,
    isPlaying,
    isPaused,
    duration,
    latencyCompensationMs,
    isSeeking,
  ]);

  useEffect(() => {
    let animationFrameId: number;
    let lastRenderTime = 0;

    const renderLoop = (timestamp: number) => {
      const {
        serverTimestamp: sTimestamp,
        trackPositionMs: posMs,
        isPlaying: activePlaying,
        isPaused: activePaused,
        duration: trackDur,
        latencyCompensationMs: latComp,
        isSeeking: seeking,
      } = paramsRef.current;

      if (!seeking) {
        let computedTime = 0;
        if (sTimestamp && posMs !== undefined) {
          const now = Date.now();
          const elapsedSinceServer = activePlaying && !activePaused ? Math.max(0, now - sTimestamp) : 0;
          const totalMs = Math.max(0, posMs + elapsedSinceServer - latComp);
          computedTime = totalMs / 1000;
        } else if (posMs !== undefined) {
          computedTime = Math.max(0, (posMs - latComp) / 1000);
        }

        if (trackDur > 0 && computedTime >= trackDur) {
          computedTime = trackDur;
        }

        // Throttle to ~60fps (every ~16ms) to prevent unnecessary React renders
        if (timestamp - lastRenderTime >= 15) {
          setInternalTime((prev) => {
            // Only update if difference is meaningful (> 15ms)
            if (Math.abs(prev - computedTime) > 0.015) {
              return computedTime;
            }
            return prev;
          });
          lastRenderTime = timestamp;
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const currentTime = isSeeking ? (seekingTime ?? 0) : internalTime;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const formattedTime = formatTime(currentTime);

  const setManualTime = (seconds: number) => {
    setInternalTime(seconds);
  };

  return {
    currentTime,
    formattedTime,
    progressPercent,
    setManualTime,
  };
};
