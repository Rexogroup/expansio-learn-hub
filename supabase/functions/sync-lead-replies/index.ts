import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailBisonReply {
  id: number;
  uuid?: string;
  folder?: string;
  subject?: string;
  from_name?: string;
  from_email_address?: string;
  text_body?: string;
  html_body?: string;
  date_received?: string;
  campaign_id?: number | null;
  campaign_name?: string | null;
  lead_id?: number | null;
  lead_company?: string | null;
  type?: string;
  interested?: boolean;
  automated_reply?: boolean;
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
      .select('*, cold_email_team_id')
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

    const coldEmailTeamId = integration.cold_email_team_id;

    // Fetch replies from EmailBison API with pagination
    console.log('Fetching interested inbox replies from EmailBison API...');
    let allReplies: EmailBisonReply[] = [];
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      console.log(`Fetching page ${currentPage}...`);
      
      const emailBisonResponse = await fetch(
        `https://send.expansio.io/api/replies?status=interested&folder=inbox&page=${currentPage}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${integration.api_key}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!emailBisonResponse.ok) {
        const errorText = await emailBisonResponse.text();
        console.error('EmailBison API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch replies from EmailBison', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const repliesData = await emailBisonResponse.json();
      const pageReplies: EmailBisonReply[] = repliesData.data || [];
      allReplies = [...allReplies, ...pageReplies];
      
      console.log(`Page ${currentPage}: fetched ${pageReplies.length} replies`);
      
      // Check if there's a next page
      hasNextPage = repliesData.links?.next !== null && repliesData.links?.next !== undefined;
      currentPage++;
      
      // Safety limit to prevent infinite loops
      if (currentPage > 100) {
        console.warn('Reached maximum page limit (100), stopping pagination');
        break;
      }
    }

    // Filter to only interested, non-automated replies (safety check)
    // Also exclude known system/bounce email addresses
    const bounceDomains = [
      'mailer-daemon',
      'postmaster',
      'noreply',
      'no-reply',
      'mail-daemon',
      'mailerdaemon',
      'bounce'
    ];
    
    const replies = allReplies.filter(reply => {
      // Must be marked as interested
      if (reply.interested !== true) return false;
      
      // Must not be an automated reply
      if (reply.automated_reply === true) return false;
      
      // Exclude known system/bounce email addresses
      const email = (reply.from_email_address || '').toLowerCase();
      if (bounceDomains.some(domain => email.includes(domain))) {
        console.log(`Skipping system/bounce email: ${email}`);
        return false;
      }
      
      return true;
    });
    
    console.log(`Fetched ${allReplies.length} total replies across all pages, ${replies.length} are interested (non-automated)`);

    // Upsert replies into database
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let crmLeadsCreated = 0;

    for (const reply of replies) {
      // Use correct field names from EmailBison API
      const externalReplyId = reply.id?.toString() || '';
      const leadEmail = reply.from_email_address || '';
      const body = reply.text_body || reply.html_body || '';
      
      const replyRecord = {
        user_id: user.id,
        external_reply_id: externalReplyId,
        lead_email: leadEmail,
        lead_name: reply.from_name || null,
        campaign_id: reply.campaign_id?.toString() || null,
        campaign_name: reply.campaign_name || null,
        subject: reply.subject || null,
        body: body,
        received_at: reply.date_received || new Date().toISOString(),
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

      let replyId: string | null = null;
      let isNewReply = false;

      if (existing) {
        const { error: updateError } = await supabase
          .from('lead_replies')
          .update(replyRecord)
          .eq('id', existing.id);

        if (updateError) {
          console.error(`Update error for reply ${replyRecord.external_reply_id}:`, updateError);
        } else {
          updatedCount++;
          replyId = existing.id;
        }
      } else {
        const { data: insertedReply, error: insertError } = await supabase
          .from('lead_replies')
          .insert(replyRecord)
          .select('id')
          .single();

        if (insertError) {
          console.error(`Insert error for reply ${replyRecord.external_reply_id}:`, insertError);
          console.log('Failed record:', JSON.stringify(replyRecord));
        } else {
          insertedCount++;
          replyId = insertedReply?.id || null;
          isNewReply = true;
        }
      }

      // AUTO-CREATE/UPDATE CRM LEAD for new replies
      if (coldEmailTeamId && replyId) {
        try {
          // Check if CRM lead already exists for this email in this team
          const { data: existingLead } = await supabase
            .from('crm_leads')
            .select('id, reply_count')
            .eq('team_id', coldEmailTeamId)
            .eq('lead_email', leadEmail)
            .eq('source_type', 'cold_email')
            .maybeSingle();

          if (existingLead) {
            // Only update if this is a new reply we just inserted
            if (isNewReply) {
              await supabase
                .from('crm_leads')
                .update({
                  reply_count: (existingLead.reply_count || 1) + 1,
                  last_activity_at: new Date().toISOString(),
                })
                .eq('id', existingLead.id);
              
              console.log(`Updated CRM lead ${existingLead.id} - reply count: ${(existingLead.reply_count || 1) + 1}`);
            }
          } else {
            // Create new CRM lead
            const { error: crmError } = await supabase
              .from('crm_leads')
              .insert({
                team_id: coldEmailTeamId,
                created_by: user.id,
                lead_name: reply.from_name || 'Unknown',
                lead_email: leadEmail,
                company: reply.lead_company || null,
                source_type: 'cold_email',
                source_id: replyId,
                platform: 'emailbison',
                campaign_name: reply.campaign_name || null,
                status: 'interested',
                interested: true,
                reply_count: 1,
                last_activity_at: new Date().toISOString(),
              });

            if (crmError) {
              console.error('Error creating CRM lead:', crmError);
            } else {
              crmLeadsCreated++;
              console.log(`Created CRM lead for ${leadEmail}`);
            }
          }
        } catch (crmErr) {
          console.error('Error in CRM lead creation:', crmErr);
        }
      }
    }

    console.log(`Sync complete: ${insertedCount} inserted, ${updatedCount} updated, ${crmLeadsCreated} CRM leads created`);

    return new Response(
      JSON.stringify({
        success: true,
        totalFetched: allReplies.length,
        synced: replies.length,
        inserted: insertedCount,
        updated: updatedCount,
        skipped: skippedCount,
        crmLeadsCreated: crmLeadsCreated,
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