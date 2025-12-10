import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RoundCompletionResult } from '@/types/game';
import { toast } from 'sonner';

interface UseRoundCompletionOptions {
  sessionId: string;
  onComplete: (result: RoundCompletionResult) => void;
}

/**
 * Hook for checking round completion
 * Handles race conditions with optimistic locking
 */
export function useRoundCompletion({ sessionId, onComplete }: UseRoundCompletionOptions) {
  const isChecking = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastVersionRef = useRef<number | null>(null);

  const checkRoundCompletion = useCallback(
    async (deckPlaceIds: string[], roundNumber: number, expectedVersion?: number) => {
      // Prevent overlapping checks
      if (isChecking.current) {
        return;
      }

      isChecking.current = true;

      // Cancel previous check
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        if (deckPlaceIds.length === 0) {
          return;
        }

        // Call server-side atomic round completion RPC with optimistic locking
        const { data, error } = await supabase.rpc('check_and_complete_round', {
          p_session_id: sessionId,
          p_deck_place_ids: deckPlaceIds,
          p_round_number: roundNumber,
          p_expected_version: expectedVersion || lastVersionRef.current || null,
        });

        // Check if request was aborted
        if (signal.aborted) {
          return;
        }

        if (error) {
          console.error('Error checking round completion:', error);
          toast.error('Failed to check round completion');
          return;
        }

        if (!data) {
          return;
        }

        // Fix type casting with intermediate cast
        const result = data as unknown as RoundCompletionResult & {
          version_mismatch?: boolean;
          locked?: boolean;
          version?: number;
          current_version?: number;
          expected_version?: number;
        };

        // Handle version mismatch (race condition detected)
        if (result.version_mismatch) {
          console.warn('Version mismatch detected, refreshing session state');
          toast.warning('Session was updated. Refreshing...');

          // Fetch latest session version and retry
          const { data: sessionData } = await supabase
            .from('sessions')
            .select('version, current_round')
            .eq('id', sessionId)
            .single();

          if (sessionData && sessionData.version !== undefined) {
            lastVersionRef.current = sessionData.version;
            // Retry with new version
            return checkRoundCompletion(deckPlaceIds, roundNumber, sessionData.version);
          }
          return;
        }

        // Handle lock error
        if (result.locked) {
          console.warn('Session is locked, retrying shortly...');
          // Retry after a short delay
          setTimeout(() => {
            checkRoundCompletion(deckPlaceIds, roundNumber, expectedVersion);
          }, 500);
          return;
        }

        // Store version for next check
        if (result.version !== undefined) {
          lastVersionRef.current = result.version;
        }

        // If round not completed, exit early
        if (!result.completed) {
          return;
        }

        // Round is complete - process results
        onComplete(result);
      } catch (error: any) {
        if (error.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        console.error('Error in checkRoundCompletion:', error);
        toast.error('An error occurred while checking round completion');
      } finally {
        isChecking.current = false;
      }
    },
    [sessionId, onComplete]
  );

  return {
    checkRoundCompletion,
    isChecking: isChecking.current,
    currentVersion: lastVersionRef.current,
  };
}

