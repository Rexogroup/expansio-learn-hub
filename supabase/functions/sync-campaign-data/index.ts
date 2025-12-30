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

interface Campaign {
  id: string | number;
  name?: string;
  title?: string;
  status?: string;
}

interface LeadCampaignData {
  campaign_id: number;
}

interface Lead {
  id: string | number;
  campaign_id?: string | number;
  sequence_id?: string | number;
  campaign?: { id: string | number } | string | number;
  lead_campaign_data?: LeadCampaignData[];
  [key: string]: unknown;
}

interface CampaignEventStats {
  sent: number;
  opened: number;
  replied: number;
  interested: number;
  bounced: number;
  unsubscribed: number;
}

// Interfaces for sequence steps and A/B variants
interface SequenceVariant {
  id: string | number;
  subject?: string;
  body?: string;
  is_active?: boolean;
  sent_count?: number;
  opened_count?: number;
  replied_count?: number;
  interested_count?: number;
  bounced_count?: number;
}

interface SequenceStep {
  id: string | number;
  step_number?: number;
  order?: number;
  subject?: string;
  body?: string;
  delay_in_days?: number;
  is_active?: boolean;
  variants?: SequenceVariant[];
  // Stats if included at step level
  sent_count?: number;
  opened_count?: number;
  replied_count?: number;
  interested_count?: number;
  bounced_count?: number;
}

interface CampaignVariantMetrics {
  campaign_id: string;
  campaign_name: string;
  step_number: number;
  variant_id: string;
  variant_label: string;
  subject_line: string;
  is_active: boolean;
  emails_sent: number;
  unique_replies: number;
  interested_count: number;
  meetings_booked: number;
  reply_rate: number;
  interested_rate: number;
  raw_data: Record<string, unknown>;
}

// Fetch date-filtered stats using /api/campaign-events/stats endpoint
async function fetchEmailBisonCampaignEventsStats(
  apiKey: string,
  campaignId: string,
  startDate: string,
  endDate: string
): Promise<CampaignEventStats> {
  const result: CampaignEventStats = { sent: 0, opened: 0, replied: 0, interested: 0, bounced: 0, unsubscribed: 0 };
  
  try {
    const url = `https://send.expansio.io/api/campaign-events/stats?start_date=${startDate}&end_date=${endDate}&campaign_ids[0]=${campaignId}`;
    console.log(`Fetching campaign events stats: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`Campaign events stats failed: ${response.status}`);
      return result;
    }

    const data = await response.json();
    console.log(`Campaign events stats response for ${campaignId}: ${JSON.stringify(data)}`);
    
    // Parse the response - it returns arrays of [date, count] per event type
    // Example: { data: [{ label: 'Sent', dates: [['2024-01-01', 10], ['2024-01-02', 5]] }] }
    const eventGroups = data.data || data || [];
    
    for (const eventGroup of eventGroups) {
      const dates = eventGroup.dates || [];
      const totalForEvent = dates.reduce((sum: number, item: [string, number]) => sum + (item[1] || 0), 0);
      
      const label = (eventGroup.label || '').toLowerCase();
      if (label.includes('sent')) result.sent = totalForEvent;
      else if (label.includes('unique opens') || label === 'opened') result.opened = totalForEvent;
      else if (label.includes('replied') || label.includes('reply')) result.replied = totalForEvent;
      else if (label.includes('interested')) result.interested = totalForEvent;
      else if (label.includes('bounced') || label.includes('bounce')) result.bounced = totalForEvent;
      else if (label.includes('unsubscribed') || label.includes('unsubscribe')) result.unsubscribed = totalForEvent;
    }
    
    console.log(`Parsed stats for campaign ${campaignId}: sent=${result.sent}, replied=${result.replied}, interested=${result.interested}`);
  } catch (err) {
    console.error(`Error fetching campaign events stats for ${campaignId}:`, err);
  }
  
  return result;
}

// Fetch sequence steps and A/B variants for a campaign
async function fetchEmailBisonSequenceSteps(
  apiKey: string,
  campaignId: string
): Promise<SequenceStep[]> {
  try {
    // Try v1.1 endpoint first (may have more data)
    const url = `https://send.expansio.io/api/campaigns/v1.1/${campaignId}/sequence-steps`;
    console.log(`Fetching sequence steps: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Fallback to v1.0 endpoint
      console.log(`v1.1 failed (${response.status}), trying v1.0`);
      const fallbackUrl = `https://send.expansio.io/api/campaigns/${campaignId}/sequence-steps`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!fallbackResponse.ok) {
        console.log(`Both endpoints failed for campaign ${campaignId}`);
        return [];
      }

      const fallbackData = await fallbackResponse.json();
      console.log(`Sequence steps v1.0 response for ${campaignId}: ${JSON.stringify(fallbackData).substring(0, 500)}`);
      return fallbackData.data || fallbackData || [];
    }

    const data = await response.json();
    console.log(`Sequence steps v1.1 response for ${campaignId}: ${JSON.stringify(data).substring(0, 500)}`);
    return data.data || data || [];
  } catch (err) {
    console.error(`Error fetching sequence steps for ${campaignId}:`, err);
    return [];
  }
}

// Fetch stats for a specific sequence step
async function fetchEmailBisonStepStats(
  apiKey: string,
  campaignId: string,
  stepId: string,
  startDate: string,
  endDate: string
): Promise<CampaignEventStats> {
  const result: CampaignEventStats = { sent: 0, opened: 0, replied: 0, interested: 0, bounced: 0, unsubscribed: 0 };
  
  try {
    // Try to get step-specific stats using campaign-events/stats with step filter
    const url = `https://send.expansio.io/api/campaign-events/stats?start_date=${startDate}&end_date=${endDate}&campaign_ids[0]=${campaignId}&sequence_step_ids[0]=${stepId}`;
    console.log(`Fetching step stats: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`Step stats failed: ${response.status}`);
      return result;
    }

    const data = await response.json();
    console.log(`Step stats response for step ${stepId}: ${JSON.stringify(data).substring(0, 300)}`);
    
    const eventGroups = data.data || data || [];
    
    for (const eventGroup of eventGroups) {
      const dates = eventGroup.dates || [];
      const totalForEvent = dates.reduce((sum: number, item: [string, number]) => sum + (item[1] || 0), 0);
      
      const label = (eventGroup.label || '').toLowerCase();
      if (label.includes('sent')) result.sent = totalForEvent;
      else if (label.includes('unique opens') || label === 'opened') result.opened = totalForEvent;
      else if (label.includes('replied') || label.includes('reply')) result.replied = totalForEvent;
      else if (label.includes('interested')) result.interested = totalForEvent;
      else if (label.includes('bounced') || label.includes('bounce')) result.bounced = totalForEvent;
      else if (label.includes('unsubscribed') || label.includes('unsubscribe')) result.unsubscribed = totalForEvent;
    }
  } catch (err) {
    console.error(`Error fetching step stats for ${stepId}:`, err);
  }
  
  return result;
}

// Process variants for a campaign and return metrics
async function processEmailBisonVariants(
  apiKey: string,
  campaignId: string,
  campaignName: string,
  startDate: string,
  endDate: string
): Promise<CampaignVariantMetrics[]> {
  const variants: CampaignVariantMetrics[] = [];
  
  const sequenceSteps = await fetchEmailBisonSequenceSteps(apiKey, campaignId);
  
  if (sequenceSteps.length === 0) {
    console.log(`No sequence steps found for campaign ${campaignId}`);
    return variants;
  }
  
  console.log(`Processing ${sequenceSteps.length} sequence steps for campaign ${campaignId}`);
  
  for (let i = 0; i < sequenceSteps.length; i++) {
    const step = sequenceSteps[i];
    const stepNumber = step.step_number || step.order || (i + 1);
    const stepId = step.id.toString();
    
    // Check if this step has A/B variants
    if (step.variants && step.variants.length > 0) {
      // Process each variant
      for (let v = 0; v < step.variants.length; v++) {
        const variant = step.variants[v];
        const variantId = variant.id.toString();
        const variantLabel = String.fromCharCode(65 + v); // A, B, C...
        
        // Use variant stats if available, otherwise fetch
        let stats: CampaignEventStats;
        if (variant.sent_count !== undefined) {
          stats = {
            sent: variant.sent_count || 0,
            opened: variant.opened_count || 0,
            replied: variant.replied_count || 0,
            interested: variant.interested_count || 0,
            bounced: variant.bounced_count || 0,
            unsubscribed: 0,
          };
        } else {
          // Try to fetch stats for this specific variant
          stats = await fetchEmailBisonStepStats(apiKey, campaignId, variantId, startDate, endDate);
        }
        
        variants.push({
          campaign_id: campaignId,
          campaign_name: campaignName,
          step_number: stepNumber,
          variant_id: variantId,
          variant_label: `Step ${stepNumber} - Variant ${variantLabel}`,
          subject_line: variant.subject || step.subject || '',
          is_active: variant.is_active !== false,
          emails_sent: stats.sent,
          unique_replies: stats.replied,
          interested_count: stats.interested,
          meetings_booked: 0, // Will be handled separately if needed
          reply_rate: stats.sent > 0 ? (stats.replied / stats.sent) * 100 : 0,
          interested_rate: stats.sent > 0 ? (stats.interested / stats.sent) * 100 : 0,
          raw_data: { step, variant, stats },
        });
      }
    } else {
      // No A/B variants - treat the step itself as a single variant
      let stats: CampaignEventStats;
      if (step.sent_count !== undefined) {
        stats = {
          sent: step.sent_count || 0,
          opened: step.opened_count || 0,
          replied: step.replied_count || 0,
          interested: step.interested_count || 0,
          bounced: step.bounced_count || 0,
          unsubscribed: 0,
        };
      } else {
        stats = await fetchEmailBisonStepStats(apiKey, campaignId, stepId, startDate, endDate);
      }
      
      variants.push({
        campaign_id: campaignId,
        campaign_name: campaignName,
        step_number: stepNumber,
        variant_id: stepId,
        variant_label: `Step ${stepNumber}`,
        subject_line: step.subject || '',
        is_active: step.is_active !== false,
        emails_sent: stats.sent,
        unique_replies: stats.replied,
        interested_count: stats.interested,
        meetings_booked: 0,
        reply_rate: stats.sent > 0 ? (stats.replied / stats.sent) * 100 : 0,
        interested_rate: stats.sent > 0 ? (stats.interested / stats.sent) * 100 : 0,
        raw_data: { step, stats },
      });
    }
  }
  
  console.log(`Processed ${variants.length} variants for campaign ${campaignId}`);
  return variants;
}

async function fetchInstantlyCampaigns(apiKey: string): Promise<CampaignMetrics[]> {
  const campaigns: CampaignMetrics[] = [];
  
  try {
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
            meetings_booked: 0,
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

// deno-lint-ignore no-explicit-any
async function fetchEmailBisonCampaigns(
  apiKey: string, 
  meetingsTagId: string | null, 
  days?: number,
  supabaseClient?: any
): Promise<CampaignMetrics[]> {
  const campaigns: CampaignMetrics[] = [];
  
  try {
    // First, get list of campaigns (basic info)
    const response = await fetch('https://send.expansio.io/api/campaigns', {
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

    console.log(`Processing ${campaignList.length} campaigns from EmailBison`);

    // Calculate date range for filtering
    const endDate = new Date();
    const startDate = new Date();
    if (days) {
      startDate.setDate(startDate.getDate() - days);
    } else {
      // For all-time, go back 3 years
      startDate.setFullYear(startDate.getFullYear() - 3);
    }
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Date range: ${startDateStr} to ${endDateStr} (days=${days || 'all-time'})`);

    // Fetch meetings count - use local webhook events for timeline-filtered data
    let meetingsPerCampaign: Map<string, number> = new Map();
    if (meetingsTagId) {
      try {
        if (days && supabaseClient) {
          // For timeline-filtered data, query local meeting_tag_events table
          // This uses webhook data for accurate "when tag was attached" timestamps
          console.log(`Querying local meeting events for tag: ${meetingsTagId}, since: ${startDateStr}`);
          
          const { data: meetingEvents, error: eventsError } = await supabaseClient
            .from('meeting_tag_events')
            .select('campaign_id')
            .eq('tag_id', meetingsTagId)
            .gte('tagged_at', startDateStr);
          
          if (eventsError) {
            console.error('Error querying meeting events:', eventsError);
          } else if (meetingEvents && meetingEvents.length > 0) {
            console.log(`Found ${meetingEvents.length} meeting events from webhooks (last ${days} days)`);
            
            let mappedCount = 0;
            for (const event of meetingEvents as Array<{ campaign_id: string | null }>) {
              if (event.campaign_id) {
                meetingsPerCampaign.set(event.campaign_id, (meetingsPerCampaign.get(event.campaign_id) || 0) + 1);
                mappedCount++;
              }
            }
            
            console.log(`Mapped ${mappedCount} meeting events to campaigns`);
            
            if (mappedCount === 0 && meetingEvents.length > 0) {
              meetingsPerCampaign.set('__total__', meetingEvents.length);
            }
          } else {
            console.log('No meeting events found in local database for this period - falling back to API');
            // Fall back to API if no local events (webhook not set up yet)
            await fetchMeetingsFromAPI();
          }
        } else {
          // For all-time data, use the API (cumulative count)
          await fetchMeetingsFromAPI();
        }
        
        async function fetchMeetingsFromAPI() {
          const leadsUrl = `https://send.expansio.io/api/leads?filters[tag_ids][0]=${meetingsTagId}&per_page=1000`;
          console.log(`Fetching leads with meetings tag from API: ${meetingsTagId}`);
          
          const leadsResponse = await fetch(leadsUrl, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (leadsResponse.ok) {
            const leadsData = await leadsResponse.json();
            const leads: Lead[] = leadsData.data || leadsData || [];
            console.log(`Found ${leads.length} leads with meetings tag from API`);

            let mappedCount = 0;
            for (const lead of leads) {
              const leadCampaignData = lead.lead_campaign_data;
              let campaignId: string | undefined;
              
              if (leadCampaignData && Array.isArray(leadCampaignData) && leadCampaignData.length > 0) {
                campaignId = leadCampaignData[0].campaign_id?.toString();
              }
              
              if (!campaignId) {
                campaignId = 
                  lead.campaign_id?.toString() || 
                  lead.sequence_id?.toString() ||
                  (typeof lead.campaign === 'object' && lead.campaign !== null ? (lead.campaign as { id: string | number }).id?.toString() : lead.campaign?.toString());
              }
              
              if (campaignId) {
                meetingsPerCampaign.set(campaignId, (meetingsPerCampaign.get(campaignId) || 0) + 1);
                mappedCount++;
              }
            }
            
            console.log(`Mapped ${mappedCount} out of ${leads.length} leads to campaigns`);
            
            if (mappedCount === 0 && leads.length > 0) {
              meetingsPerCampaign.set('__total__', leads.length);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching meetings data:', err);
      }
    }

    // Fetch stats for each campaign using the campaign-events/stats endpoint
    for (const campaign of campaignList) {
      const campaignId = campaign.id.toString();
      
      // Use the date-filtered stats endpoint
      const stats = await fetchEmailBisonCampaignEventsStats(apiKey, campaignId, startDateStr, endDateStr);
      
      // Get meetings count
      let meetingsBooked = meetingsPerCampaign.get(campaignId) || 0;
      if (meetingsBooked === 0 && meetingsPerCampaign.has('__total__')) {
        if (campaignList.indexOf(campaign) === 0) {
          meetingsBooked = meetingsPerCampaign.get('__total__') || 0;
        }
      }

      console.log(`Campaign ${campaignId}: sent=${stats.sent}, replied=${stats.replied}, interested=${stats.interested}, meetings=${meetingsBooked}`);

      campaigns.push({
        external_campaign_id: campaignId,
        campaign_name: campaign.name || campaign.title || 'Unnamed Campaign',
        campaign_status: campaign.status || 'unknown',
        emails_sent: stats.sent,
        unique_opens: stats.opened,
        unique_replies: stats.replied,
        interested_count: stats.interested,
        meetings_booked: meetingsBooked,
        bounces: stats.bounced,
        unsubscribes: stats.unsubscribed,
        open_rate: stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0,
        reply_rate: stats.sent > 0 ? (stats.replied / stats.sent) * 100 : 0,
        interested_rate: stats.sent > 0 ? (stats.interested / stats.sent) * 100 : 0,
        raw_data: { campaign, stats },
      });
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    await supabase
      .from('user_integrations')
      .update({ sync_status: 'syncing', sync_error: null })
      .eq('id', integration.id);

    let campaigns: CampaignMetrics[];
    
    // Parse request body for optional days parameter
    let days: number | undefined;
    try {
      const body = await req.json();
      days = body.days;
      if (days) {
        console.log(`Timeline filter requested: last ${days} days`);
      }
    } catch {
      // No body or invalid JSON, use defaults (all-time)
    }

    try {
      if (integration.platform === 'instantly') {
        campaigns = await fetchInstantlyCampaigns(integration.api_key);
      } else {
        campaigns = await fetchEmailBisonCampaigns(integration.api_key, integration.meetings_tag_id, days, supabase);
      }

      console.log(`Syncing ${campaigns.length} campaigns for user ${user.id} (timeline_days=${days || 'null'})`);

      // Upsert campaigns into database with timeline_days
      for (const campaign of campaigns) {
        const { error: upsertError } = await supabase
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
            timeline_days: days || null,
          }, {
            onConflict: 'user_id,platform,external_campaign_id,timeline_days',
          });

        if (upsertError) {
          console.error(`Error upserting campaign ${campaign.external_campaign_id}:`, upsertError);
        }
      }

      // Sync campaign variants (A/B test data) for EmailBison only
      let variantsSynced = 0;
      if (integration.platform === 'emailbison') {
        console.log('Starting variant sync for EmailBison campaigns...');
        
        // Calculate date range for variant stats
        const endDate = new Date();
        const startDate = new Date();
        if (days) {
          startDate.setDate(startDate.getDate() - days);
        } else {
          startDate.setFullYear(startDate.getFullYear() - 3);
        }
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        for (const campaign of campaigns) {
          const variants = await processEmailBisonVariants(
            integration.api_key,
            campaign.external_campaign_id,
            campaign.campaign_name,
            startDateStr,
            endDateStr
          );
          
          for (const variant of variants) {
            const { error: variantError } = await supabase
              .from('campaign_variants')
              .upsert({
                user_id: user.id,
                campaign_id: variant.campaign_id,
                campaign_name: variant.campaign_name,
                step_number: variant.step_number,
                variant_id: variant.variant_id,
                variant_label: variant.variant_label,
                subject_line: variant.subject_line,
                is_active: variant.is_active,
                emails_sent: variant.emails_sent,
                unique_replies: variant.unique_replies,
                interested_count: variant.interested_count,
                meetings_booked: variant.meetings_booked,
                reply_rate: variant.reply_rate,
                interested_rate: variant.interested_rate,
                timeline_days: days || null,
                raw_data: variant.raw_data,
                synced_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id,campaign_id,variant_id,step_number,timeline_days',
              });
            
            if (variantError) {
              console.error(`Error upserting variant ${variant.variant_id}:`, variantError);
            } else {
              variantsSynced++;
            }
          }
        }
        
        console.log(`Synced ${variantsSynced} variants for user ${user.id}`);
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

      console.log(`Daily totals: emails_sent=${totals.emails_sent}, replies=${totals.replies}, interested=${totals.interested}, meetings=${totals.meetings}`);

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
          variants_synced: variantsSynced,
          timeline_days: days || null,
          totals 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (syncError: unknown) {
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown sync error';
      await supabase
        .from('user_integrations')
        .update({ 
          sync_status: 'error', 
          sync_error: errorMessage 
        })
        .eq('id', integration.id);

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
