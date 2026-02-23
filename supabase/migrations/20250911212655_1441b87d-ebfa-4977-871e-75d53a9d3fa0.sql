-- Add relationship fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN relationship_status text,
ADD COLUMN relationship_visibility text DEFAULT 'friends'::text;

-- Add check constraints for relationship fields
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_relationship_status_check 
CHECK (relationship_status IS NULL OR relationship_status IN ('single', 'in_relationship', 'engaged', 'married', 'divorced', 'widowed'));

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_relationship_visibility_check 
CHECK (relationship_visibility IS NULL OR relationship_visibility IN ('public', 'friends', 'private'));

-- Create family_relationships table
CREATE TABLE public.family_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  visibility text NOT NULL DEFAULT 'friends'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure user can't add themselves as family member
  CONSTRAINT no_self_family CHECK (user_id != member_id),
  -- Ensure unique family relationship per user-member pair
  CONSTRAINT unique_family_relationship UNIQUE (user_id, member_id)
);

-- Add check constraint for family relationship visibility
ALTER TABLE public.family_relationships
ADD CONSTRAINT family_relationships_visibility_check 
CHECK (visibility IN ('public', 'friends', 'private'));

-- Add check constraint for relation types
ALTER TABLE public.family_relationships
ADD CONSTRAINT family_relationships_relation_type_check 
CHECK (relation_type IN ('brother', 'sister', 'mother', 'father', 'son', 'daughter', 'grandfather', 'grandmother', 'grandson', 'granddaughter', 'uncle', 'aunt', 'nephew', 'niece', 'cousin', 'husband', 'wife', 'partner', 'stepbrother', 'stepsister', 'stepmother', 'stepfather', 'stepson', 'stepdaughter', 'other'));

-- Enable RLS on family_relationships table
ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_relationships
CREATE POLICY "Users can view family relationships they're involved in"
ON public.family_relationships
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = member_id);

CREATE POLICY "Users can create their own family relationships"
ON public.family_relationships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own family relationships"
ON public.family_relationships
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own family relationships"
ON public.family_relationships
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_family_relationships_updated_at
BEFORE UPDATE ON public.family_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();