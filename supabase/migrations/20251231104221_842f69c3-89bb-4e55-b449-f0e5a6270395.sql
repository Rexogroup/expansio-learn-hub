-- Create lead_replies table for storing incoming interested lead replies
CREATE TABLE public.lead_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  external_reply_id TEXT NOT NULL,
  lead_email TEXT NOT NULL,
  lead_name TEXT,
  campaign_id TEXT,
  campaign_name TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'dismissed')),
  reply_type TEXT CHECK (reply_type IN ('interested', 'question', 'objection', 'referral', 'not_interested')),
  ai_draft TEXT,
  sent_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, external_reply_id)
);

-- Create appointment_templates table for user-defined reply templates
CREATE TABLE public.appointment_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reply_type TEXT NOT NULL CHECK (reply_type IN ('interested', 'question', 'objection', 'referral')),
  template_content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_replies
CREATE POLICY "Users can view their own replies"
  ON public.lead_replies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own replies"
  ON public.lead_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies"
  ON public.lead_replies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies"
  ON public.lead_replies FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert replies"
  ON public.lead_replies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all replies"
  ON public.lead_replies FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for appointment_templates
CREATE POLICY "Users can view their own templates"
  ON public.appointment_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
  ON public.appointment_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.appointment_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.appointment_templates FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all templates"
  ON public.appointment_templates FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at triggers
CREATE TRIGGER update_lead_replies_updated_at
  BEFORE UPDATE ON public.lead_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointment_templates_updated_at
  BEFORE UPDATE ON public.appointment_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_lead_replies_user_status ON public.lead_replies(user_id, status);
CREATE INDEX idx_lead_replies_received_at ON public.lead_replies(received_at DESC);
CREATE INDEX idx_appointment_templates_user_type ON public.appointment_templates(user_id, reply_type);