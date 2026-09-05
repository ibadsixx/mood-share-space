-- Hardening: a message request can only ever be accepted (or resolved) by an
-- explicit write from the request's RECIPIENT. This migration adds a DB-level
-- guarantee on top of the RLS policy ("Receiver can update request status"):
--
--   1) sender_id / receiver_id are immutable once created (a write that swaps
--      the participants or re-points a resolved row cannot flip status).
--   2) a resolved request (accepted / declined / blocked) is LOCKED — the status
--      can never change once resolved. This is the anti-regression: after an
--      accept, the row can never silently be re-accepted or re-opened to pending.
--   3) only legitimate transitions may occur:
--        pending  -> accepted | declined | blocked
--      no other source state may move the row.
--
-- In short: the ONLY legal writes are pending -> accepted (the explicit Accept
-- click), pending -> declined (Delete), pending -> blocked (Block). Nothing else
-- can mutate the row's status, and the sender/receiver pairing is fixed forever.

CREATE OR REPLACE FUNCTION public.enforce_message_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Participants are immutable on the row: swapping them or re-pointing a
    -- resolved row is always rejected.
    IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id THEN
        RAISE EXCEPTION 'message_requests participants are immutable';
    END IF;

    -- Allow non-status column writes (e.g. category reclassification) that
    -- leave the status untouched.
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    -- The only legal transition is pending -> accepted | declined | blocked.
    IF OLD.status = 'pending'
       AND NEW.status IN ('accepted', 'declined', 'blocked') THEN
        RETURN NEW;
    END IF;

    -- Everything else (re-accept, un-decline, un-block, pending -> pending,
    -- resolved -> pending, resolved -> resolved) is forbidden.
    RAISE EXCEPTION 'invalid message_requests status transition: % -> %',
        OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS enforce_message_request_status_trigger ON public.message_requests;
CREATE TRIGGER enforce_message_request_status_trigger
    BEFORE UPDATE ON public.message_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_message_request_status();
