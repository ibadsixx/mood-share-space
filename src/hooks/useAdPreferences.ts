import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useAdActivity = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ad-activity', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_activity')
        .select('*')
        .eq('user_id', user!.id)
        .order('clicked_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useAdTopics = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ad-topics', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_topics')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useAdAdvertisers = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ad-advertisers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_advertisers')
        .select('*')
        .eq('user_id', user!.id)
        .order('last_shown_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useAdSettings = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ad-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};
