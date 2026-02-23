-- Fix RLS policies for groups
-- Drop existing restrictive policies if any and create comprehensive ones

-- Ensure groups table has RLS enabled
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Drop old policies to recreate them properly
DROP POLICY IF EXISTS "Groups are viewable by everyone" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;

-- Groups: Public read access
CREATE POLICY "public_read_groups" ON groups
  FOR SELECT
  USING (true);

-- Groups: Authenticated users can create
CREATE POLICY "authenticated_create_groups" ON groups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Groups: Only creators/admins can update
CREATE POLICY "creators_update_groups" ON groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- Groups: Only creators/admins can delete
CREATE POLICY "creators_delete_groups" ON groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = groups.id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- Group members policies
DROP POLICY IF EXISTS "Group members are viewable by everyone" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;

CREATE POLICY "public_read_group_members" ON group_members
  FOR SELECT
  USING (true);

CREATE POLICY "users_join_groups" ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_leave_groups" ON group_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert test groups to verify functionality
INSERT INTO groups (name, description) VALUES
  ('Tech Enthusiasts', 'A community for technology lovers and innovators'),
  ('Book Club', 'Share and discuss your favorite books'),
  ('Fitness Warriors', 'Motivation and tips for staying fit and healthy'),
  ('Travel Buddies', 'Connect with fellow travelers and share adventures'),
  ('Foodies Unite', 'Discover and share amazing recipes and restaurants')
ON CONFLICT DO NOTHING;