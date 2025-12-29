-- Add meetings_tag_id and meetings_tag_name to user_integrations
ALTER TABLE public.user_integrations 
ADD COLUMN IF NOT EXISTS meetings_tag_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meetings_tag_name TEXT DEFAULT NULL;