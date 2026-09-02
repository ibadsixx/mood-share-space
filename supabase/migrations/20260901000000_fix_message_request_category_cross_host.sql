-- Make message_requests classification trigger cross-host safe.
--
-- Problem: message_requests lives in the conversations host, but the
-- set_message_request_category BEFORE INSERT trigger references
-- public.friends, public.restricted_users and public.get_mutual_friends_count
-- — tables that live only in the users host. The original migration created the
-- trigger via a PL/pgSQL function (validated at runtime), so it exists on the
-- conversations host too but aborts every INSERT when its classifier runs with
-- missing tables/functions. Result: a first message to a non-friend never
-- registered a Pending Message Request and the recipient never saw
-- Accept / Reject / Block.
--
-- Fix (all idempotent, safe on any host):
--   1. Recreate determine_request_category (SQL, so it validates at CREATE
--      time) ONLY on hosts that actually have friends + restricted_users, and
--      fix its parameter-shadowing bug: the pending-friend check compared
--      public.friends.receiver_id to itself (always true) instead of to the
--      function's receiver_id argument. A table alias does not hide the
--      table's own unqualified column names (and out-of-scope resolution into
--      scalar subqueries follows the enclosing query), so the parameters are
--      renamed to be collision-free.
--   2. Recreate the PL/pgSQL trigger function with a pg_catalog guard so it only
--      calls the classifier when its dependencies exist in the same database.
--      On the conversations host it never runs, so inserts succeed and the
--      client-set category (or the spam default) is preserved.
--   3. Re-create the trigger only where the message_requests table exists.
--
-- No data is modified and no new classification system is introduced: client
-- and server share the same Maybe-you-know / Spam semantics.

-- (1) Fix determine_request_category, skipping hosts that lack the tables the
-- SQL body references (SQL functions are validated at CREATE time, so this
-- cannot run on the conversations host). The parameters are renamed (DROP +
-- CREATE, since CREATE OR REPLACE cannot rename input parameters) so they
-- cannot collide with the friends columns: a table alias does not hide the
-- table's own unqualified column names nor block out-of-scope resolution
-- inside scalar subqueries, so the original body's `receiver_id = receiver_id`
-- resolved both sides to friends.receiver_id and matched any pending row sent
-- by the sender regardless of its receiver. All callers use positional
-- arguments, so the rename is transparent.
DO $do$
BEGIN
    IF EXISTS (
            SELECT 1 FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = 'friends'
        )
        AND EXISTS (
            SELECT 1 FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = 'restricted_users'
        )
    THEN
        DROP FUNCTION IF EXISTS public.determine_request_category(uuid, uuid);
        CREATE FUNCTION public.determine_request_category(p_sender_id uuid, p_receiver_id uuid)
        RETURNS message_request_category AS $fn$
            SELECT CASE
                WHEN EXISTS (
                    SELECT 1 FROM public.restricted_users ru
                    WHERE ru.user_id = p_receiver_id AND ru.restricted_user_id = p_sender_id
                ) THEN 'spam'::message_request_category
                WHEN public.get_mutual_friends_count(p_sender_id, p_receiver_id) > 0 THEN 'you_may_know'::message_request_category
                WHEN EXISTS (
                    SELECT 1 FROM public.friends f
                    WHERE f.status = 'pending'
                    AND f.requester_id = p_sender_id AND f.receiver_id = p_receiver_id
                ) THEN 'you_may_know'::message_request_category
                ELSE 'spam'::message_request_category
            END;
        $fn$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
    END IF;
END $do$;

-- (2) Recreate the trigger function so it only calls the classifier when its
-- dependencies exist in the same database. PL/pgSQL bodies are validated at
-- runtime, so this is safe to (re)create on any host.
CREATE OR REPLACE FUNCTION public.set_message_request_category()
RETURNS TRIGGER AS $fn$
DECLARE
    has_friends boolean;
    has_restricted boolean;
BEGIN
    IF NEW.category IS NULL OR NEW.category = 'spam' THEN
        SELECT EXISTS (
            SELECT 1 FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = 'friends'
        ) INTO has_friends;

        SELECT EXISTS (
            SELECT 1 FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = 'restricted_users'
        ) INTO has_restricted;

        IF has_friends AND has_restricted THEN
            NEW.category := public.determine_request_category(NEW.sender_id, NEW.receiver_id);
        ELSIF NEW.category IS NULL THEN
            NEW.category := 'spam';
        END IF;
    END IF;
    RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

-- (3) Re-create the trigger only where the message_requests table exists.
DO $do$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'message_requests'
    ) THEN
        DROP TRIGGER IF EXISTS set_message_request_category_trigger ON public.message_requests;
        CREATE TRIGGER set_message_request_category_trigger
            BEFORE INSERT ON public.message_requests
            FOR EACH ROW
            EXECUTE FUNCTION public.set_message_request_category();
    END IF;
END $do$;