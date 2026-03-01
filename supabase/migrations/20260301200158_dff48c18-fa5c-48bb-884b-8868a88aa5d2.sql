-- Table for ad interactions/activity
CREATE TABLE public.ad_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  advertiser TEXT NOT NULL,
  image_url TEXT DEFAULT '/placeholder.svg',
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for bookmarked/saved ads
CREATE TABLE public.saved_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT DEFAULT '/placeholder.svg',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for advertisers that showed ads to user
CREATE TABLE public.ad_advertisers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🏢',
  last_shown_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for ad topics/subjects
CREATE TABLE public.ad_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📌',
  preference TEXT DEFAULT 'neutral',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for ad settings (Handle info tab)
CREATE TABLE public.ad_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  use_partner_data BOOLEAN DEFAULT true,
  show_ads_in_external_apps BOOLEAN DEFAULT true,
  use_activity_for_external_ads BOOLEAN DEFAULT true,
  social_interactions_visibility TEXT DEFAULT 'friends',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ad_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users view own ad activity" ON public.ad_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ad activity" ON public.ad_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ad activity" ON public.ad_activity FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own saved ads" ON public.saved_ads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own saved ads" ON public.saved_ads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own saved ads" ON public.saved_ads FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own ad advertisers" ON public.ad_advertisers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ad advertisers" ON public.ad_advertisers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ad advertisers" ON public.ad_advertisers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own ad topics" ON public.ad_topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ad topics" ON public.ad_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ad topics" ON public.ad_topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own ad topics" ON public.ad_topics FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own ad settings" ON public.ad_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ad settings" ON public.ad_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ad settings" ON public.ad_settings FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for ad_settings updated_at
CREATE TRIGGER update_ad_settings_updated_at
  BEFORE UPDATE ON public.ad_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();