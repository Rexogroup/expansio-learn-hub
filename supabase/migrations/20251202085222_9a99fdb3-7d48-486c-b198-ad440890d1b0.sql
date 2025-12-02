-- Create user_script_profiles table for storing user-specific ICP, services, and pain points
CREATE TABLE public.user_script_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  company_name TEXT,
  company_description TEXT,
  services_offered TEXT,
  target_industries TEXT,
  icp_revenue_range TEXT,
  icp_employee_count TEXT,
  icp_location TEXT,
  icp_tech_stack TEXT,
  icp_additional_details TEXT,
  pain_points JSONB DEFAULT '[]'::jsonb,
  custom_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_script_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own profile
CREATE POLICY "Users can view their own script profile"
ON public.user_script_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own script profile"
ON public.user_script_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own script profile"
ON public.user_script_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own script profile"
ON public.user_script_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all script profiles"
ON public.user_script_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_user_script_profiles_updated_at
BEFORE UPDATE ON public.user_script_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();