-- Add step_type column to onboarding_steps table
ALTER TABLE public.onboarding_steps 
ADD COLUMN step_type text DEFAULT 'document';

-- Add comment for clarity
COMMENT ON COLUMN public.onboarding_steps.step_type IS 'Type of step: video, document, intake_form';