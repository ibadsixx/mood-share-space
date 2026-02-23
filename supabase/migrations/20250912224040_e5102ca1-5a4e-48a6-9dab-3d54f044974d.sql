-- Enable RLS on profiles_backup table to fix security warning
ALTER TABLE public.profiles_backup ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policy for profiles_backup (this appears to be a backup table)
CREATE POLICY "Profiles backup is only accessible by admins" ON public.profiles_backup
  FOR ALL USING (false); -- Deny all access since this is a backup table