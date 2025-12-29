-- User integrations table for storing API credentials
CREATE TABLE public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instantly', 'emailbison')),
  api_key TEXT NOT NULL,
  workspace_id TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Synced campaigns from external platforms
CREATE TABLE public.synced_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  external_campaign_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instantly', 'emailbison')),
  campaign_name TEXT,
  campaign_status TEXT,
  emails_sent INTEGER DEFAULT 0,
  unique_opens INTEGER DEFAULT 0,
  unique_replies INTEGER DEFAULT 0,
  interested_count INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  bounces INTEGER DEFAULT 0,
  unsubscribes INTEGER DEFAULT 0,
  open_rate DECIMAL,
  reply_rate DECIMAL,
  interested_rate DECIMAL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB,
  UNIQUE(user_id, external_campaign_id, platform)
);

-- Daily aggregated metrics for trend tracking
CREATE TABLE public.daily_campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_emails_sent INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  total_replies INTEGER DEFAULT 0,
  total_interested INTEGER DEFAULT 0,
  total_meetings INTEGER DEFAULT 0,
  open_rate DECIMAL,
  reply_rate DECIMAL,
  interested_rate DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS on all tables
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_campaign_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_integrations
CREATE POLICY "Users can view their own integration"
  ON public.user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integration"
  ON public.user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integration"
  ON public.user_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integration"
  ON public.user_integrations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all integrations"
  ON public.user_integrations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for synced_campaigns
CREATE POLICY "Users can view their own campaigns"
  ON public.synced_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns"
  ON public.synced_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON public.synced_campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON public.synced_campaigns FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all campaigns"
  ON public.synced_campaigns FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for daily_campaign_metrics
CREATE POLICY "Users can view their own metrics"
  ON public.daily_campaign_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON public.daily_campaign_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
  ON public.daily_campaign_metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all metrics"
  ON public.daily_campaign_metrics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger to user_integrations
CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();