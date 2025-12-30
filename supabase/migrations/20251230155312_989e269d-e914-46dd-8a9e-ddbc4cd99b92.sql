-- Create campaign_variants table for A/B variant-level tracking
CREATE TABLE public.campaign_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  step_number INTEGER NOT NULL,
  variant_id TEXT NOT NULL,
  variant_label TEXT,
  subject_line TEXT,
  is_active BOOLEAN DEFAULT true,
  emails_sent INTEGER DEFAULT 0,
  unique_replies INTEGER DEFAULT 0,
  interested_count INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  reply_rate NUMERIC DEFAULT 0,
  interested_rate NUMERIC DEFAULT 0,
  timeline_days INTEGER,
  raw_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, campaign_id, variant_id, step_number, timeline_days)
);

-- Enable RLS
ALTER TABLE public.campaign_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own variants"
  ON public.campaign_variants
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own variants"
  ON public.campaign_variants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own variants"
  ON public.campaign_variants
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own variants"
  ON public.campaign_variants
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all variants"
  ON public.campaign_variants
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_campaign_variants_user_campaign ON public.campaign_variants(user_id, campaign_id);
CREATE INDEX idx_campaign_variants_timeline ON public.campaign_variants(user_id, timeline_days);