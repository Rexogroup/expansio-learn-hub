-- Add status_changed_at column to crm_leads for accurate KPI timeline attribution
ALTER TABLE public.crm_leads 
ADD COLUMN status_changed_at TIMESTAMPTZ;

-- Add a comment explaining its purpose
COMMENT ON COLUMN public.crm_leads.status_changed_at IS 
  'Timestamp when the current status was set. Used for accurate KPI timeline attribution from imported CRM data.';