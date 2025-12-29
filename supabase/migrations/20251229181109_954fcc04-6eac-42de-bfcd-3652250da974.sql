-- Create table for email account health monitoring
CREATE TABLE public.email_account_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sender_email_id TEXT NOT NULL,
  email_address TEXT NOT NULL,
  account_type TEXT, -- 'google', 'microsoft', 'smtp'
  connection_status TEXT, -- 'connected', 'disconnected', 'error'
  warmup_enabled BOOLEAN DEFAULT false,
  warmup_progress INTEGER, -- percentage 0-100
  daily_limit INTEGER DEFAULT 0,
  emails_sent_today INTEGER DEFAULT 0,
  mx_records_valid BOOLEAN,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, sender_email_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_email_health_user ON public.email_account_health(user_id);
CREATE INDEX idx_email_health_status ON public.email_account_health(user_id, connection_status);

-- Enable RLS
ALTER TABLE public.email_account_health ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own email health" ON public.email_account_health
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email health" ON public.email_account_health
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email health" ON public.email_account_health
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email health" ON public.email_account_health
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_email_account_health_updated_at
  BEFORE UPDATE ON public.email_account_health
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();