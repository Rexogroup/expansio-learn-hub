import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Known bounce/system email domains to filter out
const BOUNCE_DOMAINS = [
  'mailer-daemon',
  'postmaster',
  'noreply',
  'no-reply',
  'mail-daemon',
  'mailerdaemon',
  'bounce'
];

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

    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload));

    // Determine event type from nested event object
    const eventType = payload.event?.type || '';
    
    // Route to appropriate handler based on event type
    if (eventType === 'LEAD_INTERESTED') {
      return await handleLeadInterested(supabase, payload);
    } else if (eventType === 'TAG_ATTACHED') {
      return await handleTagAttached(supabase, payload);
    } else {
      console.log(`Ignoring event type: ${eventType}`);
      return new Response(
        JSON.stringify({ status: 'ignored', reason: `unsupported event type: ${eventType}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Handler for LEAD_INTERESTED events - real-time interested reply sync
async function handleLeadInterested(
  supabase: any,
  payload: any
): Promise<Response> {
  const reply = payload.data?.reply;
  const lead = payload.data?.lead;
  const campaign = payload.data?.campaign;
  const workspaceId = payload.event?.workspace_id?.toString();

  if (!reply || !lead || !campaign) {
    console.log('Missing reply, lead, or campaign data');
    return new Response(
      JSON.stringify({ status: 'ignored', reason: 'missing required data' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Processing LEAD_INTERESTED: reply_id=${reply.id}, lead=${lead.email}, campaign=${campaign.name}`);

  // Safety check: skip if not interested or is automated
  if (reply.interested !== true) {
    console.log('Skipping: reply not marked as interested');
    return new Response(
      JSON.stringify({ status: 'ignored', reason: 'not interested' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (reply.automated_reply === true) {
    console.log('Skipping: automated reply');
    return new Response(
      JSON.stringify({ status: 'ignored', reason: 'automated reply' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Skip bounce/system emails
  const fromEmail = (reply.from_email_address || '').toLowerCase();
  if (BOUNCE_DOMAINS.some(domain => fromEmail.includes(domain))) {
    console.log(`Skipping system/bounce email: ${fromEmail}`);
    return new Response(
      JSON.stringify({ status: 'ignored', reason: 'system/bounce email' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find user by workspace_id
  const { data: integration, error: integrationError } = await supabase
    .from('user_integrations')
    .select('user_id, cold_email_team_id')
    .eq('platform', 'emailbison')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .single();

  if (integrationError || !integration) {
    console.log(`No matching integration for workspace_id=${workspaceId}`);
    return new Response(
      JSON.stringify({ status: 'ignored', reason: 'no matching integration for workspace' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const userId = (integration as any).user_id;
  const coldEmailTeamId = (integration as any).cold_email_team_id;
  console.log(`Found user ${userId} for workspace ${workspaceId}, team ${coldEmailTeamId}`);

  // Build lead name
  const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || null;

  // Upsert the reply into lead_replies
  const { data: upsertedReply, error: upsertError } = await supabase
    .from('lead_replies')
    .upsert({
      external_reply_id: reply.id.toString(),
      user_id: userId,
      lead_email: lead.email,
      lead_name: leadName,
      campaign_id: campaign.id.toString(),
      campaign_name: campaign.name,
      subject: reply.email_subject,
      body: reply.text_body || reply.html_body,
      received_at: reply.date_received,
      status: 'pending',
      reply_type: 'interested',
      company: lead.company || null,
    } as any, { onConflict: 'external_reply_id' })
    .select('id')
    .single();

  if (upsertError) {
    console.error('Error upserting lead reply:', upsertError);
    return new Response(
      JSON.stringify({ status: 'error', error: upsertError.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Successfully stored interested reply from ${lead.email}`);

  // AUTO-CREATE CRM LEAD
  let crmLeadCreated = false;
  if (coldEmailTeamId) {
    try {
      // Check if CRM lead already exists for this email in this team
      const { data: existingLead } = await supabase
        .from('crm_leads')
        .select('id, reply_count')
        .eq('team_id', coldEmailTeamId)
        .eq('lead_email', lead.email)
        .eq('source_type', 'cold_email')
        .maybeSingle();

      if (existingLead) {
        // Update existing lead - increment reply count and update last activity
        await supabase
          .from('crm_leads')
          .update({
            reply_count: (existingLead.reply_count || 1) + 1,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', existingLead.id);
        
        console.log(`Updated existing CRM lead ${existingLead.id} - reply count: ${(existingLead.reply_count || 1) + 1}`);
      } else {
        // Create new CRM lead
        const { error: crmError } = await supabase
          .from('crm_leads')
          .insert({
            team_id: coldEmailTeamId,
            created_by: userId,
            lead_name: leadName || 'Unknown',
            lead_email: lead.email,
            company: lead.company || null,
            source_type: 'cold_email',
            source_id: upsertedReply?.id || null,
            platform: 'emailbison',
            campaign_name: campaign.name,
            status: 'interested',
            interested: true,
            reply_count: 1,
            last_activity_at: new Date().toISOString(),
          });

        if (crmError) {
          console.error('Error creating CRM lead:', crmError);
        } else {
          crmLeadCreated = true;
          console.log(`Created new CRM lead for ${lead.email}`);
        }
      }
    } catch (crmErr) {
      console.error('Error in CRM lead creation:', crmErr);
    }
  } else {
    console.log('No cold_email_team_id configured, skipping CRM lead creation');
  }
  
  return new Response(
    JSON.stringify({ 
      status: 'stored', 
      lead_email: lead.email,
      campaign_name: campaign.name,
      reply_id: reply.id,
      crm_lead_created: crmLeadCreated
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handler for TAG_ATTACHED events - meeting tag tracking
async function handleTagAttached(
  supabase: any,
  payload: any
): Promise<Response> {
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
  const insertPromises = (integrations as any[]).map(async (integration) => {
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
      } as any);

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
}