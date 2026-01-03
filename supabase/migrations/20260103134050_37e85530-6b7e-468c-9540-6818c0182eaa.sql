-- Update team_members role to allow 'sdr' and 'client' roles
-- First, drop any existing check constraint on role
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;

-- Add new check constraint with sdr and client roles
ALTER TABLE public.team_members ADD CONSTRAINT team_members_role_check 
  CHECK (role IN ('owner', 'admin', 'sdr', 'client', 'member'));

-- Create helper function to get user's role in a team
CREATE OR REPLACE FUNCTION public.get_team_role(_user_id uuid, _team_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.team_members WHERE user_id = _user_id AND team_id = _team_id LIMIT 1),
    (SELECT 'owner' FROM public.teams WHERE id = _team_id AND owner_id = _user_id)
  )
$$;