-- Add RLS policy to allow users to mark their own invite as used
CREATE POLICY "Users can mark their own invite as used"
ON public.invites
FOR UPDATE
TO authenticated
USING (
  auth.uid() = used_by 
  OR 
  auth.email() = email
)
WITH CHECK (
  auth.uid() = used_by 
  OR 
  auth.email() = email
);