import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailBisonReply {
  id: string;
  lead_id: string;
  lead_email: string;
  lead_name?: string;
  campaign_id: string;
  campaign_name?: string;
  subject?: string;
  body: string;
  received_at: string;
  is_interested?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's EmailBison integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'emailbison')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'No active EmailBison integration found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch replies from EmailBison API
    console.log('Fetching replies from EmailBison API...');
    const emailBisonResponse = await fetch('https://send.expansio.io/api/replies?filter=interested', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${integration.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!emailBisonResponse.ok) {
      const errorText = await emailBisonResponse.text();
      console.error('EmailBison API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch replies from EmailBison', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const repliesData = await emailBisonResponse.json();
    const replies: EmailBisonReply[] = repliesData.data || repliesData || [];
    
    console.log(`Fetched ${replies.length} replies from EmailBison`);

    // Upsert replies into database
    let insertedCount = 0;
    let updatedCount = 0;

    for (const reply of replies) {
      const { data: existing } = await supabase
        .from('lead_replies')
        .select('id')
        .eq('user_id', user.id)
        .eq('external_reply_id', reply.id)
        .single();

      const replyRecord = {
        user_id: user.id,
        external_reply_id: reply.id,
        lead_email: reply.lead_email,
        lead_name: reply.lead_name || null,
        campaign_id: reply.campaign_id,
        campaign_name: reply.campaign_name || null,
        subject: reply.subject || null,
        body: reply.body,
        received_at: reply.received_at,
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('lead_replies')
          .update(replyRecord)
          .eq('id', existing.id);

        if (!updateError) updatedCount++;
      } else {
        const { error: insertError } = await supabase
          .from('lead_replies')
          .insert(replyRecord);

        if (!insertError) insertedCount++;
      }
    }

    console.log(`Sync complete: ${insertedCount} inserted, ${updatedCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: replies.length,
        inserted: insertedCount,
        updated: updatedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing replies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
