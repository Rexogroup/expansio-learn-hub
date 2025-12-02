-- Create table for saved lead magnets
CREATE TABLE public.saved_lead_magnets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  conversation_id UUID REFERENCES public.script_conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_lead_magnets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own saved lead magnets"
ON public.saved_lead_magnets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved lead magnets"
ON public.saved_lead_magnets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved lead magnets"
ON public.saved_lead_magnets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved lead magnets"
ON public.saved_lead_magnets
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all saved lead magnets"
ON public.saved_lead_magnets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_saved_lead_magnets_updated_at
BEFORE UPDATE ON public.saved_lead_magnets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();