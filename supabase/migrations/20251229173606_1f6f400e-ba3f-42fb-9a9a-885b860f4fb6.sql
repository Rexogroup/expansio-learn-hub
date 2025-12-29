-- Create table to store meeting tag attachment events from webhooks
CREATE TABLE public.meeting_tag_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id TEXT NOT NULL,
  lead_email TEXT,
  campaign_id TEXT,
  tag_id TEXT NOT NULL,
  tag_name TEXT,
  tagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient date-range queries
CREATE INDEX idx_meeting_events_user_date ON public.meeting_tag_events(user_id, tagged_at DESC);
CREATE INDEX idx_meeting_events_campaign ON public.meeting_tag_events(user_id, campaign_id);
CREATE INDEX idx_meeting_events_tag ON public.meeting_tag_events(user_id, tag_id);

-- Enable RLS
ALTER TABLE public.meeting_tag_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own meeting events
CREATE POLICY "Users can view own meeting events" ON public.meeting_tag_events
  FOR SELECT USING (auth.uid() = user_id);

-- Allow inserts from service role (edge function uses service role)
CREATE POLICY "Service role can insert meeting events" ON public.meeting_tag_events
  FOR INSERT WITH CHECK (true);