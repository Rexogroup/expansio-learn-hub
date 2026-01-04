-- Fix: Expand interested_to_meeting_rate column to handle extreme conversion rates
-- Previous DECIMAL(5,2) had max value of 999.99, causing overflow errors when rates exceed 1000%

ALTER TABLE public.synced_campaigns 
ALTER COLUMN interested_to_meeting_rate TYPE DECIMAL(7,2);