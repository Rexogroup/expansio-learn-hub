-- Create copilot_conversations table for storing chat conversations
CREATE TABLE public.copilot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users can manage own conversations" ON public.copilot_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create copilot_messages table for storing messages in conversations
CREATE TABLE public.copilot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.copilot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for user access (through conversation ownership)
CREATE POLICY "Users can manage messages in own conversations" ON public.copilot_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.copilot_conversations WHERE id = copilot_messages.conversation_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.copilot_conversations WHERE id = copilot_messages.conversation_id AND user_id = auth.uid())
  );

-- Create copilot_memory table for storing user's business memory
CREATE TABLE public.copilot_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  website_url TEXT,
  company_name TEXT,
  business_description TEXT,
  awards_achievements TEXT,
  outreach_goal TEXT,
  customer_profiles JSONB DEFAULT '[]'::jsonb,
  extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.copilot_memory ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users can manage own memory" ON public.copilot_memory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_copilot_conversations_updated_at
  BEFORE UPDATE ON public.copilot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_copilot_memory_updated_at
  BEFORE UPDATE ON public.copilot_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_copilot_conversations_user_id ON public.copilot_conversations(user_id);
CREATE INDEX idx_copilot_messages_conversation_id ON public.copilot_messages(conversation_id);
CREATE INDEX idx_copilot_memory_user_id ON public.copilot_memory(user_id);