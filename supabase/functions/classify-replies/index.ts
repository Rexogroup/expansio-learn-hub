import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadReply {
  id: string;
  lead_email: string;
  lead_name: string | null;
  campaign_name: string | null;
  subject: string | null;
  body: string;
  reply_type: string | null;
  sent_response: string | null;
  outcome: string;
  outcome_at: string;
  outcome_notes: string | null;
  received_at: string;
  responded_at: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { reply_id, outcome, outcome_notes } = body;

    if (!reply_id || !outcome) {
      return new Response(
        JSON.stringify({ error: 'reply_id and outcome are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Classifying reply ${reply_id} with outcome: ${outcome}`);

    // Fetch the reply
    const { data: reply, error: replyError } = await supabase
      .from('lead_replies')
      .select('*')
      .eq('id', reply_id)
      .eq('user_id', user.id)
      .single();

    if (replyError || !reply) {
      console.error('Reply not found:', replyError);
      return new Response(
        JSON.stringify({ error: 'Reply not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the reply with outcome
    const { error: updateError } = await supabase
      .from('lead_replies')
      .update({
        outcome,
        outcome_at: new Date().toISOString(),
        outcome_notes: outcome_notes || null,
      })
      .eq('id', reply_id);

    if (updateError) {
      console.error('Failed to update reply:', updateError);
      throw updateError;
    }

    // Auto-capture as asset if outcome is definitive
    let savedAssetId: string | null = null;
    
    if (reply.sent_response && (outcome === 'meeting_booked' || outcome === 'negative' || outcome === 'no_response')) {
      const assetType = outcome === 'meeting_booked' ? 'winning_reply' : 'losing_reply';
      
      // Check if already captured
      const { data: existingAsset } = await supabase
        .from('user_assets')
        .select('id')
        .eq('user_id', user.id)
        .eq('asset_type', assetType)
        .eq('title', `Reply to ${reply.lead_name || reply.lead_email}`)
        .single();

      if (!existingAsset) {
        // Calculate time to outcome if meeting was booked
        let timeToBook: number | null = null;
        if (outcome === 'meeting_booked' && reply.responded_at) {
          const respondedDate = new Date(reply.responded_at);
          const outcomeDate = new Date();
          timeToBook = Math.floor((outcomeDate.getTime() - respondedDate.getTime()) / (1000 * 60 * 60)); // hours
        }

        const assetContent = {
          original_message: reply.body,
          sent_response: reply.sent_response,
          lead_email: reply.lead_email,
          lead_name: reply.lead_name,
          campaign_name: reply.campaign_name,
          reply_type: reply.reply_type,
          subject: reply.subject,
        };

        const performanceData = {
          outcome,
          outcome_notes: outcome_notes || null,
          time_to_book_hours: timeToBook,
          reply_type: reply.reply_type,
          campaign_name: reply.campaign_name,
          classification_reason: outcome === 'meeting_booked' 
            ? 'This reply successfully converted to a booked meeting'
            : outcome === 'negative' 
              ? 'Lead responded negatively after this reply'
              : 'Lead did not respond after 7+ days',
        };

        const { data: newAsset, error: assetError } = await supabase
          .from('user_assets')
          .insert({
            user_id: user.id,
            asset_type: assetType,
            title: `Reply to ${reply.lead_name || reply.lead_email}`,
            content: assetContent,
            performance_data: performanceData,
            status: 'active',
          })
          .select('id')
          .single();

        if (assetError) {
          console.error('Failed to save asset:', assetError);
        } else {
          savedAssetId = newAsset.id;
          console.log(`Saved ${assetType} asset: ${savedAssetId}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        outcome,
        savedAssetId,
        message: savedAssetId 
          ? `Outcome recorded and ${outcome === 'meeting_booked' ? 'winning' : 'losing'} reply saved to AI Learning Vault`
          : 'Outcome recorded',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Classify replies error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
