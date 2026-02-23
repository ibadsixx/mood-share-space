-- Create story_views table for detailed analytics
CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Create indexes for story_views
CREATE INDEX idx_story_views_story_id ON story_views(story_id);
CREATE INDEX idx_story_views_viewer_id ON story_views(viewer_id);
CREATE INDEX idx_story_views_viewed_at ON story_views(viewed_at DESC);

-- Enable RLS on story_views
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- Story owners can view who viewed their stories
CREATE POLICY "Story owners can view their story viewers"
  ON story_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_views.story_id
      AND stories.user_id = auth.uid()
    )
  );

-- Authenticated users can record their views
CREATE POLICY "Users can record story views"
  ON story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Create story_highlights table
CREATE TABLE IF NOT EXISTS story_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  cover_image text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create story_highlight_items table
CREATE TABLE IF NOT EXISTS story_highlight_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid NOT NULL REFERENCES story_highlights(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(highlight_id, story_id)
);

-- Create indexes
CREATE INDEX idx_story_highlights_user_id ON story_highlights(user_id);
CREATE INDEX idx_story_highlight_items_highlight_id ON story_highlight_items(highlight_id);
CREATE INDEX idx_story_highlight_items_story_id ON story_highlight_items(story_id);

-- Enable RLS
ALTER TABLE story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_highlight_items ENABLE ROW LEVEL SECURITY;

-- Story highlights policies
CREATE POLICY "Highlights are viewable by everyone"
  ON story_highlights FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own highlights"
  ON story_highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own highlights"
  ON story_highlights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own highlights"
  ON story_highlights FOR DELETE
  USING (auth.uid() = user_id);

-- Story highlight items policies
CREATE POLICY "Highlight items are viewable by everyone"
  ON story_highlight_items FOR SELECT
  USING (true);

CREATE POLICY "Users can add items to their highlights"
  ON story_highlight_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_highlights
      WHERE story_highlights.id = story_highlight_items.highlight_id
      AND story_highlights.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove items from their highlights"
  ON story_highlight_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM story_highlights
      WHERE story_highlights.id = story_highlight_items.highlight_id
      AND story_highlights.user_id = auth.uid()
    )
  );

-- Add trigger to update story_highlights updated_at
CREATE TRIGGER update_story_highlights_updated_at
  BEFORE UPDATE ON story_highlights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Remove expiration constraint from stories to allow highlights
-- Stories will still be hidden from main feed after 24h but preserved for highlights
ALTER TABLE stories ALTER COLUMN expires_at DROP NOT NULL;

-- Add is_highlight flag to stories
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_highlight boolean DEFAULT false;