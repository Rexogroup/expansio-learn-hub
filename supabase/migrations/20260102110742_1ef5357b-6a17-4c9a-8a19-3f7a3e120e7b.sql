-- Add new columns to call_analyses table for enhanced analysis
ALTER TABLE public.call_analyses 
ADD COLUMN IF NOT EXISTS crm_overview JSONB,
ADD COLUMN IF NOT EXISTS deal_analysis JSONB,
ADD COLUMN IF NOT EXISTS gap_selling JSONB,
ADD COLUMN IF NOT EXISTS close_confidence INTEGER;