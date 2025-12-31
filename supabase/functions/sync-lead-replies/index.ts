import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailBisonReply {
  id?: string | number;
  reply_id?: string | number;
  lead_id?: string | number;
  lead_email?: string;
  email?: string;
  from_email?: string;
  lead_name?: string;
  name?: string;
  from_name?: string;
  campaign_id?: string | number;
  campaign_name?: string;
  campaign?: { id?: string | number; name?: string };
  subject?: string;
  body?: string;
  content?: string;
  message?: string;
  text?: string;
  received_at?: string;
  created_at?: string;
  date?: string;
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
    console.log('Raw API response structure:', JSON.stringify(repliesData, null, 2).substring(0, 2000));
    
    const replies: EmailBisonReply[] = repliesData.data || repliesData || [];
    
    // Log first reply to understand the field names
    if (replies[0]) {
      console.log('First reply structure:', JSON.stringify(replies[0], null, 2));
    }
    
    console.log(`Fetched ${replies.length} replies from EmailBison`);

    // Upsert replies into database
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const reply of replies) {
      // Handle possible field name variations
      const externalReplyId = (reply.id?.toString() || reply.reply_id?.toString() || '');
      const leadEmail = (reply.lead_email || reply.email || reply.from_email || '');
      const body = (reply.body || reply.content || reply.message || reply.text || '');
      
      const replyRecord = {
        user_id: user.id,
        external_reply_id: externalReplyId,
        lead_email: leadEmail,
        lead_name: reply.lead_name || reply.name || reply.from_name || null,
        campaign_id: (reply.campaign_id?.toString() || reply.campaign?.id?.toString() || ''),
        campaign_name: reply.campaign_name || reply.campaign?.name || null,
        subject: reply.subject || null,
        body: body,
        received_at: reply.received_at || reply.created_at || reply.date || new Date().toISOString(),
      };
      
      // Log what we're trying to insert
      console.log(`Processing reply ${replyRecord.external_reply_id}: email=${replyRecord.lead_email}, has body=${!!replyRecord.body}`);
      
      // Skip if required fields are missing
      if (!replyRecord.external_reply_id || !replyRecord.lead_email || !replyRecord.body) {
        console.warn(`Skipping reply - missing required fields: id=${replyRecord.external_reply_id}, email=${replyRecord.lead_email}, body=${!!replyRecord.body}`);
        skippedCount++;
        continue;
      }

      const { data: existing } = await supabase
        .from('lead_replies')
        .select('id')
        .eq('user_id', user.id)
        .eq('external_reply_id', replyRecord.external_reply_id)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('lead_replies')
          .update(replyRecord)
          .eq('id', existing.id);

        if (updateError) {
          console.error(`Update error for reply ${replyRecord.external_reply_id}:`, updateError);
        } else {
          updatedCount++;
        }
      } else {
        const { error: insertError } = await supabase
          .from('lead_replies')
          .insert(replyRecord);

        if (insertError) {
          console.error(`Insert error for reply ${replyRecord.external_reply_id}:`, insertError);
          console.log('Failed record:', JSON.stringify(replyRecord));
        } else {
          insertedCount++;
        }
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
