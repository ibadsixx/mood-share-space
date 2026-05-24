import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const OFFLINE_THRESHOLD_MS = 120000; // 2 minutes

export function isOnline(lastSeenAt?: string): boolean {
  if (!lastSeenAt) return false;
  const now = Date.now();
  const lastSeen = new Date(lastSeenAt).getTime();
  return now - lastSeen < OFFLINE_THRESHOLD_MS;
}

export function formatLastSeen(lastSeenAt?: string): string {
  if (!lastSeenAt) return 'Offline';
  
  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return lastSeen.toLocaleDateString();
}

export function usePresence(userId?: string) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const updateLastSeen = async () => {
      await supabase.rpc('update_last_seen');
    };

    updateLastSeen();
    intervalRef.current = setInterval(updateLastSeen, 60000);

    const channel = supabase
      .channel('presence-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        () => {}
      )
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
