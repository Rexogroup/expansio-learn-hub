-- Create script_conversations table to store chat sessions
CREATE TABLE public.script_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create script_messages table for chat history
CREATE TABLE public.script_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.script_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create generated_scripts table to save finalized lead magnets
CREATE TABLE public.generated_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.script_conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  icp_details JSONB,
  services TEXT,
  pain_points JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.script_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_scripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for script_conversations
CREATE POLICY "Users can view their own conversations"
ON public.script_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
ON public.script_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.script_conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.script_conversations FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations"
ON public.script_conversations FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for script_messages
CREATE POLICY "Users can view messages in their conversations"
ON public.script_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.script_conversations
    WHERE id = script_messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their conversations"
ON public.script_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.script_conversations
    WHERE id = script_messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all messages"
ON public.script_messages FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for generated_scripts
CREATE POLICY "Users can view their own scripts"
ON public.generated_scripts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scripts"
ON public.generated_scripts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scripts"
ON public.generated_scripts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scripts"
ON public.generated_scripts FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all scripts"
ON public.generated_scripts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for conversations
CREATE TRIGGER update_script_conversations_updated_at
BEFORE UPDATE ON public.script_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for scripts
CREATE TRIGGER update_generated_scripts_updated_at
BEFORE UPDATE ON public.generated_scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();