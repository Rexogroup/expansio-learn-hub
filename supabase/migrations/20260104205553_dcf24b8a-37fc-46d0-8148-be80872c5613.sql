-- Add historical date tracking and import fields to crm_leads
ALTER TABLE crm_leads 
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS imported_from TEXT,
ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Create import sessions table for audit trail
CREATE TABLE IF NOT EXISTS crm_import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  team_id UUID REFERENCES teams(id) NOT NULL,
  filename TEXT,
  total_rows INT DEFAULT 0,
  imported_count INT DEFAULT 0,
  skipped_duplicates INT DEFAULT 0,
  skipped_errors INT DEFAULT 0,
  field_mapping JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE crm_import_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for import sessions
CREATE POLICY "Users can view own team imports" ON crm_import_sessions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM team_members WHERE team_id = crm_import_sessions.team_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create imports for own teams" ON crm_import_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM team_members WHERE team_id = crm_import_sessions.team_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM teams WHERE id = crm_import_sessions.team_id AND owner_id = auth.uid())
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_crm_leads_closed_at ON crm_leads(closed_at) WHERE closed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_import_batch ON crm_leads(import_batch_id) WHERE import_batch_id IS NOT NULL;