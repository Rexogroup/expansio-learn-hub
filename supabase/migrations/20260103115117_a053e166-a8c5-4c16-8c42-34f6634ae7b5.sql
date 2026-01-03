-- Drop existing team_members policies that cause infinite recursion
DROP POLICY IF EXISTS "Team members can view their team's members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and admins can remove members" ON public.team_members;

-- Recreate with non-recursive logic
-- SELECT: Users can see members of teams they own OR their own membership row
CREATE POLICY "Users can view team members"
  ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- INSERT: Only team owners can add members (using teams table, not team_members)
CREATE POLICY "Team owners can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- UPDATE: Only team owners can update members
CREATE POLICY "Team owners can update members"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- DELETE: Users can leave (delete own row) OR team owners can remove anyone
CREATE POLICY "Users can leave or owners can remove members"
  ON public.team_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    )
  );