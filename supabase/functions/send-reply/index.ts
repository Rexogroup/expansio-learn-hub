import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
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

    const { reply_id, response_content } = await req.json();

    if (!reply_id || !response_content) {
      return new Response(
        JSON.stringify({ error: 'reply_id and response_content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the reply
    const { data: reply, error: replyError } = await supabase
      .from('lead_replies')
      .select('*')
      .eq('id', reply_id)
      .eq('user_id', user.id)
      .single();

    if (replyError || !reply) {
      return new Response(
        JSON.stringify({ error: 'Reply not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Send reply via EmailBison API
    console.log(`Sending reply to ${reply.lead_email} via EmailBison...`);
    
    const emailBisonResponse = await fetch(
      `https://send.expansio.io/api/replies/${reply.external_reply_id}/reply`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: response_content,
        }),
      }
    );

    if (!emailBisonResponse.ok) {
      const errorText = await emailBisonResponse.text();
      console.error('EmailBison send error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send reply via EmailBison', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the reply status in database
    const { error: updateError } = await supabase
      .from('lead_replies')
      .update({
        status: 'replied',
        sent_response: response_content,
        responded_at: new Date().toISOString(),
      })
      .eq('id', reply_id);

    if (updateError) {
      console.error('Failed to update reply status:', updateError);
    }

    console.log('Reply sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reply sent successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending reply:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
