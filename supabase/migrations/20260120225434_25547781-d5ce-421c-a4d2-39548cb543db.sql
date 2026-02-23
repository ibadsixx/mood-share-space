-- Add new reaction type values to support Lottie reaction keys
ALTER TYPE public.reaction_type ADD VALUE IF NOT EXISTS 'ok';
ALTER TYPE public.reaction_type ADD VALUE IF NOT EXISTS 'red_heart';
ALTER TYPE public.reaction_type ADD VALUE IF NOT EXISTS 'laughing';
ALTER TYPE public.reaction_type ADD VALUE IF NOT EXISTS 'astonished';
ALTER TYPE public.reaction_type ADD VALUE IF NOT EXISTS 'cry';
ALTER TYPE public.reaction_type ADD VALUE IF NOT EXISTS 'rage';
ALTER TYPE public.reaction_type ADD VALUE IF NOT EXISTS 'hug_face';