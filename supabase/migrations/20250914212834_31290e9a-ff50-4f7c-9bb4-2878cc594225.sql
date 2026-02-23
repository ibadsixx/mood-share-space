-- Get the default pack ID and add some sample stickers
DO $$
DECLARE
    default_pack_id UUID;
BEGIN
    -- Get the default pack ID
    SELECT id INTO default_pack_id FROM sticker_packs WHERE name = 'Default Pack' LIMIT 1;
    
    -- Insert sample stickers if default pack exists
    IF default_pack_id IS NOT NULL THEN
        INSERT INTO stickers (pack_id, name, file_path, file_url, file_type, tags) VALUES
        (default_pack_id, 'Happy Face', 'stickers/happy-face.png', '/src/assets/stickers/happy-face.png', 'png', ARRAY['happy', 'smile', 'emotion']),
        (default_pack_id, 'Thumbs Up', 'stickers/thumbs-up.png', '/src/assets/stickers/thumbs-up.png', 'png', ARRAY['thumbs', 'like', 'approve']),
        (default_pack_id, 'Cat Love', 'stickers/cat-love.png', '/src/assets/stickers/cat-love.png', 'png', ARRAY['cat', 'love', 'heart', 'animal'])
        ON CONFLICT DO NOTHING;
    END IF;
END $$;