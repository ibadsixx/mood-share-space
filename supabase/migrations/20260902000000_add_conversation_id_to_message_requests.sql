-- Link message requests to the conversation + guarantee one pending request per
-- conversation at the database level (concurrency-safe).
--
-- Problem: a sender messaging the same non-friend multiple times before the
-- request is accepted could end up with a distinct Message Request per message
-- (Conversations:1, Message Requests:N). Request creation is triggered client-
-- side on each Send, and a client-side "check then insert" is racy: two almost
-- simultaneous sends can both see no pending request and both insert.
--
-- Fix (idempotent, safe on any host):
--   1. Add an (initially nullable) conversation_id FK to message_requests so a
--      request is tied to the conversation it arose from. Nullable so existing
--      rows (created before this migration) are not invalidated; all new
--      requests set it.
--   2. Add a partial UNIQUE index on conversation_id WHERE status = 'pending'.
--      This is the authoritative dedup: the database rejects any concurrent
--      second pending request for the same conversation (surfacing to the
--      gateway client as 409/23505), so no two pending requests can ever be
--      created no matter how messages race. It does not touch the existing
--      Paying / Maybe-you-know / Spam classification or the accepted/declined/
--      blocked lifecycle.
--   3. Keep the existing UNIQUE(sender_id, receiver_id): it still prevents a
--      second request for the same sender/receiver pair and stops a new
--      pending request after a request was accepted/declined/blocked.
--
-- No data is modified and no new classification system is introduced; the
-- request is still identified by sender/receiver (+ conversation), never by
-- message_id.

DO $do$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'message_requests'
    ) THEN
        -- (1) conversation_id column (nullable for legacy rows).
        ALTER TABLE public.message_requests
            ADD COLUMN IF NOT EXISTS conversation_id uuid
            REFERENCES public.conversations(id) ON DELETE CASCADE;

        -- (2) One pending request per conversation, enforced by the database.
        IF NOT EXISTS (
            SELECT 1 FROM pg_catalog.pg_indexes
            WHERE schemaname = 'public' AND tablename = 'message_requests'
              AND indexname = 'message_requests_pending_conversation_unique'
        ) THEN
            CREATE UNIQUE INDEX message_requests_pending_conversation_unique
                ON public.message_requests (conversation_id)
                WHERE status = 'pending';
        END IF;

        -- Lookup index for the "existing pending request for this conversation
        -- and recipient" check in src/lib/messageRequests.ts.
        IF NOT EXISTS (
            SELECT 1 FROM pg_catalog.pg_indexes
            WHERE schemaname = 'public' AND tablename = 'message_requests'
              AND indexname = 'message_requests_conversation_receiver_idx'
        ) THEN
            CREATE INDEX message_requests_conversation_receiver_idx
                ON public.message_requests (conversation_id, receiver_id);
        END IF;
    END IF;
END $do$;
