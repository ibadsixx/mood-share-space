-- Drop the existing constraint FIRST
ALTER TABLE comment_reactions DROP CONSTRAINT IF EXISTS comment_reactions_emoji_check;

-- Update existing emoji data to new format
UPDATE comment_reactions SET emoji = 'red_heart' WHERE emoji = '❤️';
UPDATE comment_reactions SET emoji = 'ok' WHERE emoji = '👍';
UPDATE comment_reactions SET emoji = 'laughing' WHERE emoji = '😆';
UPDATE comment_reactions SET emoji = 'astonished' WHERE emoji = '😮';
UPDATE comment_reactions SET emoji = 'cry' WHERE emoji = '😢';
UPDATE comment_reactions SET emoji = 'rage' WHERE emoji = '😡';

-- Add new constraint that accepts the text-based reaction keys
ALTER TABLE comment_reactions 
ADD CONSTRAINT comment_reactions_emoji_check 
CHECK (emoji IN ('ok', 'red_heart', 'laughing', 'astonished', 'cry', 'rage', 'hug_face'));