-- Create pinned_messages table
CREATE TABLE public.pinned_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, conversation_id)
);

-- Create message_reports table
CREATE TABLE public.message_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for pinned_messages
CREATE POLICY "Users can view pinned messages in their conversations"
  ON public.pinned_messages FOR SELECT
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "Users can pin messages in their conversations"
  ON public.pinned_messages FOR INSERT
  WITH CHECK (public.is_conversation_participant(conversation_id) AND pinned_by = auth.uid());

CREATE POLICY "Users can unpin messages they pinned"
  ON public.pinned_messages FOR DELETE
  USING (pinned_by = auth.uid() OR public.is_conversation_participant(conversation_id));

-- RLS policies for message_reports
CREATE POLICY "Users can view their own reports"
  ON public.message_reports FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports for messages in their conversations"
  ON public.message_reports FOR INSERT
  WITH CHECK (public.is_conversation_participant(conversation_id) AND reporter_id = auth.uid());

-- Add indexes for performance
CREATE INDEX idx_pinned_messages_conversation ON public.pinned_messages(conversation_id);
CREATE INDEX idx_pinned_messages_message ON public.pinned_messages(message_id);
CREATE INDEX idx_message_reports_conversation ON public.message_reports(conversation_id);
CREATE INDEX idx_message_reports_reporter ON public.message_reports(reporter_id);