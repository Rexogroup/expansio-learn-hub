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

function classifyVariant(variant: CampaignVariant): ClassificationResult | null {
  // Not enough data to classify
  if (variant.emails_sent < MIN_EMAILS_FOR_CLASSIFICATION) {
    return null;
  }

  const ir = variant.interested_rate ?? 0;
  const epl = variant.emails_per_lead ?? Infinity;

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
    const { data: variants, error: variantsError } = await supabase
      .from('campaign_variants')
      .select('*')
      .eq('user_id', user_id)
      .gte('emails_sent', MIN_EMAILS_FOR_CLASSIFICATION);

    if (variantsError) {
      console.error('Error fetching variants:', variantsError);
      throw variantsError;
    }

    if (!variants || variants.length === 0) {
      console.log('No variants with sufficient data found');
      return new Response(
        JSON.stringify({ success: true, message: 'No variants with sufficient data', saved: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${variants.length} variants with 1000+ emails`);

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

        const { error: insertError } = await supabase
          .from('user_assets')
          .insert({
            user_id: user_id,
            asset_type: assetType,
            title: title,
            content: JSON.stringify({
              subject_line: variant.subject_line,
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
              emails_per_lead: variant.emails_per_lead,
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
