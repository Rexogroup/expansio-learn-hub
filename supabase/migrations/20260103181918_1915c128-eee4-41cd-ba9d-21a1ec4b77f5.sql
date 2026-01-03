-- Add cold email specific columns to crm_leads
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS platform text,
ADD COLUMN IF NOT EXISTS campaign_name text,
ADD COLUMN IF NOT EXISTS reply_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();

-- Add cold_email_team_id to user_integrations for team assignment
ALTER TABLE user_integrations 
ADD COLUMN IF NOT EXISTS cold_email_team_id uuid REFERENCES teams(id);