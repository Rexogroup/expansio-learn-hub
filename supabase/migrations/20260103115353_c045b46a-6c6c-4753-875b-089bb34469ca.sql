-- Create a security definer function that checks team membership
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = _user_id AND team_id = _team_id
  ) OR EXISTS (
    SELECT 1 FROM teams
    WHERE id = _team_id AND owner_id = _user_id
  )
$$;

-- Drop ALL existing problematic policies
DROP POLICY IF EXISTS "Users can view their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON public.teams;

DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can update members" ON public.team_members;
DROP POLICY IF EXISTS "Users can leave or owners can remove members" ON public.team_members;

DROP POLICY IF EXISTS "Team members can view leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Team members can create leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Team members can update leads" ON public.crm_leads;
DROP POLICY IF EXISTS "Team members can delete leads" ON public.crm_leads;

DROP POLICY IF EXISTS "Team members can view lead activities" ON public.crm_lead_activities;
DROP POLICY IF EXISTS "Team members can create lead activities" ON public.crm_lead_activities;

-- TEAMS POLICIES (simple, no recursion)
CREATE POLICY "Users can view their own teams"
  ON public.teams FOR SELECT
  USING (
    owner_id = auth.uid() OR
    public.is_team_member(auth.uid(), id)
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

-- TEAM_MEMBERS POLICIES (no self-reference, only check teams.owner_id)
CREATE POLICY "Users can view team members"
  ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Team owners can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Team owners can update members"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can leave or owners can remove members"
  ON public.team_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

-- CRM_LEADS POLICIES (use security definer function)
CREATE POLICY "Team members can view leads"
  ON public.crm_leads FOR SELECT
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can create leads"
  ON public.crm_leads FOR INSERT
  WITH CHECK (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can update leads"
  ON public.crm_leads FOR UPDATE
  USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can delete leads"
  ON public.crm_leads FOR DELETE
  USING (public.is_team_member(auth.uid(), team_id));

-- CRM_LEAD_ACTIVITIES POLICIES (use security definer function via lead)
CREATE POLICY "Team members can view lead activities"
  ON public.crm_lead_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_lead_activities.lead_id
      AND public.is_team_member(auth.uid(), crm_leads.team_id)
    )
  );

CREATE POLICY "Team members can create lead activities"
  ON public.crm_lead_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_leads
      WHERE crm_leads.id = crm_lead_activities.lead_id
      AND public.is_team_member(auth.uid(), crm_leads.team_id)
    )
  );