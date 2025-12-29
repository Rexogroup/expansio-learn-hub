-- Drop the old constraint that blocks timeline-specific records
ALTER TABLE synced_campaigns 
DROP CONSTRAINT IF EXISTS synced_campaigns_user_id_external_campaign_id_platform_key;

-- Drop existing constraint to recreate with platform included
ALTER TABLE synced_campaigns
DROP CONSTRAINT IF EXISTS synced_campaigns_user_campaign_timeline_unique;

-- Create proper unique constraint including all relevant columns
ALTER TABLE synced_campaigns 
ADD CONSTRAINT synced_campaigns_user_platform_campaign_timeline_unique 
UNIQUE (user_id, platform, external_campaign_id, timeline_days);