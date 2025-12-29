-- Create growth_steps table (the 7-step framework)
CREATE TABLE public.growth_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'infrastructure', 'creation', 'testing', 'validation', 'scaling'
  benchmark_kpi_name TEXT,
  benchmark_kpi_value DECIMAL,
  benchmark_kpi_unit TEXT, -- 'percent', 'count', 'boolean'
  required_asset_type TEXT,
  validation_logic JSONB,
  help_content TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_growth_progress table (track user journey)
CREATE TABLE public.user_growth_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  step_id UUID NOT NULL REFERENCES public.growth_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'iteration_needed', 'validated'
  current_kpi_value DECIMAL,
  attempts INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, step_id)
);

-- Create user_assets table (persistent assets with switching costs)
CREATE TABLE public.user_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  asset_type TEXT NOT NULL, -- 'icp', 'offer', 'lead_magnet', 'script', 'campaign_data', 'objection_cluster'
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'draft', -- 'draft', 'testing', 'winning', 'losing', 'archived'
  performance_data JSONB,
  step_id UUID REFERENCES public.growth_steps(id),
  version INTEGER DEFAULT 1,
  parent_asset_id UUID REFERENCES public.user_assets(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.growth_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_growth_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;

-- RLS for growth_steps (everyone can read, admins can manage)
CREATE POLICY "Authenticated users can view growth steps"
  ON public.growth_steps FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert growth steps"
  ON public.growth_steps FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update growth steps"
  ON public.growth_steps FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete growth steps"
  ON public.growth_steps FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for user_growth_progress (users own their progress)
CREATE POLICY "Users can view their own progress"
  ON public.user_growth_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.user_growth_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.user_growth_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.user_growth_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for user_assets (users own their assets)
CREATE POLICY "Users can view their own assets"
  ON public.user_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assets"
  ON public.user_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets"
  ON public.user_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
  ON public.user_assets FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all assets"
  ON public.user_assets FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at triggers
CREATE TRIGGER update_user_growth_progress_updated_at
  BEFORE UPDATE ON public.user_growth_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_assets_updated_at
  BEFORE UPDATE ON public.user_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 7 Growth Steps
INSERT INTO public.growth_steps (step_number, name, description, category, benchmark_kpi_name, benchmark_kpi_value, benchmark_kpi_unit, required_asset_type, help_content, order_index) VALUES
(1, 'Infrastructure Health Check', 'Ensure your email sending infrastructure is properly configured and healthy', 'infrastructure', 'completion_rate', 100, 'percent', 'tech_checklist', 'Verify DNS records, warm-up status, and sending reputation before launching campaigns.', 1),
(2, 'ICP and Offer Creation', 'Define your ideal customer profile and craft a compelling offer', 'creation', 'offer_validated', 1, 'boolean', 'icp_document', 'Your ICP should be specific enough to write personalized copy. Your offer should solve a painful problem.', 2),
(3, 'Lead Magnet Creation', 'Create value-driven lead magnets that attract your ICP', 'creation', 'magnets_created', 3, 'count', 'lead_magnet', 'Create at least 3 lead magnet variants to test different angles and value propositions.', 3),
(4, 'Testing and Diagnostics', 'Launch campaigns and analyze performance against benchmarks', 'testing', 'interested_rate', 1.2, 'percent', 'campaign_data', 'You need at least 1.2% interested rate to have a viable offer. Below this, iterate on your messaging.', 4),
(5, 'Appointment Setting', 'Convert interested prospects into booked meetings', 'validation', 'meeting_rate', 0.5, 'percent', 'appointment_script', 'Focus on quick follow-up and value-driven booking scripts to maximize conversion.', 5),
(6, 'Scaling Path', 'Increase volume while maintaining performance metrics', 'scaling', 'meetings_per_week', 3, 'count', 'scaling_playbook', 'Only scale after you have validated metrics. Aim for 3+ meetings per week consistently.', 6),
(7, 'Sales Optimization', 'Improve close rates and handle objections systematically', 'scaling', 'close_rate', 20, 'percent', 'objection_clusters', 'Analyze call recordings to identify and cluster common objections for better handling.', 7);