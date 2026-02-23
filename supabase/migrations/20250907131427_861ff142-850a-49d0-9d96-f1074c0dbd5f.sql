-- Add feeling/activity columns to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS feeling_activity_type text,          -- verb: 'feeling'|'watching'|'listening'|'reading'|'celebrating'|'traveling' etc.
ADD COLUMN IF NOT EXISTS feeling_activity_emoji text,         -- emoji or unicode string for icon
ADD COLUMN IF NOT EXISTS feeling_activity_text text,          -- short caption like 'happy' or 'excited'
ADD COLUMN IF NOT EXISTS feeling_activity_target_id uuid,     -- optional foreign reference (e.g., page, event, song) — nullable
ADD COLUMN IF NOT EXISTS feeling_activity_target_text text;   -- user-visible text (e.g., 'Blinding Lights') if not storing a foreign object