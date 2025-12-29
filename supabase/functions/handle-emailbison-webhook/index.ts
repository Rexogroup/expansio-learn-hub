import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event?: {
    type: string;
    name?: string;
    workspace_id?: number | string;
  };
  data?: {
    tag_id: number | string;
    tag_name: string;
    taggable_id: number | string;
    taggable_type: string;
    lead_id?: number | string;
    lead_email?: string;
    campaign_id?: number | string;
  };
  timestamp?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('EmailBison webhook received');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload));

    // Determine event type from nested event object
    const eventType = payload.event?.type || '';
    
    // Only process TAG_ATTACHED events
    if (eventType !== 'TAG_ATTACHED') {
      console.log(`Ignoring event type: ${eventType}`);
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'not TAG_ATTACHED event' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a Lead tag (not Campaign or other)
    if (payload.data?.taggable_type !== 'Lead') {
      console.log(`Ignoring non-lead tag: taggable_type=${payload.data?.taggable_type}`);
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'not a lead tag' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract tag and lead info from data object
    const tagId = payload.data?.tag_id?.toString();
    const tagName = payload.data?.tag_name || null;
    const leadId = payload.data?.taggable_id?.toString();
    const campaignId = payload.data?.campaign_id?.toString() || null;
    const leadEmail = payload.data?.lead_email || null;

    if (!tagId || !leadId) {
      console.log('Missing tag_id or lead_id in data');
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'missing tag or lead data' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Tag attached event: tag_id=${tagId}, tag_name=${tagName}, lead_id=${leadId}`);

    // Find all users who have this tag configured as their meetings tag
    const { data: integrations, error: integrationsError } = await supabase
      .from('user_integrations')
      .select('user_id, meetings_tag_id, meetings_tag_name')
      .eq('platform', 'emailbison')
      .eq('is_active', true)
      .eq('meetings_tag_id', tagId);

    if (integrationsError) {
      console.error('Error finding integrations:', integrationsError);
      return new Response(
        JSON.stringify({ status: 'error', error: integrationsError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integrations || integrations.length === 0) {
      console.log(`No users configured with meetings_tag_id=${tagId}`);
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'no matching integration found for this tag' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${integrations.length} user(s) with this meetings tag configured`);

    // Store the meeting event for each matching user
    const insertPromises = integrations.map(async (integration) => {
      const { error: insertError } = await supabase
        .from('meeting_tag_events')
        .insert({
          user_id: integration.user_id,
          lead_id: leadId,
          lead_email: leadEmail,
          campaign_id: campaignId,
          tag_id: tagId,
          tag_name: tagName,
          tagged_at: payload.timestamp || new Date().toISOString(),
          raw_payload: payload,
        });

      if (insertError) {
        console.error(`Error inserting meeting event for user ${integration.user_id}:`, insertError);
        return { user_id: integration.user_id, success: false, error: insertError.message };
      }

      console.log(`Stored meeting event for user ${integration.user_id}`);
      return { user_id: integration.user_id, success: true };
    });

    const results = await Promise.all(insertPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Meeting event stored for ${successCount}/${integrations.length} users`);

    return new Response(
      JSON.stringify({ 
        status: 'stored', 
        users_updated: successCount,
        lead_id: leadId,
        tag_id: tagId,
        campaign_id: campaignId 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
