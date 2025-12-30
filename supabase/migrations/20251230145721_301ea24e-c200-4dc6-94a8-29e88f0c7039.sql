-- Create email_account_alerts table for tracking at-risk accounts
CREATE TABLE public.email_account_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sender_email_id TEXT NOT NULL,
  email_address TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  current_value NUMERIC,
  threshold_value NUMERIC,
  recommended_action TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, sender_email_id, alert_type)
);

-- Add new columns to email_account_health table
ALTER TABLE public.email_account_health 
ADD COLUMN IF NOT EXISTS bounce_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS health_score NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS is_at_risk BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bounced_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS emails_sent_count INTEGER DEFAULT 0;

-- Enable RLS on email_account_alerts
ALTER TABLE public.email_account_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_account_alerts
CREATE POLICY "Users can view their own alerts"
ON public.email_account_alerts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
ON public.email_account_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.email_account_alerts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
ON public.email_account_alerts
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger for email_account_alerts
CREATE TRIGGER update_email_account_alerts_updated_at
BEFORE UPDATE ON public.email_account_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();