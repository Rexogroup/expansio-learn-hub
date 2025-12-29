import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  tag?: {
    id: number | string;
    name: string;
  };
  lead?: {
    id: number | string;
    email?: string;
    lead_campaign_data?: Array<{
      campaign_id: number;
    }>;
  };
  timestamp?: string;
  workspace_id?: number | string;
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

    // Only process tag_attached events
    if (payload.event !== 'tag_attached') {
      console.log(`Ignoring event type: ${payload.event}`);
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'not tag_attached event' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.tag?.id || !payload.lead?.id) {
      console.log('Missing tag or lead data');
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'missing tag or lead data' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tagId = payload.tag.id.toString();
    console.log(`Tag attached event: tag_id=${tagId}, tag_name=${payload.tag.name}`);

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

    // Extract campaign ID from lead data
    let campaignId: string | null = null;
    if (payload.lead.lead_campaign_data && payload.lead.lead_campaign_data.length > 0) {
      campaignId = payload.lead.lead_campaign_data[0].campaign_id?.toString() || null;
    }

    // Store the meeting event for each matching user
    const insertPromises = integrations.map(async (integration) => {
      const { error: insertError } = await supabase
        .from('meeting_tag_events')
        .insert({
          user_id: integration.user_id,
          lead_id: payload.lead!.id.toString(),
          lead_email: payload.lead!.email || null,
          campaign_id: campaignId,
          tag_id: tagId,
          tag_name: payload.tag!.name,
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
        lead_id: payload.lead.id,
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
