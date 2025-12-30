-- Add columns to user_assets to track script source and prevent duplicates
ALTER TABLE public.user_assets 
ADD COLUMN IF NOT EXISTS source_variant_id TEXT,
ADD COLUMN IF NOT EXISTS source_timeline_days INTEGER,
ADD COLUMN IF NOT EXISTS performance_data JSONB;

-- Create a unique index to prevent duplicate script captures
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_assets_script_source 
ON public.user_assets (user_id, source_variant_id, source_timeline_days) 
WHERE source_variant_id IS NOT NULL;