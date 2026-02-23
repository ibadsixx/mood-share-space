-- Create sticker_packs table if it doesn't exist
CREATE TABLE IF NOT EXISTS sticker_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create stickers table if it doesn't exist  
CREATE TABLE IF NOT EXISTS stickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES sticker_packs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  tags TEXT[],
  is_animated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on sticker tables
ALTER TABLE sticker_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sticker_packs (readable by everyone, manageable by admins)
DROP POLICY IF EXISTS "Sticker packs are viewable by everyone" ON sticker_packs;
CREATE POLICY "Sticker packs are viewable by everyone"
  ON sticker_packs FOR SELECT
  USING (true);

-- Create RLS policies for stickers (readable by everyone, manageable by admins)  
DROP POLICY IF EXISTS "Stickers are viewable by everyone" ON stickers;
CREATE POLICY "Stickers are viewable by everyone"
  ON stickers FOR SELECT
  USING (true);

-- Insert default sticker pack with some basic stickers
INSERT INTO sticker_packs (name, description, emoji, is_active)
VALUES ('Default Pack', 'Basic emoticons and reactions', '😊', true)
ON CONFLICT DO NOTHING;