import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CallType } from '@/services/webrtc';
import { CallStatusDb } from './types';

export const useCallDatabase = () => {
  const logCallToDb = useCallback(async (
    callerId: string,
    receiverId: string,
    callType: CallType,
    status: CallStatusDb,
    durationSeconds: number = 0
  ) => {
    try {
      await supabase.rpc('log_call', {
        p_caller_id: callerId,
        p_receiver_id: receiverId,
        p_call_type: callType,
        p_status: status,
        p_duration_seconds: durationSeconds
      });
      console.log('[CallDB] Logged call to database:', status);
    } catch (err) {
      console.error('[CallDB] Error logging call:', err);
    }
  }, []);

  return { logCallToDb };
};
