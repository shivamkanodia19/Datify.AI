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
          onSessionUpdate?.(payload);
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
          onMatchUpdate?.(payload);
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
          onParticipantUpdate?.(payload);
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
          onSwipeInsert?.(payload);
        }
      )
      .on('presence', { event: 'leave' }, (payload) => {
        onPresenceLeave?.(payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          reconnectAttempts.current = 0;
          setIsConnected(true);
          setIsSubscribed(true);
          onReconnect?.();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setIsSubscribed(false);
          onDisconnect?.();
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
  }, [
    sessionId,
    onSessionUpdate,
    onMatchUpdate,
    onParticipantUpdate,
    onSwipeInsert,
    onPresenceLeave,
    onReconnect,
    onDisconnect,
    cleanup,
  ]);

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

