-- Add calendar/scheduling settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS calendar_link TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS default_meeting_duration INTEGER DEFAULT 15;