-- Assign admin role to the current user
INSERT INTO public.user_roles (user_id, role)
VALUES ('63c9717b-65c1-4ae1-95dc-2b7666f70ee7', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;