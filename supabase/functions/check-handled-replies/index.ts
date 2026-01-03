import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ThreadMessage {
  id: number;
  type: 'SENT' | 'REPLY';
  date_sent?: string;
  date_received?: string;
  from_email_address: string;
  text_body: string;
}

interface ConversationThreadResponse {
  data: {
    messages: ThreadMessage[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
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
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Checking handled replies for user: ${user.id}`);

    // Get user's EmailBison integration
    const { data: integration, error: integrationError } = await supabase
      .from('user_integrations')
      .select('api_key')
      .eq('user_id', user.id)
      .eq('platform', 'emailbison')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration?.api_key) {
      return new Response(JSON.stringify({ error: 'No active EmailBison integration found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all pending replies for the user
    const { data: pendingReplies, error: repliesError } = await supabase
      .from('lead_replies')
      .select('id, external_reply_id, received_at')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (repliesError) {
      console.error('Error fetching pending replies:', repliesError);
      throw repliesError;
    }

    console.log(`Found ${pendingReplies?.length || 0} pending replies to check`);

    let checkedCount = 0;
    let markedAsReplied = 0;
    let stillPending = 0;
    let errors = 0;

    const batchSize = 50;
    const delayMs = 150; // Delay between API calls to avoid rate limiting

    for (let i = 0; i < (pendingReplies?.length || 0); i++) {
      const reply = pendingReplies![i];
      checkedCount++;

      try {
        // Fetch conversation thread from EmailBison
        const threadResponse = await fetch(
          `https://send.expansio.io/api/replies/${reply.external_reply_id}/conversation-thread`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${integration.api_key}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!threadResponse.ok) {
          console.error(`Failed to fetch thread for reply ${reply.external_reply_id}: ${threadResponse.status}`);
          errors++;
          continue;
        }

        const threadData: ConversationThreadResponse = await threadResponse.json();
        const messages = threadData.data?.messages || [];

        // Find the imported reply timestamp
        const importedDate = new Date(reply.received_at);

        // Check for any SENT message after the imported reply
        const sentAfterImport = messages.find(m => 
          m.type === 'SENT' && 
          m.date_sent && 
          new Date(m.date_sent) > importedDate
        );

        if (sentAfterImport) {
          // Update status to replied
          const { error: updateError } = await supabase
            .from('lead_replies')
            .update({ 
              status: 'replied',
              responded_at: sentAfterImport.date_sent
            })
            .eq('id', reply.id);

          if (updateError) {
            console.error(`Failed to update reply ${reply.id}:`, updateError);
            errors++;
          } else {
            markedAsReplied++;
            console.log(`Marked reply ${reply.id} as replied (sent at: ${sentAfterImport.date_sent})`);
          }
        } else {
          stillPending++;
        }

        // Add delay between API calls to avoid rate limiting
        if (i < (pendingReplies?.length || 0) - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        // Log progress every batch
        if ((i + 1) % batchSize === 0) {
          console.log(`Progress: ${i + 1}/${pendingReplies?.length} checked, ${markedAsReplied} marked as replied`);
        }

      } catch (error) {
        console.error(`Error processing reply ${reply.id}:`, error);
        errors++;
      }
    }

    const result = {
      success: true,
      checked: checkedCount,
      marked_as_replied: markedAsReplied,
      still_pending: stillPending,
      errors: errors,
    };

    console.log('Scan complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-handled-replies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
