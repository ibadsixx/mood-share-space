-- The Gateway now owns Message Request categorization (messages.md): friends
-- and conversations live in SEPARATE projects, so the previous DB trigger
-- recomputed the category by reading `friends` / `restricted_users` on the
-- conversations host — a cross-project join that is not reliable and can even
-- fail the INSERT.
--
-- This migration makes the trigger fully gateway-compatible:
--   - if the Gateway already supplied a category, it is left untouched
--     (the Gateway classifies on the friends host and is authoritative), and
--   - if NO category was supplied (never expected — the Gateway always sends
--     one), it falls back to the safe, self-contained 'spam' default WITHOUT
--     touching the friends host, so classification can never fail an insert.
--
-- The category is therefore created exactly once (with the first Message
-- Request) and never re-classified per message.

CREATE OR REPLACE FUNCTION public.set_message_request_category()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.category IS NULL THEN
        NEW.category := 'spam';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_message_request_category_trigger ON public.message_requests;
CREATE TRIGGER set_message_request_category_trigger
    BEFORE INSERT ON public.message_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_message_request_category();