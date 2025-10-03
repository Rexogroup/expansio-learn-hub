-- Create sales_calls table
CREATE TABLE public.sales_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER,
  tags TEXT[],
  industry TEXT,
  deal_size TEXT,
  key_moments JSONB,
  notes TEXT,
  is_featured BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create sales_call_progress table
CREATE TABLE public.sales_call_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  call_id UUID NOT NULL REFERENCES public.sales_calls(id) ON DELETE CASCADE,
  watched BOOLEAN DEFAULT false,
  watched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, call_id)
);

-- Enable Row Level Security
ALTER TABLE public.sales_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_call_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_calls
CREATE POLICY "Anyone can view published sales calls"
ON public.sales_calls
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert sales calls"
ON public.sales_calls
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sales calls"
ON public.sales_calls
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sales calls"
ON public.sales_calls
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for sales_call_progress
CREATE POLICY "Users can view own progress"
ON public.sales_call_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.sales_call_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.sales_call_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on sales_calls
CREATE TRIGGER update_sales_calls_updated_at
BEFORE UPDATE ON public.sales_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on sales_call_progress
CREATE TRIGGER update_sales_call_progress_updated_at
BEFORE UPDATE ON public.sales_call_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for sales call recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('sales-calls', 'sales-calls', true);

-- Storage policies for sales-calls bucket
CREATE POLICY "Sales call recordings are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'sales-calls');

CREATE POLICY "Admins can upload sales call recordings"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'sales-calls' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sales call recordings"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'sales-calls' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sales call recordings"
ON storage.objects
FOR DELETE
USING (bucket_id = 'sales-calls' AND has_role(auth.uid(), 'admin'::app_role));