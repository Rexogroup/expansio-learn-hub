-- Add deal outcome tracking to call_analyses table
ALTER TABLE public.call_analyses
ADD COLUMN IF NOT EXISTS deal_outcome TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deal_closed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deal_value NUMERIC DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.call_analyses.deal_outcome IS 'Outcome of the deal: won, lost, or pending';
COMMENT ON COLUMN public.call_analyses.deal_closed_at IS 'When the deal was closed';
COMMENT ON COLUMN public.call_analyses.deal_value IS 'Value of the closed deal';