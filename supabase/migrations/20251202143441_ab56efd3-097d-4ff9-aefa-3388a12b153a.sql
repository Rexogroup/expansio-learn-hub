
-- Create connection status enum
CREATE TYPE public.connection_status AS ENUM ('pending', 'accepted', 'declined');

-- 1. Service Categories Table (admin-managed categories for agency services)
CREATE TABLE public.service_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on service_categories
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Service categories policies
CREATE POLICY "Authenticated users can view service categories"
ON public.service_categories FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert service categories"
ON public.service_categories FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update service categories"
ON public.service_categories FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete service categories"
ON public.service_categories FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Agency Profiles Table
CREATE TABLE public.agency_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agency_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  website_url TEXT,
  location TEXT,
  timezone TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  open_to_collaborations BOOLEAN NOT NULL DEFAULT true,
  affiliate_commission TEXT,
  whitelabel_pricing TEXT,
  minimum_project_value TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  profile_views INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on agency_profiles
ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;

-- Agency profiles policies
CREATE POLICY "Users can view public agency profiles"
ON public.agency_profiles FOR SELECT
USING (is_public = true OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own agency profile"
ON public.agency_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agency profile"
ON public.agency_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any agency profile"
ON public.agency_profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own agency profile"
ON public.agency_profiles FOR DELETE
USING (auth.uid() = user_id);

-- 3. Agency Services Table (links agencies to service categories)
CREATE TABLE public.agency_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agency_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  service_name TEXT,
  description TEXT,
  pricing_model TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, category_id)
);

-- Enable RLS on agency_services
ALTER TABLE public.agency_services ENABLE ROW LEVEL SECURITY;

-- Agency services policies (based on agency ownership)
CREATE POLICY "Users can view services of public agencies"
ON public.agency_services FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_profiles
    WHERE agency_profiles.id = agency_services.agency_id
    AND (agency_profiles.is_public = true OR agency_profiles.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users can insert services for their own agency"
ON public.agency_services FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agency_profiles
    WHERE agency_profiles.id = agency_services.agency_id
    AND agency_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update services for their own agency"
ON public.agency_services FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.agency_profiles
    WHERE agency_profiles.id = agency_services.agency_id
    AND agency_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete services for their own agency"
ON public.agency_services FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.agency_profiles
    WHERE agency_profiles.id = agency_services.agency_id
    AND agency_profiles.user_id = auth.uid()
  )
);

-- 4. Connections Table
CREATE TABLE public.connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  intro_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  connected_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(requester_id, recipient_id),
  CHECK (requester_id != recipient_id)
);

-- Enable RLS on connections
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Connections policies
CREATE POLICY "Users can view their own connections"
ON public.connections FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create connection requests"
ON public.connections FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update connections they're involved in"
ON public.connections FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can delete their own connection requests"
ON public.connections FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- 5. Direct Conversations Table
CREATE TABLE public.direct_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on direct_conversations
ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;

-- 6. Conversation Participants Table
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Conversation participants policies
CREATE POLICY "Users can view conversations they're part of"
ON public.conversation_participants FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can join conversations"
ON public.conversation_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
ON public.conversation_participants FOR UPDATE
USING (auth.uid() = user_id);

-- Direct conversations policy (based on participation)
CREATE POLICY "Users can view conversations they participate in"
ON public.direct_conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = direct_conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations"
ON public.direct_conversations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Participants can update conversation"
ON public.direct_conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = direct_conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- 7. Direct Messages Table
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on direct_messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Direct messages policies
CREATE POLICY "Users can view messages in their conversations"
ON public.direct_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = direct_messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.direct_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = direct_messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages"
ON public.direct_messages FOR UPDATE
USING (auth.uid() = sender_id);

-- Create indexes for performance
CREATE INDEX idx_agency_profiles_user_id ON public.agency_profiles(user_id);
CREATE INDEX idx_agency_profiles_is_public ON public.agency_profiles(is_public);
CREATE INDEX idx_agency_services_agency_id ON public.agency_services(agency_id);
CREATE INDEX idx_agency_services_category_id ON public.agency_services(category_id);
CREATE INDEX idx_connections_requester_id ON public.connections(requester_id);
CREATE INDEX idx_connections_recipient_id ON public.connections(recipient_id);
CREATE INDEX idx_connections_status ON public.connections(status);
CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX idx_direct_messages_conversation_id ON public.direct_messages(conversation_id);
CREATE INDEX idx_direct_messages_sender_id ON public.direct_messages(sender_id);
CREATE INDEX idx_direct_messages_created_at ON public.direct_messages(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_service_categories_updated_at
BEFORE UPDATE ON public.service_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_profiles_updated_at
BEFORE UPDATE ON public.agency_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_direct_conversations_updated_at
BEFORE UPDATE ON public.direct_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;

-- Insert default service categories
INSERT INTO public.service_categories (name, description, icon, order_index) VALUES
('Lead Generation', 'B2B lead generation and prospecting services', 'Target', 1),
('Cold Email', 'Cold email outreach and campaign management', 'Mail', 2),
('Appointment Setting', 'Booking qualified meetings and demos', 'Calendar', 3),
('Sales Development', 'SDR/BDR services and sales support', 'TrendingUp', 4),
('Marketing', 'Digital marketing and brand strategy', 'Megaphone', 5),
('Web Development', 'Website and web application development', 'Code', 6),
('Design', 'Graphic design, UI/UX, and branding', 'Palette', 7),
('Video Production', 'Video content creation and editing', 'Video', 8),
('Copywriting', 'Sales copy, content writing, and messaging', 'FileText', 9),
('Data Services', 'Data enrichment, validation, and list building', 'Database', 10),
('CRM Setup', 'CRM implementation and automation', 'Settings', 11),
('Consulting', 'Strategy consulting and advisory services', 'Briefcase', 12);
