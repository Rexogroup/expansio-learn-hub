-- Drop and recreate foreign keys to reference public.profiles instead of auth.users
-- This allows the project management system to work with the profiles table

-- client_projects foreign keys
ALTER TABLE public.client_projects
DROP CONSTRAINT IF EXISTS client_projects_assigned_to_fkey,
DROP CONSTRAINT IF EXISTS client_projects_created_by_fkey;

ALTER TABLE public.client_projects
ADD CONSTRAINT client_projects_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL,
ADD CONSTRAINT client_projects_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE RESTRICT;

-- user_roles foreign keys
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- project_tasks foreign keys
ALTER TABLE public.project_tasks
DROP CONSTRAINT IF EXISTS project_tasks_assigned_to_fkey,
DROP CONSTRAINT IF EXISTS project_tasks_created_by_fkey;

ALTER TABLE public.project_tasks
ADD CONSTRAINT project_tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL,
ADD CONSTRAINT project_tasks_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE RESTRICT;

-- project_activity_log foreign keys
ALTER TABLE public.project_activity_log
DROP CONSTRAINT IF EXISTS project_activity_log_user_id_fkey;

ALTER TABLE public.project_activity_log
ADD CONSTRAINT project_activity_log_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- project_email_log foreign keys
ALTER TABLE public.project_email_log
DROP CONSTRAINT IF EXISTS project_email_log_sent_by_fkey;

ALTER TABLE public.project_email_log
ADD CONSTRAINT project_email_log_sent_by_fkey
  FOREIGN KEY (sent_by)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;