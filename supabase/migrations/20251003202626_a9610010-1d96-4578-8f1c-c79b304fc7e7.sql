-- Add INSERT policy: Only admins can assign roles to users
CREATE POLICY "Only admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add UPDATE policy: Only admins can update user roles
CREATE POLICY "Only admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy: Only admins can delete user roles
CREATE POLICY "Only admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));