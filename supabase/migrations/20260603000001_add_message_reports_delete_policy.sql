-- Add DELETE policy for message_reports to match conversation_reports
-- See H1 in flag-conversation-audit.md

CREATE POLICY "Users can delete their own message reports"
ON public.message_reports FOR DELETE
USING (reporter_id = auth.uid());
