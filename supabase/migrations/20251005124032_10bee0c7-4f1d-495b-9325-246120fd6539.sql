-- Allow unauthenticated users to validate invites by code during signup
CREATE POLICY "Users can view invite by code"
ON public.invites
FOR SELECT
TO anon
USING (
  is_active = true
  AND used_at IS NULL
  AND expires_at > now()
);
