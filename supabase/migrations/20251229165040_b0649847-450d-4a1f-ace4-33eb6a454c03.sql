-- Add timeline_days column to synced_campaigns to store period-specific data
ALTER TABLE public.synced_campaigns 
ADD COLUMN IF NOT EXISTS timeline_days INTEGER DEFAULT NULL;

-- Drop the existing unique constraint if it exists
ALTER TABLE public.synced_campaigns 
DROP CONSTRAINT IF EXISTS synced_campaigns_external_campaign_id_key;

-- Create a new unique constraint that includes timeline_days
-- This allows storing separate records for each time period per campaign per user
ALTER TABLE public.synced_campaigns
ADD CONSTRAINT synced_campaigns_user_campaign_timeline_unique 
UNIQUE (user_id, external_campaign_id, timeline_days);

-- Create index for efficient timeline queries
CREATE INDEX IF NOT EXISTS idx_synced_campaigns_timeline 
ON public.synced_campaigns(user_id, timeline_days);