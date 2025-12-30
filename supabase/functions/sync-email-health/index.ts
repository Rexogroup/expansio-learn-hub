import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SenderEmail {
  id: number;
  email: string;
  type?: string;
  daily_limit?: number;
  emails_sent_today?: number;
  imap_connection_status?: string;
  smtp_connection_status?: string;
  status?: string;
  bounced_count?: number;
  emails_sent_count?: number;
}

interface WarmupEmail {
  sender_email_id: number;
  enabled?: boolean;
  warmup_progress?: number;
}

interface AlertData {
  user_id: string;
  sender_email_id: string;
  email_address: string;
  alert_type: string;
  severity: string;
  current_value: number;
  threshold_value: number;
  recommended_action: string;
  status: string;
}

// Alert thresholds
const BOUNCE_RATE_WARNING = 1.0;
const BOUNCE_RATE_CRITICAL = 2.0;
const HEALTH_SCORE_WARNING = 90;
const HEALTH_SCORE_CRITICAL = 70;

async function fetchSenderEmails(apiKey: string): Promise<SenderEmail[]> {
  console.log('Fetching sender emails from EmailBison...');
  
  const allEmails: SenderEmail[] = [];
  let page = 1;
  let lastPage = 1;
  
  while (page <= lastPage) {
    const url = `https://send.expansio.io/api/sender-emails?page=${page}`;
    console.log(`Fetching sender emails page ${page} of ${lastPage}...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch sender emails:', response.status, errorText);
      throw new Error(`Failed to fetch sender emails: ${response.status}`);
    }

    const data = await response.json();
    const pageEmails = data.data || [];
    allEmails.push(...pageEmails);
    
    // Get last_page from meta object (EmailBison uses fixed page size of 15)
    if (data.meta && data.meta.last_page) {
      lastPage = data.meta.last_page;
    }
    
    console.log(`Page ${page}/${lastPage}: fetched ${pageEmails.length} emails (total: ${allEmails.length})`);
    
    page++;
    
    // Safety limit to prevent infinite loops
    if (page > 100) {
      console.log('Reached page limit (100), stopping');
      break;
    }
  }
  
  console.log(`Total sender emails fetched: ${allEmails.length}`);
  return allEmails;
}

async function fetchWarmupStatus(apiKey: string): Promise<WarmupEmail[]> {
  console.log('Fetching warmup status from EmailBison...');
  
  const allWarmup: WarmupEmail[] = [];
  let page = 1;
  let lastPage = 1;
  
  try {
    while (page <= lastPage) {
      const url = `https://send.expansio.io/api/warmup/sender-emails?page=${page}`;
      console.log(`Fetching warmup status page ${page} of ${lastPage}...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('Warmup endpoint not available or no data:', response.status);
        return allWarmup;
      }

      const data = await response.json();
      const pageWarmup = data.data || [];
      allWarmup.push(...pageWarmup);
      
      // Get last_page from meta object (EmailBison uses fixed page size of 15)
      if (data.meta && data.meta.last_page) {
        lastPage = data.meta.last_page;
      }
      
      console.log(`Page ${page}/${lastPage}: fetched ${pageWarmup.length} warmup records (total: ${allWarmup.length})`);
      
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 100) {
        console.log('Reached page limit (100), stopping');
        break;
      }
    }
    
    console.log(`Total warmup records fetched: ${allWarmup.length}`);
    return allWarmup;
  } catch (error) {
    console.log('Error fetching warmup status:', error);
    return allWarmup;
  }
}

function calculateBounceRate(bouncedCount: number, emailsSentCount: number): number {
  if (emailsSentCount === 0) return 0;
  return (bouncedCount / emailsSentCount) * 100;
}

function calculateHealthScore(warmupProgress: number | null, bounceRate: number): number {
  // Base health from warmup progress (default to 100 if not warming up)
  const baseHealth = warmupProgress ?? 100;
  
  // Penalize for high bounce rates (each 1% bounce = 10 points penalty)
  const bouncePenalty = bounceRate * 10;
  
  // Calculate final score (min 0, max 100)
  return Math.max(0, Math.min(100, baseHealth - bouncePenalty));
}

function determineAlerts(
  userId: string,
  senderId: string,
  email: string,
  bounceRate: number,
  healthScore: number
): AlertData[] {
  const alerts: AlertData[] = [];

  // Check bounce rate alert
  if (bounceRate >= BOUNCE_RATE_CRITICAL) {
    alerts.push({
      user_id: userId,
      sender_email_id: senderId,
      email_address: email,
      alert_type: 'high_bounce_rate',
      severity: 'critical',
      current_value: bounceRate,
      threshold_value: BOUNCE_RATE_CRITICAL,
      recommended_action: 'CRITICAL: Pause this account immediately for 14 days. Remove from all active campaigns and let it warm up until health reaches 100%. High bounce rates damage sender reputation and can blacklist your domain.',
      status: 'active',
    });
  } else if (bounceRate >= BOUNCE_RATE_WARNING) {
    alerts.push({
      user_id: userId,
      sender_email_id: senderId,
      email_address: email,
      alert_type: 'high_bounce_rate',
      severity: 'warning',
      current_value: bounceRate,
      threshold_value: BOUNCE_RATE_WARNING,
      recommended_action: 'WARNING: Monitor this account closely. Consider reducing sending volume by 50% and verifying email list quality. If bounce rate continues to rise, pause for 7 days.',
      status: 'active',
    });
  }

  // Check health score alert
  if (healthScore < HEALTH_SCORE_CRITICAL) {
    alerts.push({
      user_id: userId,
      sender_email_id: senderId,
      email_address: email,
      alert_type: 'low_health_score',
      severity: 'critical',
      current_value: healthScore,
      threshold_value: HEALTH_SCORE_CRITICAL,
      recommended_action: 'CRITICAL: Account health is dangerously low. Pause this account from all campaigns immediately. Enable warmup only and wait 14 days minimum for recovery. Do not resume until health returns to 100%.',
      status: 'active',
    });
  } else if (healthScore < HEALTH_SCORE_WARNING) {
    alerts.push({
      user_id: userId,
      sender_email_id: senderId,
      email_address: email,
      alert_type: 'low_health_score',
      severity: 'warning',
      current_value: healthScore,
      threshold_value: HEALTH_SCORE_WARNING,
      recommended_action: 'WARNING: Account health needs attention. Reduce sending volume by 50% and enable warmup mode. Monitor daily for 7-14 days until health improves above 90%.',
      status: 'active',
    });
  }

  return alerts;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== sync-email-health function called ===');

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

    // Get user's EmailBison integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'emailbison')
      .eq('is_active', true)
      .maybeSingle();

    if (integrationError) {
      console.error('Error fetching integration:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch integration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integration) {
      console.log('No active EmailBison integration found');
      return new Response(
        JSON.stringify({ error: 'No active EmailBison integration found', code: 'NO_INTEGRATION' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found EmailBison integration');

    // Fetch sender emails and warmup status in parallel
    const [senderEmails, warmupStatuses] = await Promise.all([
      fetchSenderEmails(integration.api_key),
      fetchWarmupStatus(integration.api_key),
    ]);

    // Create a map of warmup status by sender_email_id
    const warmupMap = new Map<number, WarmupEmail>();
    for (const ws of warmupStatuses) {
      warmupMap.set(ws.sender_email_id, ws);
    }

    // Track all alerts to upsert
    const allAlerts: AlertData[] = [];
    const alertAccountIds: Set<string> = new Set();
    let atRiskCount = 0;

    // Process and store health data
    const healthRecords = senderEmails.map((email) => {
      const warmup = warmupMap.get(email.id);
      const senderId = email.id.toString();
      
      // Determine connection status (normalize to lowercase for consistent comparison)
      let connectionStatus = 'unknown';
      if (email.imap_connection_status === 'connected' && email.smtp_connection_status === 'connected') {
        connectionStatus = 'connected';
      } else if (email.imap_connection_status === 'failed' || email.smtp_connection_status === 'failed') {
        connectionStatus = 'error';
      } else if (email.status) {
        const normalizedStatus = email.status.toLowerCase();
        if (normalizedStatus === 'connected') {
          connectionStatus = 'connected';
        } else if (['disconnected', 'failed', 'error'].includes(normalizedStatus)) {
          connectionStatus = 'error';
        } else {
          connectionStatus = normalizedStatus;
        }
      }

      // Calculate bounce rate and health score
      const bouncedCount = email.bounced_count || 0;
      const emailsSentCount = email.emails_sent_count || 0;
      const bounceRate = calculateBounceRate(bouncedCount, emailsSentCount);
      const healthScore = calculateHealthScore(warmup?.warmup_progress || null, bounceRate);
      const isAtRisk = bounceRate >= BOUNCE_RATE_WARNING || healthScore < HEALTH_SCORE_WARNING;

      if (isAtRisk) atRiskCount++;

      // Generate alerts for this account
      const accountAlerts = determineAlerts(user.id, senderId, email.email, bounceRate, healthScore);
      allAlerts.push(...accountAlerts);
      accountAlerts.forEach(a => alertAccountIds.add(`${senderId}:${a.alert_type}`));

      return {
        user_id: user.id,
        sender_email_id: senderId,
        email_address: email.email,
        account_type: email.type || 'unknown',
        connection_status: connectionStatus,
        warmup_enabled: warmup?.enabled || false,
        warmup_progress: warmup?.warmup_progress || null,
        daily_limit: email.daily_limit || 0,
        emails_sent_today: email.emails_sent_today || 0,
        last_checked_at: new Date().toISOString(),
        raw_data: { sender_email: email, warmup },
        // New health fields
        bounce_rate: bounceRate,
        health_score: healthScore,
        is_at_risk: isAtRisk,
        bounced_count: bouncedCount,
        emails_sent_count: emailsSentCount,
      };
    });

    console.log(`Upserting ${healthRecords.length} health records`);

    // Upsert health records
    for (const record of healthRecords) {
      const { error: upsertError } = await supabase
        .from('email_account_health')
        .upsert(record, { onConflict: 'user_id,sender_email_id' });

      if (upsertError) {
        console.error('Error upserting health record:', upsertError);
      }
    }

    // Upsert alerts
    console.log(`Processing ${allAlerts.length} alerts`);
    for (const alert of allAlerts) {
      const { error: alertError } = await supabase
        .from('email_account_alerts')
        .upsert(alert, { onConflict: 'user_id,sender_email_id,alert_type' });

      if (alertError) {
        console.error('Error upserting alert:', alertError);
      }
    }

    // Resolve alerts for accounts that are now healthy
    // Get all active alerts for this user
    const { data: existingAlerts } = await supabase
      .from('email_account_alerts')
      .select('id, sender_email_id, alert_type')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (existingAlerts) {
      for (const existingAlert of existingAlerts) {
        const key = `${existingAlert.sender_email_id}:${existingAlert.alert_type}`;
        if (!alertAccountIds.has(key)) {
          // This alert should be resolved
          await supabase
            .from('email_account_alerts')
            .update({ 
              status: 'resolved', 
              resolved_at: new Date().toISOString() 
            })
            .eq('id', existingAlert.id);
          
          console.log(`Resolved alert ${existingAlert.id} for ${existingAlert.sender_email_id}`);
        }
      }
    }

    // Calculate summary metrics
    const summary = {
      total_accounts: healthRecords.length,
      connected_accounts: healthRecords.filter(r => r.connection_status === 'connected').length,
      error_accounts: healthRecords.filter(r => r.connection_status === 'error').length,
      warmup_enabled_accounts: healthRecords.filter(r => r.warmup_enabled).length,
      total_daily_limit: healthRecords.reduce((sum, r) => sum + (r.daily_limit || 0), 0),
      total_emails_sent_today: healthRecords.reduce((sum, r) => sum + (r.emails_sent_today || 0), 0),
      average_warmup_progress: warmupStatuses.length > 0
        ? warmupStatuses.reduce((sum, ws) => sum + (ws.warmup_progress || 0), 0) / warmupStatuses.length
        : null,
      at_risk_accounts: atRiskCount,
      active_alerts: allAlerts.length,
    };

    console.log('Health sync summary:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        accounts: healthRecords.length,
        alerts_created: allAlerts.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in sync-email-health:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
