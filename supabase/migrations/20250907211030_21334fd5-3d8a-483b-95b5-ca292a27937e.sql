-- Create locations table for reusable places
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,           -- e.g. 'mapbox', 'google', 'osm', 'custom'
  provider_place_id text,           -- provider's place id (nullable for custom)
  name text NOT NULL,
  display_address text,
  latitude double precision,
  longitude double precision,
  city text,
  region text,
  country text,
  country_code text,
  slug text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Add location fields to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id),
ADD COLUMN IF NOT EXISTS location_name text,
ADD COLUMN IF NOT EXISTS location_address text,
ADD COLUMN IF NOT EXISTS location_lat double precision,
ADD COLUMN IF NOT EXISTS location_lng double precision,
ADD COLUMN IF NOT EXISTS location_provider text;

-- Enable RLS on locations table
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for locations
CREATE POLICY "Locations are viewable by everyone" 
ON locations FOR SELECT 
USING (true);

CREATE POLICY "Users can create locations" 
ON locations FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own locations" 
ON locations FOR UPDATE 
USING (auth.uid() = created_by);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_locations_provider_place_id ON locations(provider, provider_place_id);
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_posts_location_id ON posts(location_id);
CREATE INDEX IF NOT EXISTS idx_posts_location_coordinates ON posts(location_lat, location_lng);

-- Create updated_at trigger for locations
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();