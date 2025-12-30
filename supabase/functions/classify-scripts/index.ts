import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignVariant {
  id: string;
  user_id: string;
  campaign_id: string;
  campaign_name: string | null;
  step_number: number;
  variant_id: string;
  variant_label: string | null;
  subject_line: string | null;
  emails_sent: number;
  unique_replies: number;
  interested_count: number;
  meetings_booked: number;
  reply_rate: number | null;
  interested_rate: number | null;
  emails_per_lead: number | null;
  timeline_days: number | null;
  raw_data: {
    step?: {
      email_body?: string;
      email_subject?: string;
    };
  } | null;
}

// Extract clean text from HTML email body
function extractCleanBody(htmlBody: string | undefined): string {
  if (!htmlBody) return '';
  return htmlBody
    .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
    .replace(/\{[^}]+\|[^}]+\}/g, (m) => m.split('|')[0].replace('{', '')) // Clean spintax, take first option
    .replace(/\{FIRST_NAME\}/g, '[Name]')
    .replace(/\{SENDER_EMAIL_SIGNATURE\}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .trim()
    .substring(0, 2000);                // Limit length for storage
}

interface ClassificationResult {
  action: 'SCALE' | 'ITERATE' | 'KILL';
  reason: string;
}

// Classification thresholds based on SOP
const MIN_EMAILS_FOR_CLASSIFICATION = 1000;
const WINNING_IR_THRESHOLD = 15; // IR% >= 15% = winning
const WINNING_EPL_THRESHOLD = 500; // emails_per_lead < 500 = efficient
const LOSING_IR_THRESHOLD = 5; // IR% < 5% = losing
const LOSING_EPL_THRESHOLD = 1000; // emails_per_lead > 1000 = inefficient

// Smart calculation of emails_per_lead when NULL
function calculateEPL(variant: CampaignVariant): number {
  if (variant.emails_per_lead !== null && variant.emails_per_lead !== undefined) {
    return variant.emails_per_lead;
  }
  // Calculate from interested_count if available
  if (variant.interested_count > 0) {
    return Math.round(variant.emails_sent / variant.interested_count);
  }
  return Infinity;
}

function classifyVariant(variant: CampaignVariant): ClassificationResult | null {
  // Not enough data to classify
  if (variant.emails_sent < MIN_EMAILS_FOR_CLASSIFICATION) {
    return null;
  }

  const ir = variant.interested_rate ?? 0;
  const epl = calculateEPL(variant); // Smart EPL calculation

  console.log(`Classifying ${variant.variant_label || variant.variant_id}: IR=${ir.toFixed(1)}%, EPL=${epl} (raw EPL=${variant.emails_per_lead})`);

  // WINNING (SCALE): IR >= 15% AND emails_per_lead < 500
  if (ir >= WINNING_IR_THRESHOLD && epl < WINNING_EPL_THRESHOLD) {
    return {
      action: 'SCALE',
      reason: `Interested rate ${ir.toFixed(1)}% (≥${WINNING_IR_THRESHOLD}%) and ${epl} emails/lead (<${WINNING_EPL_THRESHOLD})`
    };
  }

  // LOSING (KILL): IR < 5% OR emails_per_lead > 1000
  if (ir < LOSING_IR_THRESHOLD || epl > LOSING_EPL_THRESHOLD) {
    const reasons: string[] = [];
    if (ir < LOSING_IR_THRESHOLD) {
      reasons.push(`Low IR ${ir.toFixed(1)}% (<${LOSING_IR_THRESHOLD}%)`);
    }
    if (epl > LOSING_EPL_THRESHOLD) {
      reasons.push(`High EPL ${epl} (>${LOSING_EPL_THRESHOLD})`);
    }
    return {
      action: 'KILL',
      reason: reasons.join(' and ')
    };
  }

  // ITERATE: Everything in between
  return {
    action: 'ITERATE',
    reason: `IR ${ir.toFixed(1)}% and ${epl} emails/lead - needs optimization`
  };
}

// Select the best timeline variant for classification (prefer 30 days if available with sufficient data)
function selectBestVariantForClassification(variants: CampaignVariant[]): CampaignVariant | null {
  // Group by variant_id
  const byVariantId = new Map<string, CampaignVariant[]>();
  for (const v of variants) {
    const existing = byVariantId.get(v.variant_id) || [];
    existing.push(v);
    byVariantId.set(v.variant_id, existing);
  }

  // For each unique variant, pick the best timeline
  const bestVariants: CampaignVariant[] = [];
  
  for (const [variantId, timelineVariants] of byVariantId) {
    // Sort by timeline_days ascending (30, 60, 120)
    timelineVariants.sort((a, b) => (a.timeline_days || 999) - (b.timeline_days || 999));
    
    // Prefer 30-day data if it has enough volume
    const thirtyDay = timelineVariants.find(v => v.timeline_days === 30 && v.emails_sent >= MIN_EMAILS_FOR_CLASSIFICATION);
    if (thirtyDay) {
      bestVariants.push(thirtyDay);
      continue;
    }
    
    // Fall back to 60-day
    const sixtyDay = timelineVariants.find(v => v.timeline_days === 60 && v.emails_sent >= MIN_EMAILS_FOR_CLASSIFICATION);
    if (sixtyDay) {
      bestVariants.push(sixtyDay);
      continue;
    }
    
    // Last resort: any timeline with sufficient data
    const anyValid = timelineVariants.find(v => v.emails_sent >= MIN_EMAILS_FOR_CLASSIFICATION);
    if (anyValid) {
      bestVariants.push(anyValid);
    }
  }

  return bestVariants.length > 0 ? bestVariants[0] : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Classifying scripts for user: ${user_id}`);

    // Fetch all variants with 1000+ emails for this user
    // Order by timeline_days to prefer shorter time windows (more recent data)
    const { data: allVariants, error: variantsError } = await supabase
      .from('campaign_variants')
      .select('*')
      .eq('user_id', user_id)
      .gte('emails_sent', MIN_EMAILS_FOR_CLASSIFICATION)
      .order('timeline_days', { ascending: true });

    if (variantsError) {
      console.error('Error fetching variants:', variantsError);
      throw variantsError;
    }

    if (!allVariants || allVariants.length === 0) {
      console.log('No variants with sufficient data found');
      return new Response(
        JSON.stringify({ success: true, message: 'No variants with sufficient data', saved: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${allVariants.length} variant records with 1000+ emails`);

    // Group variants by variant_id and select best timeline for each
    const variantMap = new Map<string, CampaignVariant>();
    for (const v of allVariants as CampaignVariant[]) {
      const existing = variantMap.get(v.variant_id);
      // Prefer shorter timeline (30 > 60 > 120) as it's more recent
      if (!existing || (v.timeline_days || 999) < (existing.timeline_days || 999)) {
        variantMap.set(v.variant_id, v);
      }
    }
    
    const variants = Array.from(variantMap.values());
    console.log(`Selected ${variants.length} unique variants for classification (best timeline per variant)`);

    // Fetch existing captured assets to avoid duplicates
    const { data: existingAssets } = await supabase
      .from('user_assets')
      .select('source_variant_id, source_timeline_days')
      .eq('user_id', user_id)
      .in('asset_type', ['winning_script', 'losing_script'])
      .not('source_variant_id', 'is', null);

    const existingSet = new Set(
      (existingAssets || []).map(a => `${a.source_variant_id}-${a.source_timeline_days}`)
    );

    console.log(`Found ${existingSet.size} existing captured scripts`);

    let savedCount = 0;
    const results: Array<{ variant_id: string; classification: string; saved: boolean }> = [];

    for (const variant of variants) {
      const key = `${variant.variant_id}-${variant.timeline_days}`;
      
      // Skip if already captured
      if (existingSet.has(key)) {
        results.push({ variant_id: variant.variant_id, classification: 'SKIPPED', saved: false });
        continue;
      }

      const classification = classifyVariant(variant as CampaignVariant);
      
      // Only save SCALE (winning) or KILL (losing) - skip ITERATE
      if (classification && (classification.action === 'SCALE' || classification.action === 'KILL')) {
        const assetType = classification.action === 'SCALE' ? 'winning_script' : 'losing_script';
        const title = `${variant.campaign_name || 'Campaign'} - ${variant.variant_label || `Step ${variant.step_number}`}`;

        // Extract email body from raw_data
        const emailBody = extractCleanBody(variant.raw_data?.step?.email_body);
        
        const { error: insertError } = await supabase
          .from('user_assets')
          .insert({
            user_id: user_id,
            asset_type: assetType,
            title: title,
            content: JSON.stringify({
              subject_line: variant.subject_line,
              email_body: emailBody,
              campaign_name: variant.campaign_name,
              step_number: variant.step_number,
              variant_label: variant.variant_label,
              variant_id: variant.variant_id,
            }),
            performance_data: {
              emails_sent: variant.emails_sent,
              unique_replies: variant.unique_replies,
              interested_count: variant.interested_count,
              meetings_booked: variant.meetings_booked,
              reply_rate: variant.reply_rate,
              interested_rate: variant.interested_rate,
              emails_per_lead: calculateEPL(variant), // Use calculated EPL
              emails_per_lead_raw: variant.emails_per_lead, // Store original for reference
              classification: classification.action,
              classification_reason: classification.reason,
              captured_at: new Date().toISOString(),
            },
            source_variant_id: variant.variant_id,
            source_timeline_days: variant.timeline_days,
            status: 'active',
          });

        if (insertError) {
          // Handle unique constraint violation gracefully
          if (insertError.code === '23505') {
            console.log(`Duplicate detected for variant ${variant.variant_id}, skipping`);
            results.push({ variant_id: variant.variant_id, classification: classification.action, saved: false });
          } else {
            console.error(`Error inserting asset for variant ${variant.variant_id}:`, insertError);
          }
        } else {
          console.log(`Saved ${assetType} for variant ${variant.variant_id}: ${title}`);
          savedCount++;
          results.push({ variant_id: variant.variant_id, classification: classification.action, saved: true });
        }
      } else {
        results.push({ 
          variant_id: variant.variant_id, 
          classification: classification?.action || 'INSUFFICIENT_DATA', 
          saved: false 
        });
      }
    }

    console.log(`Classification complete: ${savedCount} new scripts saved`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        variants_analyzed: variants.length,
        scripts_saved: savedCount,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Classification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
