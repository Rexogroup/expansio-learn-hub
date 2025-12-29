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
}

interface WarmupEmail {
  sender_email_id: number;
  enabled?: boolean;
  warmup_progress?: number;
}

async function fetchSenderEmails(apiKey: string): Promise<SenderEmail[]> {
  console.log('Fetching sender emails from EmailBison...');
  
  const allEmails: SenderEmail[] = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;
  
  while (hasMore) {
    const url = `https://send.expansio.io/api/sender-emails?page=${page}&per_page=${perPage}`;
    console.log(`Fetching sender emails page ${page}...`);
    
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
    
    console.log(`Page ${page}: fetched ${pageEmails.length} emails (total: ${allEmails.length})`);
    
    if (pageEmails.length < perPage || page >= 50) {
      hasMore = false;
    } else {
      page++;
    }
  }
  
  console.log(`Total sender emails fetched: ${allEmails.length}`);
  return allEmails;
}

async function fetchWarmupStatus(apiKey: string): Promise<WarmupEmail[]> {
  console.log('Fetching warmup status from EmailBison...');
  
  const allWarmup: WarmupEmail[] = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;
  
  try {
    while (hasMore) {
      const url = `https://send.expansio.io/api/warmup/sender-emails?page=${page}&per_page=${perPage}`;
      console.log(`Fetching warmup status page ${page}...`);
      
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
      
      console.log(`Page ${page}: fetched ${pageWarmup.length} warmup records (total: ${allWarmup.length})`);
      
      if (pageWarmup.length < perPage || page >= 50) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    console.log(`Total warmup records fetched: ${allWarmup.length}`);
    return allWarmup;
  } catch (error) {
    console.log('Error fetching warmup status:', error);
    return allWarmup;
  }
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

    // Process and store health data
    const healthRecords = senderEmails.map((email) => {
      const warmup = warmupMap.get(email.id);
      
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

      return {
        user_id: user.id,
        sender_email_id: email.id.toString(),
        email_address: email.email,
        account_type: email.type || 'unknown',
        connection_status: connectionStatus,
        warmup_enabled: warmup?.enabled || false,
        warmup_progress: warmup?.warmup_progress || null,
        daily_limit: email.daily_limit || 0,
        emails_sent_today: email.emails_sent_today || 0,
        last_checked_at: new Date().toISOString(),
        raw_data: { sender_email: email, warmup },
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
    };

    console.log('Health sync summary:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        accounts: healthRecords.length,
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
