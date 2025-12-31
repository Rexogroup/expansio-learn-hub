import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
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

    const { reply_id } = await req.json();

    if (!reply_id) {
      return new Response(
        JSON.stringify({ error: 'reply_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the reply
    const { data: reply, error: replyError } = await supabase
      .from('lead_replies')
      .select('*')
      .eq('id', reply_id)
      .eq('user_id', user.id)
      .single();

    if (replyError || !reply) {
      return new Response(
        JSON.stringify({ error: 'Reply not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's templates
    const { data: templates } = await supabase
      .from('appointment_templates')
      .select('*')
      .eq('user_id', user.id);

    // Get user's script profile for context
    const { data: profile } = await supabase
      .from('user_script_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get appointment setting knowledge base documents
    const { data: kbDocs } = await supabase
      .from('knowledge_base_documents')
      .select('title, extracted_content, category')
      .eq('document_type', 'admin')
      .eq('is_active', true)
      .in('category', ['appointment_setting', 'examples', 'framework']);

    // Build knowledge base context - use FULL content for templates
    const kbContext = (kbDocs || []).map(doc => {
      const content = doc.extracted_content || '';
      return `**${doc.title}** (${doc.category}):\n${content}`;
    }).join('\n\n---\n\n');

    // Build template context from user's custom templates
    const templatesByType = (templates || []).reduce((acc, t) => {
      acc[t.reply_type] = t.template_content;
      return acc;
    }, {} as Record<string, string>);

    const systemPrompt = `You are an expert appointment setter. Your job is to:
1. Classify the lead's reply into the MOST SPECIFIC scenario
2. Find the EXACT matching template from the Knowledge Base
3. Use that template VERBATIM, only filling in placeholders

## CLASSIFICATION SCENARIOS (in order of priority):
- **interested_sure**: Lead says yes, agrees, wants to move forward ("Sure", "Send them over", "I'll take the 5 leads", "Let's do it", "Sounds good", "I'm in")
- **interested_portfolio**: Lead is interested but wants to see examples/portfolio first
- **interested_more_info**: Lead is interested but wants more details about how it works
- **question_pricing**: Lead asks about pricing or cost
- **question_process**: Lead asks how the system/process works
- **objection_time**: Lead says they don't have time or prefer email
- **objection_catch**: Lead asks "what's the catch?"
- **not_interested**: Lead declines or is not interested
- **referral**: Lead refers to someone else

## APPOINTMENT SETTING TEMPLATES (from Knowledge Base):
${kbContext || 'No templates available'}

## USER'S CUSTOM TEMPLATES:
${Object.entries(templatesByType).map(([type, content]) => `[${type.toUpperCase()}]:\n${content}`).join('\n\n') || 'None configured'}

## Company Context:
${profile ? `- Company: ${profile.company_name || 'Not specified'}
- Services: ${profile.services_offered || 'Not specified'}` : 'No company profile available'}

## CRITICAL INSTRUCTIONS:
1. For "interested_sure" scenarios (lead agrees, says yes, wants to proceed):
   - Use the "Scenario: Interested" or appointment setting template EXACTLY as written
   - Copy the template word-for-word, only replacing placeholders
2. Only personalize these placeholders:
   - {{first_name}} or [first_name] - Lead's first name (use from email if available)
   - {{day}} or [day] - Suggest a specific day (e.g., "Thursday", "Monday")
   - {{time}} or [time] - Suggest a specific time (e.g., "2pm", "10am")
   - {{calendar_link}} - Leave as-is for user to fill
3. Keep the EXACT wording and structure from the template
4. Do NOT add extra sentences, explanations, or pleasantries
5. The templates have proven booking rates - do NOT deviate from them
6. Include the sign-off from the template if present

Respond with JSON:
{
  "classification": "interested_sure|interested_portfolio|interested_more_info|question_pricing|question_process|objection_time|objection_catch|not_interested|referral",
  "draft": "The template with placeholders filled in - copy EXACTLY from KB",
  "reasoning": "Why this classification matches and which template was used"
}`;

    const userMessage = `Lead Email: ${reply.lead_email}
Lead Name: ${reply.lead_name || 'Unknown'}
Campaign: ${reply.campaign_name || 'Unknown'}
Subject: ${reply.subject || 'No subject'}

Lead's Reply:
${reply.body}

Generate an appropriate appointment-setting response.`;

    console.log('Generating reply draft with Lovable AI...');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      return new Response(
        JSON.stringify({ error: 'AI generation failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse the JSON response
    let parsed;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: use the raw content as the draft
      parsed = {
        classification: 'interested',
        draft: content,
        reasoning: 'Could not parse structured response'
      };
    }

    // Map detailed classification to database reply_type
    const classificationMap: Record<string, string> = {
      'interested_sure': 'interested',
      'interested_portfolio': 'interested',
      'interested_more_info': 'interested',
      'question_pricing': 'question',
      'question_process': 'question',
      'objection_time': 'objection',
      'objection_catch': 'objection',
      'not_interested': 'not_interested',
      'referral': 'referral'
    };
    const dbReplyType = classificationMap[parsed.classification] || parsed.classification;

    // Update the reply with the AI draft and classification
    const { error: updateError } = await supabase
      .from('lead_replies')
      .update({
        ai_draft: parsed.draft,
        reply_type: dbReplyType,
      })
      .eq('id', reply_id);

    if (updateError) {
      console.error('Failed to update reply:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        classification: parsed.classification,
        draft: parsed.draft,
        reasoning: parsed.reasoning,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
