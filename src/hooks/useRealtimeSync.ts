import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeSyncOptions {
  sessionId: string;
  onSessionUpdate?: (payload: any) => void;
  onMatchUpdate?: (payload: any) => void;
  onParticipantUpdate?: (payload: any) => void;
  onSwipeInsert?: (payload: any) => void;
  onPresenceLeave?: (payload: any) => void;
  onReconnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Unified real-time synchronization hook
 * Consolidates all real-time subscriptions into a single channel
 */
export function useRealtimeSync({
  sessionId,
  onSessionUpdate,
  onMatchUpdate,
  onParticipantUpdate,
  onSwipeInsert,
  onPresenceLeave,
  onReconnect,
  onDisconnect,
}: UseRealtimeSyncOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Use refs for callbacks to avoid unnecessary re-subscriptions
  const onSessionUpdateRef = useRef(onSessionUpdate);
  const onMatchUpdateRef = useRef(onMatchUpdate);
  const onParticipantUpdateRef = useRef(onParticipantUpdate);
  const onSwipeInsertRef = useRef(onSwipeInsert);
  const onPresenceLeaveRef = useRef(onPresenceLeave);
  const onReconnectRef = useRef(onReconnect);
  const onDisconnectRef = useRef(onDisconnect);

  // Update refs when props change
  useEffect(() => {
    onSessionUpdateRef.current = onSessionUpdate;
    onMatchUpdateRef.current = onMatchUpdate;
    onParticipantUpdateRef.current = onParticipantUpdate;
    onSwipeInsertRef.current = onSwipeInsert;
    onPresenceLeaveRef.current = onPresenceLeave;
    onReconnectRef.current = onReconnect;
    onDisconnectRef.current = onDisconnect;
  }, [
    onSessionUpdate,
    onMatchUpdate,
    onParticipantUpdate,
    onSwipeInsert,
    onPresenceLeave,
    onReconnect,
    onDisconnect,
  ]);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const subscribeToSession = useCallback(() => {
    // Cleanup existing channel
    cleanup();

    // Create unified channel for all subscriptions
    const channel = supabase
      .channel(`session_updates_${sessionId}`, {
        config: {
          presence: {
            key: sessionId,
          },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          onSessionUpdateRef.current?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_matches',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          onMatchUpdateRef.current?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          onParticipantUpdateRef.current?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_swipes',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          onSwipeInsertRef.current?.(payload);
        }
      )
      .on('presence', { event: 'leave' }, (payload) => {
        onPresenceLeaveRef.current?.(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          reconnectAttempts.current = 0;
          setIsConnected(true);
          setIsSubscribed(true);
          onReconnectRef.current?.();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setIsSubscribed(false);
          onDisconnectRef.current?.();
          // Exponential backoff reconnection
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current += 1;
            reconnectTimeoutRef.current = setTimeout(() => {
              subscribeToSession();
            }, delay);
          } else {
            console.error('Max reconnection attempts reached');
          }
        }
      });

    channelRef.current = channel;

    return () => {
      cleanup();
    };
  }, [sessionId, cleanup]);

  useEffect(() => {
    const cleanupFn = subscribeToSession();

    return () => {
      cleanupFn();
      cleanup();
    };
  }, [subscribeToSession, cleanup]);

  return {
    channel: channelRef.current,
    isConnected,
    isSubscribed,
    reconnect: subscribeToSession,
  };
}

