-- Insert sample stickers for the existing packs
-- Update existing stickers with proper file URLs pointing to the actual sticker assets

-- Update existing stickers to use the actual sticker images from assets
UPDATE stickers 
SET file_url = CASE 
  WHEN name = 'Happy Face' THEN '/src/assets/stickers/happy-face.png'
  WHEN name = 'Thumbs Up' THEN '/src/assets/stickers/thumbs-up.png'
  WHEN name = 'Cat Love' THEN '/src/assets/stickers/cat-love.png'
  ELSE file_url
END,
file_path = CASE 
  WHEN name = 'Happy Face' THEN 'assets/stickers/happy-face.png'
  WHEN name = 'Thumbs Up' THEN 'assets/stickers/thumbs-up.png'  
  WHEN name = 'Cat Love' THEN 'assets/stickers/cat-love.png'
  ELSE file_path
END,
file_type = 'image/png',
file_size = 10240
WHERE name IN ('Happy Face', 'Thumbs Up', 'Cat Love');

-- Add more sample stickers for testing (using placeholder URLs that would be replaced with actual uploads)
INSERT INTO stickers (pack_id, name, file_path, file_url, file_type, file_size, is_animated, tags)
SELECT 
  sp.id,
  sticker_name,
  'assets/stickers/' || LOWER(REPLACE(sticker_name, ' ', '-')) || '.png',
  '/placeholder-sticker-' || LOWER(REPLACE(sticker_name, ' ', '-')) || '.png',
  'image/png',
  8192,
  false,
  ARRAY[tag]
FROM sticker_packs sp
CROSS JOIN (
  VALUES 
    ('Love Eyes', 'emotion'),
    ('Wink', 'emotion'), 
    ('Laughing', 'emotion'),
    ('Cool', 'emotion'),
    ('Surprised', 'emotion')
) AS new_stickers(sticker_name, tag)
WHERE sp.name = 'Default'
AND NOT EXISTS (
  SELECT 1 FROM stickers s 
  WHERE s.pack_id = sp.id 
  AND s.name = sticker_name
);

-- Add animal stickers
INSERT INTO stickers (pack_id, name, file_path, file_url, file_type, file_size, is_animated, tags)
SELECT 
  sp.id,
  sticker_name,
  'assets/stickers/' || LOWER(REPLACE(sticker_name, ' ', '-')) || '.png',
  '/placeholder-sticker-' || LOWER(REPLACE(sticker_name, ' ', '-')) || '.png',
  'image/png',
  8192,
  false,
  ARRAY[tag]
FROM sticker_packs sp
CROSS JOIN (
  VALUES 
    ('Dog Happy', 'animal'),
    ('Bear Hug', 'animal'),
    ('Bunny Kiss', 'animal'),
    ('Fox Wink', 'animal'),
    ('Panda Sleep', 'animal')
) AS new_stickers(sticker_name, tag)
WHERE sp.name = 'Animals'
AND NOT EXISTS (
  SELECT 1 FROM stickers s 
  WHERE s.pack_id = sp.id 
  AND s.name = sticker_name
);

-- Add reaction stickers  
INSERT INTO stickers (pack_id, name, file_path, file_url, file_type, file_size, is_animated, tags)
SELECT 
  sp.id,
  sticker_name,
  'assets/stickers/' || LOWER(REPLACE(sticker_name, ' ', '-')) || '.png',
  '/placeholder-sticker-' || LOWER(REPLACE(sticker_name, ' ', '-')) || '.png',
  'image/png',
  8192,
  false,
  ARRAY[tag]
FROM sticker_packs sp
CROSS JOIN (
  VALUES 
    ('Fire', 'reaction'),
    ('Clap', 'reaction'),
    ('Heart Eyes', 'reaction'),
    ('Mind Blown', 'reaction'),
    ('Chef Kiss', 'reaction')
) AS new_stickers(sticker_name, tag)
WHERE sp.name = 'Reactions'
AND NOT EXISTS (
  SELECT 1 FROM stickers s 
  WHERE s.pack_id = sp.id 
  AND s.name = sticker_name
);