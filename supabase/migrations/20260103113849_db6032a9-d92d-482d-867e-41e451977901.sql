-- Create teams table for collaboration
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create team members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create CRM leads table with all requested fields
CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  assigned_to uuid REFERENCES public.profiles(id),
  
  -- Lead Info
  lead_name text NOT NULL,
  lead_email text,
  company text,
  linkedin_url text,
  
  -- Outreach Tracking
  first_reach_date date,
  connection_sent boolean DEFAULT false,
  connection_accepted boolean DEFAULT false,
  interested boolean DEFAULT false,
  
  -- Meeting Tracking
  meeting_booked boolean DEFAULT false,
  meeting_datetime timestamptz,
  meeting_status text CHECK (meeting_status IN ('scheduled', 'completed', 'no_show', 'rescheduled')),
  
  -- Deal Tracking
  deal_value numeric,
  proposal_status text DEFAULT 'none' CHECK (proposal_status IN ('none', 'sent', 'viewed', 'negotiating')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'meeting_booked', 'meeting_completed', 'proposal', 'closed_won', 'closed_lost')),
  
  -- Notes
  notes text,
  
  -- Source tracking (for auto-import)
  source_type text, -- 'manual', 'campaign_import', 'lead_reply'
  source_id text, -- reference to original source
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lead activity log table
CREATE TABLE public.crm_lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  activity_type text NOT NULL CHECK (activity_type IN ('note', 'status_change', 'email', 'call', 'meeting', 'assignment', 'created')),
  description text,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_activities ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams they own or are members of"
  ON public.teams FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams"
  ON public.teams FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams"
  ON public.teams FOR DELETE
  USING (owner_id = auth.uid());

-- Team members policies
CREATE POLICY "Team members can view their team's members"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND (teams.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Team owners and admins can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND (teams.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = teams.id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
      ))
    )
  );

CREATE POLICY "Team owners and admins can update members"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND (teams.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = teams.id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
      ))
    )
  );

CREATE POLICY "Team owners and admins can remove members"
  ON public.team_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND (teams.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = teams.id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
      ))
    )
  );

-- CRM leads policies
CREATE POLICY "Team members can view their team's leads"
  ON public.crm_leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = crm_leads.team_id AND team_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = crm_leads.team_id AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create leads"
  ON public.crm_leads FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_members.team_id = crm_leads.team_id AND team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.teams
        WHERE teams.id = crm_leads.team_id AND teams.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can update leads"
  ON public.crm_leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = crm_leads.team_id AND team_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = crm_leads.team_id AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete leads"
  ON public.crm_leads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = crm_leads.team_id AND team_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = crm_leads.team_id AND teams.owner_id = auth.uid()
    )
  );

-- Lead activities policies
CREATE POLICY "Team members can view lead activities"
  ON public.crm_lead_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crm_leads
      JOIN public.team_members ON team_members.team_id = crm_leads.team_id
      WHERE crm_leads.id = crm_lead_activities.lead_id AND team_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.crm_leads
      JOIN public.teams ON teams.id = crm_leads.team_id
      WHERE crm_leads.id = crm_lead_activities.lead_id AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create lead activities"
  ON public.crm_lead_activities FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM public.crm_leads
        JOIN public.team_members ON team_members.team_id = crm_leads.team_id
        WHERE crm_leads.id = crm_lead_activities.lead_id AND team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.crm_leads
        JOIN public.teams ON teams.id = crm_leads.team_id
        WHERE crm_leads.id = crm_lead_activities.lead_id AND teams.owner_id = auth.uid()
      )
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for crm_leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;