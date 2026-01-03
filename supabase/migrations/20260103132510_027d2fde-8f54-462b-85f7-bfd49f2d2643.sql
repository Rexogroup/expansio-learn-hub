-- Create message templates table for teams
CREATE TABLE public.crm_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'custom',
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add calendly_link to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calendly_link TEXT;

-- Enable RLS
ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for message templates
CREATE POLICY "Team members can view their team templates"
ON public.crm_message_templates FOR SELECT
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can create templates"
ON public.crm_message_templates FOR INSERT
WITH CHECK (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can update their team templates"
ON public.crm_message_templates FOR UPDATE
USING (public.is_team_member(auth.uid(), team_id));

CREATE POLICY "Template creators can delete their templates"
ON public.crm_message_templates FOR DELETE
USING (created_by = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_crm_message_templates_updated_at
BEFORE UPDATE ON public.crm_message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();