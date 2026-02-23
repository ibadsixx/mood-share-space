-- Create editor_projects table for video editing projects
CREATE TABLE IF NOT EXISTS public.editor_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  project_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'rendering', 'done', 'failed')),
  output_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries by owner
CREATE INDEX IF NOT EXISTS idx_editor_projects_owner_id ON public.editor_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_editor_projects_status ON public.editor_projects(status);

-- Enable RLS
ALTER TABLE public.editor_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own projects
CREATE POLICY "Users can view their own projects"
  ON public.editor_projects
  FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own projects"
  ON public.editor_projects
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own projects"
  ON public.editor_projects
  FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own projects"
  ON public.editor_projects
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_editor_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_editor_projects_updated_at
  BEFORE UPDATE ON public.editor_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_editor_projects_updated_at();

-- Comment for documentation
COMMENT ON TABLE public.editor_projects IS 'Stores video editing project data including timeline, tracks, clips, effects, and export settings';