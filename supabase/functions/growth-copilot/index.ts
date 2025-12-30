import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GrowthStep {
  id: string;
  step_number: number;
  name: string;
  description: string;
  benchmark_kpi_name: string;
  benchmark_kpi_value: number;
  benchmark_kpi_unit: string;
  help_content: string;
}

interface CampaignData {
  campaign_name: string;
  emails_sent: number;
  unique_replies: number;
  interested_count: number;
  reply_rate: number;
  interested_rate: number;
  campaign_status: string;
}

interface UserProgress {
  step_id: string;
  status: string;
  current_kpi_value: number | null;
  attempts: number;
}

interface InfrastructureAlert {
  email_address: string;
  alert_type: string;
  severity: string;
  current_value: number;
  threshold_value: number;
  recommended_action: string;
}

interface RequestBody {
  type: 'diagnose' | 'recommend' | 'chat';
  message?: string;
  context?: {
    currentStep?: number;
    focusCampaignId?: string;
  };
  conversationHistory?: Array<{ role: string; content: string }>;
}

function buildSystemPrompt(
  growthSteps: GrowthStep[],
  currentStep: GrowthStep | null,
  userProgress: UserProgress | null,
  campaigns: CampaignData[],
  totalMetrics: { emails_sent: number; replies: number; interested: number; reply_rate: number; interested_rate: number },
  infrastructureAlerts: InfrastructureAlert[]
): string {
  const topCampaigns = [...campaigns]
    .filter(c => c.emails_sent > 100)
    .sort((a, b) => b.interested_rate - a.interested_rate)
    .slice(0, 3);

  const lowCampaigns = [...campaigns]
    .filter(c => c.emails_sent > 1000 && c.interested_rate < 1.0)
    .sort((a, b) => a.interested_rate - b.interested_rate)
    .slice(0, 3);

  // Build infrastructure alerts section
  const criticalAlerts = infrastructureAlerts.filter(a => a.severity === 'critical');
  const warningAlerts = infrastructureAlerts.filter(a => a.severity === 'warning');

  let infrastructureSection = '';
  if (infrastructureAlerts.length > 0) {
    infrastructureSection = `
### ⚠️ CURRENT INFRASTRUCTURE ALERTS (PRIORITY)
${criticalAlerts.length > 0 ? `
**CRITICAL ALERTS (${criticalAlerts.length}):**
${criticalAlerts.map(a => `- ${a.email_address}: ${a.alert_type === 'high_bounce_rate' ? `Bounce Rate ${a.current_value.toFixed(2)}%` : `Health Score ${a.current_value.toFixed(0)}%`} (threshold: ${a.threshold_value}${a.alert_type === 'high_bounce_rate' ? '%' : ''})`).join('\n')}
` : ''}
${warningAlerts.length > 0 ? `
**WARNING ALERTS (${warningAlerts.length}):**
${warningAlerts.map(a => `- ${a.email_address}: ${a.alert_type === 'high_bounce_rate' ? `Bounce Rate ${a.current_value.toFixed(2)}%` : `Health Score ${a.current_value.toFixed(0)}%`} (threshold: ${a.threshold_value}${a.alert_type === 'high_bounce_rate' ? '%' : ''})`).join('\n')}
` : ''}

**IMPORTANT**: When the user asks about performance or what to do next, ALWAYS mention these infrastructure alerts FIRST. Infrastructure health impacts all campaign performance and must be addressed before other optimizations.
`;
  }

  return `You are the Growth OS Copilot, an expert AI advisor for B2B cold outbound agencies. You help users optimize their outbound campaigns and progress through the 7-step growth framework.

## YOUR KNOWLEDGE BASE

### The 7-Step Growth Framework
${growthSteps.map(s => `- Step ${s.step_number}: ${s.name} (Benchmark: ${s.benchmark_kpi_value}${s.benchmark_kpi_unit === 'percent' ? '%' : ''} ${s.benchmark_kpi_name})`).join('\n')}

### User's Current Position
- Current Step: ${currentStep ? `${currentStep.step_number} - ${currentStep.name}` : 'Unknown'}
- Status: ${userProgress?.status || 'not_started'}
- Attempts at this step: ${userProgress?.attempts || 0}

### Overall Campaign Performance
- Total Emails Sent: ${totalMetrics.emails_sent.toLocaleString()}
- Total Replies: ${totalMetrics.replies.toLocaleString()} (${totalMetrics.reply_rate.toFixed(2)}%)
- Total Interested: ${totalMetrics.interested.toLocaleString()} (${totalMetrics.interested_rate.toFixed(2)}%)

### Benchmark Comparisons
${currentStep ? `- Current KPI (${currentStep.benchmark_kpi_name}): ${totalMetrics.interested_rate.toFixed(2)}% vs ${currentStep.benchmark_kpi_value}% benchmark
- Gap: ${(currentStep.benchmark_kpi_value - totalMetrics.interested_rate).toFixed(2)}%` : 'No benchmark data available'}

### Top Performing Campaigns
${topCampaigns.length > 0 ? topCampaigns.map(c => `- ${c.campaign_name}: ${c.interested_rate.toFixed(2)}% IR (${c.emails_sent.toLocaleString()} sent)`).join('\n') : 'No top performers identified yet'}

### Underperforming Campaigns (Consider Pausing)
${lowCampaigns.length > 0 ? lowCampaigns.map(c => `- ${c.campaign_name}: ${c.interested_rate.toFixed(2)}% IR (${c.emails_sent.toLocaleString()} sent) - Below benchmark`).join('\n') : 'No underperformers identified'}
${infrastructureSection}

## EMAIL INFRASTRUCTURE HEALTH RULES

### Bounce Rate Diagnostics
- < 1%: Excellent deliverability - safe to scale sending volume
- 1% - 2%: Warning zone - monitor closely, consider reducing volume
- > 2%: CRITICAL - pause account immediately for 14 days minimum

### Health Score Diagnostics
- 90% - 100%: Healthy - can send at full capacity
- 70% - 90%: Needs attention - reduce sending volume by 50%
- < 70%: Critical - pause from campaigns, warmup only mode

### Recovery Protocol for At-Risk Email Accounts
1. **Immediate Action**: Remove the account from all active campaigns immediately
2. **Enable Warmup**: Keep warmup enabled (or re-enable if disabled) to maintain sender reputation
3. **Wait Period**: Wait 14 days minimum without any campaign sending from this account
4. **Monitor Daily**: Check health score and bounce rate daily until both return to healthy levels
5. **Gradual Resume**: When health returns to 100%, resume campaigns at 25% of normal volume
6. **Scale Carefully**: Increase volume by 20-30% per week only if metrics stay healthy

### Common Causes of High Bounce Rates
- Poor quality lead lists with invalid/outdated email addresses
- Sending to purchased email lists
- Domain reputation issues from previous spam reports
- Hitting spam traps (recycled or typo domains)
- Technical issues with email authentication (SPF, DKIM, DMARC)

### Prevention Best Practices
- Always verify email lists before importing (use email verification services)
- Remove bounced addresses immediately after each campaign
- Maintain active warmup for ALL sending accounts
- Don't exceed 15-20 emails/day per account during warmup
- Use domain health monitoring tools
- Keep bounce rate under 1% at all times

## DIAGNOSTIC RULES

### Interested Rate Diagnostics
- < 0.5%: Critical - Major issue with offer, targeting, or deliverability
- 0.5% - 1.0%: Below benchmark - Test new offer angles, refine ICP
- 1.0% - 1.5%: Near benchmark - Minor optimizations needed
- > 1.5%: Above benchmark - Ready to scale

### Reply Rate Diagnostics  
- < 1.0%: Very low engagement - Check deliverability and personalization
- 1.0% - 2.0%: Average - Improve subject lines and opening hooks
- 2.0% - 3.0%: Good - Focus on converting replies to interested
- > 3.0%: Excellent - Optimize for quality over quantity

### Campaign Scaling Rules
- Scale campaigns with >1.2% interested rate
- Pause campaigns with <0.5% interested rate after 5000+ emails
- Test 2-3 variants before declaring a winner
- Increase volume by 20-30% per week when scaling

## YOUR ROLE
1. ${infrastructureAlerts.length > 0 ? 'FIRST: Address any infrastructure alerts - these are the highest priority' : 'Check infrastructure health is stable'}
2. Diagnose where the user is struggling based on their data
3. Compare their metrics to benchmarks and identify gaps
4. Recommend specific campaigns to scale vs. pause
5. Provide ONE clear, actionable next step
6. Guide them to the next step in the framework when ready

## RESPONSE STYLE
- Be direct, concise, and data-driven
- Reference specific numbers from their campaigns
- Prioritize ONE clear action over multiple suggestions
- Explain WHY based on the data
- Use bullet points for clarity
- Keep responses under 200 words unless asked for detail
${infrastructureAlerts.length > 0 ? '- ALWAYS lead with infrastructure health concerns when they exist' : ''}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
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

    // Parse request body
    const body: RequestBody = await req.json();
    const { type, message, conversationHistory = [] } = body;

    console.log(`Growth Copilot request: type=${type}, user=${user.id}`);

    // Fetch all context data in parallel (including infrastructure alerts)
    const [
      { data: growthSteps },
      { data: userProgress },
      { data: campaigns },
      { data: dailyMetrics },
      { data: infrastructureAlerts }
    ] = await Promise.all([
      supabase.from('growth_steps').select('*').order('step_number'),
      supabase.from('user_growth_progress').select('*').eq('user_id', user.id),
      supabase.from('synced_campaigns').select('*').eq('user_id', user.id),
      supabase.from('daily_campaign_metrics').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(1),
      supabase.from('email_account_alerts').select('email_address, alert_type, severity, current_value, threshold_value, recommended_action').eq('user_id', user.id).eq('status', 'active')
    ]);

    // Determine current step
    let currentStep: GrowthStep | null = null;
    let currentProgress: UserProgress | null = null;

    if (growthSteps && userProgress) {
      const progressMap = new Map(userProgress.map(p => [p.step_id, p]));
      for (const step of growthSteps) {
        const progress = progressMap.get(step.id);
        if (!progress || progress.status !== 'validated') {
          currentStep = step;
          currentProgress = progress || null;
          break;
        }
      }
      // If all validated, user is on the last step
      if (!currentStep && growthSteps.length > 0) {
        currentStep = growthSteps[growthSteps.length - 1];
      }
      if (currentStep) {
        currentProgress = progressMap.get(currentStep.id) || null;
      }
    }

    // Calculate total metrics
    const totalMetrics = {
      emails_sent: campaigns?.reduce((sum, c) => sum + (c.emails_sent || 0), 0) || 0,
      replies: campaigns?.reduce((sum, c) => sum + (c.unique_replies || 0), 0) || 0,
      interested: campaigns?.reduce((sum, c) => sum + (c.interested_count || 0), 0) || 0,
      reply_rate: 0,
      interested_rate: 0,
    };
    
    if (totalMetrics.emails_sent > 0) {
      totalMetrics.reply_rate = (totalMetrics.replies / totalMetrics.emails_sent) * 100;
      totalMetrics.interested_rate = (totalMetrics.interested / totalMetrics.emails_sent) * 100;
    }

    // Map campaigns for the prompt
    const campaignData: CampaignData[] = (campaigns || []).map(c => ({
      campaign_name: c.campaign_name || 'Unknown',
      emails_sent: c.emails_sent || 0,
      unique_replies: c.unique_replies || 0,
      interested_count: c.interested_count || 0,
      reply_rate: c.reply_rate || 0,
      interested_rate: c.interested_rate || 0,
      campaign_status: c.campaign_status || 'unknown',
    }));

    // Map infrastructure alerts
    const alertData: InfrastructureAlert[] = (infrastructureAlerts || []).map(a => ({
      email_address: a.email_address,
      alert_type: a.alert_type,
      severity: a.severity,
      current_value: a.current_value,
      threshold_value: a.threshold_value,
      recommended_action: a.recommended_action,
    }));

    // Build system prompt with full context
    const systemPrompt = buildSystemPrompt(
      growthSteps || [],
      currentStep,
      currentProgress,
      campaignData,
      totalMetrics,
      alertData
    );

    // Build user message based on type
    let userMessage = message || '';
    if (type === 'diagnose') {
      userMessage = 'Analyze my current campaign performance and tell me what I should focus on. Give me a specific diagnosis and one clear action.';
    } else if (type === 'recommend') {
      userMessage = 'Based on my data, what is the single most important thing I should do right now to improve my results?';
    }

    // Prepare messages for AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ];

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai-gateway.lovable.dev/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

    console.log('Growth Copilot response generated successfully');

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        context: {
          currentStep: currentStep?.step_number,
          currentStepName: currentStep?.name,
          status: currentProgress?.status || 'not_started',
          totalEmailsSent: totalMetrics.emails_sent,
          interestedRate: totalMetrics.interested_rate,
          campaignCount: campaigns?.length || 0,
          infrastructureAlerts: alertData.length,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Growth Copilot error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
