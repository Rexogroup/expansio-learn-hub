-- Add new columns to synced_campaigns
ALTER TABLE synced_campaigns ADD COLUMN IF NOT EXISTS emails_per_lead integer;
ALTER TABLE synced_campaigns ADD COLUMN IF NOT EXISTS interested_to_meeting_rate decimal(5,2);

-- Add new columns to campaign_variants
ALTER TABLE campaign_variants ADD COLUMN IF NOT EXISTS emails_per_lead integer;

-- Update growth_steps benchmarks based on SOP document
-- Step 4: Testing and Diagnostics - change to 15% positive reply rate
UPDATE growth_steps 
SET benchmark_kpi_value = 15, 
    benchmark_kpi_name = 'positive_reply_rate',
    benchmark_kpi_unit = 'percent'
WHERE step_number = 4;

-- Step 5: Appointment Setting - 20% interested to meeting rate
UPDATE growth_steps 
SET benchmark_kpi_value = 20, 
    benchmark_kpi_name = 'interested_to_meeting_rate',
    benchmark_kpi_unit = 'percent'
WHERE step_number = 5;

-- Step 7: Sales Optimization - 15% close rate
UPDATE growth_steps 
SET benchmark_kpi_value = 15
WHERE step_number = 7;