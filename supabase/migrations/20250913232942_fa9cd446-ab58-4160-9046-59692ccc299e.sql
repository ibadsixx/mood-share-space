-- Create enum for report reasons
CREATE TYPE public.report_reason AS ENUM ('fake_account', 'harassment', 'inappropriate_content', 'other');

-- Create enum for report status
CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed', 'resolved');

-- Create profile_reports table
CREATE TABLE public.profile_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_user_id UUID NOT NULL,
    reporter_user_id UUID NOT NULL,
    reason public.report_reason NOT NULL,
    description TEXT,
    status public.report_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Add constraint to limit description length
    CONSTRAINT description_length_check CHECK (char_length(description) <= 500),
    
    -- Add unique constraint to prevent duplicate pending reports
    CONSTRAINT unique_pending_report UNIQUE (reported_user_id, reporter_user_id, status) INITIALLY DEFERRED
);

-- Enable RLS on profile_reports
ALTER TABLE public.profile_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for profile_reports
CREATE POLICY "reporter_can_insert" 
ON public.profile_reports 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "reporter_can_view_own_reports" 
ON public.profile_reports 
FOR SELECT 
TO authenticated
USING (auth.uid() = reporter_user_id);

-- For now, let's create a simple admin check - we'll need to enhance this if a proper role system is needed
CREATE POLICY "admin_can_view_all" 
ON public.profile_reports 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (bio ILIKE '%admin%' OR display_name ILIKE '%admin%')
    )
);

CREATE POLICY "admin_can_update_status" 
ON public.profile_reports 
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (bio ILIKE '%admin%' OR display_name ILIKE '%admin%')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (bio ILIKE '%admin%' OR display_name ILIKE '%admin%')
    )
);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_profile_reports_updated_at
    BEFORE UPDATE ON public.profile_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_profile_reports_reported_user ON public.profile_reports(reported_user_id);
CREATE INDEX idx_profile_reports_reporter_user ON public.profile_reports(reporter_user_id);
CREATE INDEX idx_profile_reports_status ON public.profile_reports(status);
CREATE INDEX idx_profile_reports_created_at ON public.profile_reports(created_at DESC);