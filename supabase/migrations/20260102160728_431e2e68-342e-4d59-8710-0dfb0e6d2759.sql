-- Add outcome tracking to lead_replies table
ALTER TABLE public.lead_replies 
ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('meeting_booked', 'positive_response', 'no_response', 'negative', 'pending')),
ADD COLUMN IF NOT EXISTS outcome_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS outcome_notes TEXT;

-- Create index for outcome queries
CREATE INDEX IF NOT EXISTS idx_lead_replies_outcome ON public.lead_replies(outcome);
CREATE INDEX IF NOT EXISTS idx_lead_replies_user_outcome ON public.lead_replies(user_id, outcome);