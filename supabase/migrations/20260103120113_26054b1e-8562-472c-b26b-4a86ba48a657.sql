-- Fix the is_team_member function to ONLY check team_members (not teams)
-- This prevents infinite recursion when called from teams policies
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
  )
$$;

-- Drop and recreate the teams SELECT policy with direct checks (no function call that queries teams)
DROP POLICY IF EXISTS "Users can view their own teams" ON public.teams;

CREATE POLICY "Users can view their own teams"
  ON public.teams FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM team_members WHERE team_id = id AND user_id = auth.uid())
  );