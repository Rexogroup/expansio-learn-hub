-- Drop ALL potentially conflicting SELECT policies on teams
DROP POLICY IF EXISTS "Users can view teams they own or are members of" ON public.teams;
DROP POLICY IF EXISTS "Users can view their own teams" ON public.teams;
DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;

-- Drop ALL potentially conflicting SELECT policies on team_members
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.team_members;
DROP POLICY IF EXISTS "Admins can view all team members" ON public.team_members;

-- Create simple, non-recursive policies for teams
-- Policy 1: Users can view teams they own (direct check, no cross-table query)
CREATE POLICY "Users can view owned teams"
  ON public.teams FOR SELECT
  USING (owner_id = auth.uid());

-- Policy 2: Admins can view all teams (uses has_role which checks user_roles, not teams)
CREATE POLICY "Admins can view all teams"
  ON public.teams FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create simple, non-recursive policies for team_members
-- Policy 1: Users can view their own memberships (direct check)
CREATE POLICY "Users can view own memberships"
  ON public.team_members FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Admins can view all team memberships
CREATE POLICY "Admins can view all team members"
  ON public.team_members FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));