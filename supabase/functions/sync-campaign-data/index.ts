import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignMetrics {
  external_campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  emails_sent: number;
  unique_opens: number;
  unique_replies: number;
  interested_count: number;
  meetings_booked: number;
  bounces: number;
  unsubscribes: number;
  open_rate: number;
  reply_rate: number;
  interested_rate: number;
  raw_data: Record<string, unknown>;
}

interface CampaignStats {
  sent_count?: number;
  opened_count?: number;
  replies_count?: number;
  interested_count?: number;
  bounced_count?: number;
  unsubscribed_count?: number;
}

interface Campaign {
  id: string | number;
  name?: string;
  title?: string;
  status?: string;
  sent_count?: number;
  opened_count?: number;
  replies_count?: number;
  bounced_count?: number;
}

async function fetchInstantlyCampaigns(apiKey: string): Promise<CampaignMetrics[]> {
  const campaigns: CampaignMetrics[] = [];
  
  try {
    // First, get list of campaigns
    const campaignsResponse = await fetch('https://api.instantly.ai/api/v2/campaigns', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!campaignsResponse.ok) {
      throw new Error(`Failed to fetch campaigns: ${campaignsResponse.status}`);
    }

    const campaignsData = await campaignsResponse.json();
    const campaignList = campaignsData.items || campaignsData || [];

    // For each campaign, get analytics
    for (const campaign of campaignList) {
      try {
        const analyticsResponse = await fetch(
          `https://api.instantly.ai/api/v2/analytics/campaign-overview?campaign_id=${campaign.id}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (analyticsResponse.ok) {
          const analytics = await analyticsResponse.json();
          
          const emailsSent = analytics.emails_sent_count || 0;
          const uniqueOpens = analytics.open_count_unique || 0;
          const uniqueReplies = analytics.reply_count_unique || 0;
          const interested = analytics.total_opportunities || 0;
          const bounces = analytics.bounced_count || 0;
          
          campaigns.push({
            external_campaign_id: campaign.id,
            campaign_name: campaign.name || 'Unnamed Campaign',
            campaign_status: campaign.status || 'unknown',
            emails_sent: emailsSent,
            unique_opens: uniqueOpens,
            unique_replies: uniqueReplies,
            interested_count: interested,
            meetings_booked: 0, // Would need lead status filtering
            bounces: bounces,
            unsubscribes: analytics.unsubscribed_count || 0,
            open_rate: emailsSent > 0 ? (uniqueOpens / emailsSent) * 100 : 0,
            reply_rate: emailsSent > 0 ? (uniqueReplies / emailsSent) * 100 : 0,
            interested_rate: emailsSent > 0 ? (interested / emailsSent) * 100 : 0,
            raw_data: { campaign, analytics },
          });
        }
      } catch (err) {
        console.error(`Error fetching analytics for campaign ${campaign.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error fetching Instantly campaigns:', error);
    throw error;
  }

  return campaigns;
}

async function fetchEmailBisonCampaigns(apiKey: string): Promise<CampaignMetrics[]> {
  const campaigns: CampaignMetrics[] = [];
  
  try {
    // Get campaigns from EmailBison
    const response = await fetch('https://dedi.emailbison.com/api/campaigns', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch campaigns: ${response.status}`);
    }

    const campaignsData = await response.json();
    const campaignList: Campaign[] = campaignsData.data || campaignsData || [];

    for (const campaign of campaignList) {
      // Get campaign stats
      try {
        const statsResponse = await fetch(
          `https://dedi.emailbison.com/api/campaigns/${campaign.id}/stats`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        let stats: CampaignStats = {};
        if (statsResponse.ok) {
          stats = await statsResponse.json();
        }

        const emailsSent = stats.sent_count || campaign.sent_count || 0;
        const uniqueOpens = stats.opened_count || campaign.opened_count || 0;
        const uniqueReplies = stats.replies_count || campaign.replies_count || 0;
        const interested = stats.interested_count || 0;
        const bounces = stats.bounced_count || campaign.bounced_count || 0;

        campaigns.push({
          external_campaign_id: campaign.id.toString(),
          campaign_name: campaign.name || campaign.title || 'Unnamed Campaign',
          campaign_status: campaign.status || 'unknown',
          emails_sent: emailsSent,
          unique_opens: uniqueOpens,
          unique_replies: uniqueReplies,
          interested_count: interested,
          meetings_booked: 0,
          bounces: bounces,
          unsubscribes: stats.unsubscribed_count || 0,
          open_rate: emailsSent > 0 ? (uniqueOpens / emailsSent) * 100 : 0,
          reply_rate: emailsSent > 0 ? (uniqueReplies / emailsSent) * 100 : 0,
          interested_rate: emailsSent > 0 ? (interested / emailsSent) * 100 : 0,
          raw_data: { campaign, stats },
        });
      } catch (err) {
        console.error(`Error fetching stats for campaign ${campaign.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error fetching EmailBison campaigns:', error);
    throw error;
  }

  return campaigns;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to identify user
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

    // Get user's integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'No active integration found. Please connect your outbound platform first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update sync status to syncing
    await supabase
      .from('user_integrations')
      .update({ sync_status: 'syncing', sync_error: null })
      .eq('id', integration.id);

    let campaigns: CampaignMetrics[];

    try {
      // Fetch campaigns based on platform
      if (integration.platform === 'instantly') {
        campaigns = await fetchInstantlyCampaigns(integration.api_key);
      } else {
        campaigns = await fetchEmailBisonCampaigns(integration.api_key);
      }

      // Upsert campaigns into database
      for (const campaign of campaigns) {
        await supabase
          .from('synced_campaigns')
          .upsert({
            user_id: user.id,
            platform: integration.platform,
            external_campaign_id: campaign.external_campaign_id,
            campaign_name: campaign.campaign_name,
            campaign_status: campaign.campaign_status,
            emails_sent: campaign.emails_sent,
            unique_opens: campaign.unique_opens,
            unique_replies: campaign.unique_replies,
            interested_count: campaign.interested_count,
            meetings_booked: campaign.meetings_booked,
            bounces: campaign.bounces,
            unsubscribes: campaign.unsubscribes,
            open_rate: campaign.open_rate,
            reply_rate: campaign.reply_rate,
            interested_rate: campaign.interested_rate,
            raw_data: campaign.raw_data,
            synced_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,external_campaign_id,platform',
          });
      }

      // Calculate and store daily aggregates
      const today = new Date().toISOString().split('T')[0];
      const totals = campaigns.reduce((acc, c) => ({
        emails_sent: acc.emails_sent + c.emails_sent,
        opens: acc.opens + c.unique_opens,
        replies: acc.replies + c.unique_replies,
        interested: acc.interested + c.interested_count,
        meetings: acc.meetings + c.meetings_booked,
      }), { emails_sent: 0, opens: 0, replies: 0, interested: 0, meetings: 0 });

      await supabase
        .from('daily_campaign_metrics')
        .upsert({
          user_id: user.id,
          date: today,
          total_emails_sent: totals.emails_sent,
          total_opens: totals.opens,
          total_replies: totals.replies,
          total_interested: totals.interested,
          total_meetings: totals.meetings,
          open_rate: totals.emails_sent > 0 ? (totals.opens / totals.emails_sent) * 100 : 0,
          reply_rate: totals.emails_sent > 0 ? (totals.replies / totals.emails_sent) * 100 : 0,
          interested_rate: totals.emails_sent > 0 ? (totals.interested / totals.emails_sent) * 100 : 0,
        }, {
          onConflict: 'user_id,date',
        });

      // Update sync status to success
      await supabase
        .from('user_integrations')
        .update({ 
          sync_status: 'success', 
          last_sync_at: new Date().toISOString(),
          sync_error: null 
        })
        .eq('id', integration.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          campaigns_synced: campaigns.length,
          totals 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (syncError: unknown) {
      // Update sync status to error
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown sync error';
      await supabase
        .from('user_integrations')
        .update({ 
          sync_status: 'error', 
          sync_error: errorMessage 
        })
        .eq('id', integration.id);

      throw syncError;
    }

  } catch (error: unknown) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Sync failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
