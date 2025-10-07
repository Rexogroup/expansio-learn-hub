-- Create onboarding_steps table
CREATE TABLE public.onboarding_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT,
  google_doc_url TEXT,
  template_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_onboarding_progress table
CREATE TABLE public.user_onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, step_number)
);

-- Enable RLS
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_steps
CREATE POLICY "Authenticated users can view onboarding steps"
  ON public.onboarding_steps
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert onboarding steps"
  ON public.onboarding_steps
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update onboarding steps"
  ON public.onboarding_steps
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete onboarding steps"
  ON public.onboarding_steps
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_onboarding_progress
CREATE POLICY "Users can view their own onboarding progress"
  ON public.user_onboarding_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding progress"
  ON public.user_onboarding_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress"
  ON public.user_onboarding_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding progress"
  ON public.user_onboarding_progress
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at on onboarding_steps
CREATE TRIGGER update_onboarding_steps_updated_at
  BEFORE UPDATE ON public.onboarding_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on user_onboarding_progress
CREATE TRIGGER update_user_onboarding_progress_updated_at
  BEFORE UPDATE ON public.user_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial onboarding steps
INSERT INTO public.onboarding_steps (step_number, title, description, google_doc_url, order_index) VALUES
(1, 'ICP Details & Pain Points', 'Fill out the Google Doc template with your Ideal Customer Profile details and pain points. This information will help us create tailored offers for your outbound campaigns.', 'https://docs.google.com/document/d/your-template-id/edit', 1);

INSERT INTO public.onboarding_steps (step_number, title, description, video_url, order_index) VALUES
(2, 'Scriptwriting Process', 'Watch this introductory video to understand how we handle the scriptwriting process for your campaigns.', '', 2);

INSERT INTO public.onboarding_steps (step_number, title, description, template_url, order_index) VALUES
(3, 'Appointment Setting Templates', 'Customize the appointment setting templates with your personal data to allow us to properly handle the appointment setting process.', '', 3);

INSERT INTO public.onboarding_steps (step_number, title, description, order_index) VALUES
(4, 'Complete Onboarding', 'Congratulations! You have completed the onboarding process. You can now access all platform resources.', 4);