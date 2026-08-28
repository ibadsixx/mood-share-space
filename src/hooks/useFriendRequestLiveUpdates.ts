import { useEffect, useRef } from 'react';
import { FRIEND_REQUEST_SENT_EVENT } from '@/hooks/useFriendship';

let backgroundPollOwner = false;
const POLL_INTERVAL_MS = 15000;

export const useFriendRequestLiveUpdates = (
  refetch: () => void,
  enabled: boolean
) => {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const pollsOwned = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => refetchRef.current();

    refresh();

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    if (!backgroundPollOwner) {
      backgroundPollOwner = true;
      pollsOwned.current = true;
      pollInterval = setInterval(() => {
        if (document.visibilityState === 'visible') refresh();
      }, POLL_INTERVAL_MS);
    }

    const onFocus = () => refresh();
    const onFriendRequestSent = () => refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener(FRIEND_REQUEST_SENT_EVENT, onFriendRequestSent);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(FRIEND_REQUEST_SENT_EVENT, onFriendRequestSent);
      if (pollInterval) clearInterval(pollInterval);
      if (pollsOwned.current) {
        backgroundPollOwner = false;
        pollsOwned.current = false;
      }
    };
  }, [enabled]);
};