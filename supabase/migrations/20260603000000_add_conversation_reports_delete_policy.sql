-- Add DELETE policy for conversation_reports to allow re-reporting
-- See C1 in flag-conversation-audit.md: the hook deletes before every insert
-- to allow re-reporting with a different reason, but the policy was missing.

CREATE POLICY "Users can delete their own conversation reports"
ON public.conversation_reports FOR DELETE
USING (auth.uid() = reporter_id);
