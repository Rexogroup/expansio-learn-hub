-- Migration Part 2: Create project management system tables and enums

-- Create project status enum with 8 workflow stages
CREATE TYPE public.project_status AS ENUM (
  'onboarding',
  'tech_setup',
  'scriptwriting',
  'list_building',
  'waiting_warmup',
  'campaign_live',
  'scaling',
  'needs_iterations'
);

-- Create project priority enum
CREATE TYPE public.project_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Create task type enum
CREATE TYPE public.task_type AS ENUM (
  'setup',
  'review',
  'content',
  'technical',
  'communication',
  'other'
);

-- Create task status enum
CREATE TYPE public.task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'blocked'
);

-- Create client_projects table
CREATE TABLE public.client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  status public.project_status NOT NULL DEFAULT 'onboarding',
  priority public.project_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  target_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create project_tasks table
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type public.task_type NOT NULL DEFAULT 'other',
  status public.task_status NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create project_activity_log table
CREATE TABLE public.project_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create project_email_log table
CREATE TABLE public.project_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_email_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_projects
CREATE POLICY "Admins can do everything on projects"
  ON public.client_projects
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can do everything on projects"
  ON public.client_projects
  FOR ALL
  USING (public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Users can view assigned projects"
  ON public.client_projects
  FOR SELECT
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- RLS Policies for project_tasks
CREATE POLICY "Admins can do everything on tasks"
  ON public.project_tasks
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can do everything on tasks"
  ON public.project_tasks
  FOR ALL
  USING (public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Users can view tasks for their projects"
  ON public.project_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_projects
      WHERE id = project_tasks.project_id
      AND (assigned_to = auth.uid() OR created_by = auth.uid())
    )
  );

CREATE POLICY "Users can update their assigned tasks"
  ON public.project_tasks
  FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- RLS Policies for project_activity_log
CREATE POLICY "Admins can view all activity logs"
  ON public.project_activity_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can view all activity logs"
  ON public.project_activity_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Users can view activity logs for their projects"
  ON public.project_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_projects
      WHERE id = project_activity_log.project_id
      AND (assigned_to = auth.uid() OR created_by = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can insert activity logs"
  ON public.project_activity_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for project_email_log
CREATE POLICY "Admins can view all email logs"
  ON public.project_email_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can view all email logs"
  ON public.project_email_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Users can view email logs for their projects"
  ON public.project_email_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_projects
      WHERE id = project_email_log.project_id
      AND (assigned_to = auth.uid() OR created_by = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can insert email logs"
  ON public.project_email_log
  FOR INSERT
  WITH CHECK (auth.uid() = sent_by);

-- Create triggers for updated_at columns
CREATE TRIGGER update_client_projects_updated_at
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();