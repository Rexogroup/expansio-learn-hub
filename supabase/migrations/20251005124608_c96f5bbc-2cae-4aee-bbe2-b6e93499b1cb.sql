-- Remove the overly permissive policy
DROP POLICY IF EXISTS "Users can view invite by code" ON public.invites;

-- Create a secure function to validate a single invite code
-- This prevents attackers from listing all invites
CREATE OR REPLACE FUNCTION public.validate_invite_code(code text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  is_active boolean,
  expires_at timestamptz,
  used_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    invites.id,
    invites.first_name,
    invites.last_name,
    invites.email,
    invites.is_active,
    invites.expires_at,
    invites.used_at
  FROM public.invites
  WHERE invites.invite_code = code
    AND invites.is_active = true
    AND invites.used_at IS NULL
    AND invites.expires_at > now()
  LIMIT 1;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO authenticated;