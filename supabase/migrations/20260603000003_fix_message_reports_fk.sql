-- Align message_reports.reporter_id FK to auth.users for consistency with conversation_reports
-- See L1 in flag-conversation-audit.md

ALTER TABLE public.message_reports
  DROP CONSTRAINT IF EXISTS message_reports_reporter_id_fkey,
  ADD CONSTRAINT message_reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;
