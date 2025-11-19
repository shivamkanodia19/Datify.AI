import { useEffect, useCallback } from 'react';

interface ProgressData {
  sessionId: string;
  round: number;
  currentIndex: number;
  deck: string[]; // Place IDs
  timestamp: number;
}

const STORAGE_KEY_PREFIX = 'swipe_progress_';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook for persisting swipe progress to localStorage
 */
export function useProgressPersistence(sessionId: string) {
  const storageKey = `${STORAGE_KEY_PREFIX}${sessionId}`;

  // Save progress
  const saveProgress = useCallback(
    (round: number, currentIndex: number, deckIds: string[]) => {
      try {
        const progress: ProgressData = {
          sessionId,
          round,
          currentIndex,
          deck: deckIds,
          timestamp: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(progress));
      } catch (error) {
        console.error('Failed to save progress:', error);
      }
    },
    [sessionId, storageKey]
  );

  // Load progress
  const loadProgress = useCallback((): ProgressData | null => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;

      const progress: ProgressData = JSON.parse(stored);

      // Check if progress is too old
      const age = Date.now() - progress.timestamp;
      if (age > MAX_AGE_MS) {
        localStorage.removeItem(storageKey);
        return null;
      }

      // Verify it's for the same session
      if (progress.sessionId !== sessionId) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return progress;
    } catch (error) {
      console.error('Failed to load progress:', error);
      localStorage.removeItem(storageKey);
      return null;
    }
  }, [sessionId, storageKey]);

  // Clear progress
  const clearProgress = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear progress:', error);
    }
  }, [storageKey]);

  // Clear old progress on mount
  useEffect(() => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const progress: ProgressData = JSON.parse(stored);
              const age = Date.now() - progress.timestamp;
              if (age > MAX_AGE_MS) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // Invalid data, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Failed to clean old progress:', error);
    }
  }, []);

  return {
    saveProgress,
    loadProgress,
    clearProgress,
  };
}

