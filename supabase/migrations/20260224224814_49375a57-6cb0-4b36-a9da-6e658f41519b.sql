-- Delete existing seed group members first (FK constraint)
DELETE FROM group_members WHERE group_id IN (
  SELECT id FROM groups WHERE name IN ('Tech Enthusiasts', 'Book Club', 'Fitness Warriors', 'Travel Buddies', 'Foodies Unite')
);

-- Delete existing seed groups
DELETE FROM groups WHERE name IN ('Tech Enthusiasts', 'Book Club', 'Fitness Warriors', 'Travel Buddies', 'Foodies Unite');

-- Insert more realistic, diverse groups
INSERT INTO groups (name, description) VALUES
  ('Photography & Visual Arts', 'Share your best shots, get feedback, and learn new techniques from fellow photographers and visual artists.'),
  ('Remote Workers Hub', 'Tips, coworking recommendations, and support for anyone working remotely or as a digital nomad.'),
  ('Startup Founders Network', 'A space for entrepreneurs to share experiences, seek advice, and find collaborators for new ventures.'),
  ('Music Production & DJing', 'Discuss beats, mixing, mastering, and gear. Share your tracks and get constructive feedback.'),
  ('Mental Health & Wellness', 'A supportive community focused on self-care, mindfulness, and mental well-being.'),
  ('Gaming Community', 'From casual mobile games to competitive esports — discuss strategies, find teammates, and share clips.'),
  ('Language Exchange', 'Practice new languages with native speakers. Find conversation partners and share learning resources.'),
  ('Sustainable Living', 'Share eco-friendly tips, zero-waste ideas, and discuss ways to live more sustainably.'),
  ('Film & Cinema Lovers', 'Reviews, recommendations, and deep dives into movies, series, and documentaries from all eras.'),
  ('Open Source Contributors', 'Collaborate on open source projects, share repositories, and help newcomers get started in OSS.');