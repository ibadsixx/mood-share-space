import { useRef, useEffect, useCallback } from 'react';

// Ringtone URL - using a royalty-free sound
const RINGTONE_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const RINGBACK_URL = 'https://assets.mixkit.co/active_storage/sfx/1361/1361-preview.mp3';

interface UseCallAudioOptions {
  status: 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
  isOutgoing: boolean;
}

export const useCallAudio = ({ status, isOutgoing }: UseCallAudioOptions) => {
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const ringbackRef = useRef<HTMLAudioElement | null>(null);

  const stopAllAudio = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }
    if (ringbackRef.current) {
      ringbackRef.current.pause();
      ringbackRef.current.currentTime = 0;
      ringbackRef.current = null;
    }
  }, []);

  // Play ringtone for incoming calls
  useEffect(() => {
    if (status === 'ringing' && !isOutgoing) {
      stopAllAudio();
      ringtoneRef.current = new Audio(RINGTONE_URL);
      ringtoneRef.current.loop = true;
      ringtoneRef.current.volume = 0.5;
      ringtoneRef.current.play().catch((e) => {
        console.log('[CallAudio] Could not play ringtone:', e);
      });
    } else if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current = null;
    }
  }, [status, isOutgoing, stopAllAudio]);

  // Play ringback tone for outgoing calls (caller hears this while waiting)
  useEffect(() => {
    if (status === 'calling' && isOutgoing) {
      stopAllAudio();
      ringbackRef.current = new Audio(RINGBACK_URL);
      ringbackRef.current.loop = true;
      ringbackRef.current.volume = 0.3;
      ringbackRef.current.play().catch((e) => {
        console.log('[CallAudio] Could not play ringback:', e);
      });
    } else if (ringbackRef.current) {
      ringbackRef.current.pause();
      ringbackRef.current = null;
    }
  }, [status, isOutgoing, stopAllAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  return { stopAllAudio };
};
