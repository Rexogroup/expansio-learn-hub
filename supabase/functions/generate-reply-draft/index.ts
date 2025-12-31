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

    // Build knowledge base context
    const kbContext = (kbDocs || []).map(doc => {
      // Truncate content to ~1000 chars per doc
      const content = doc.extracted_content?.substring(0, 1000) || '';
      return `**${doc.title}** (${doc.category}):\n${content}`;
    }).join('\n\n');

    // Build template context
    const templatesByType = (templates || []).reduce((acc, t) => {
      acc[t.reply_type] = t.template_content;
      return acc;
    }, {} as Record<string, string>);

    const systemPrompt = `You are an expert appointment setter for an outbound sales agency. Your job is to:
1. Classify the incoming lead reply into one of these categories: interested, question, objection, referral, not_interested
2. Generate a professional, personalized response that moves the conversation toward booking a meeting

${kbContext ? `## APPOINTMENT SETTING BEST PRACTICES (from Knowledge Base):
${kbContext}

Use these examples and techniques to craft your response. Match the tone and structure of successful templates.

` : ''}Company Context:
${profile ? `
- Company: ${profile.company_name || 'Not specified'}
- Services: ${profile.services_offered || 'Not specified'}
- Target Industries: ${profile.target_industries || 'Not specified'}
` : 'No company profile available'}

Available Templates:
${Object.entries(templatesByType).map(([type, content]) => `
[${type.toUpperCase()}]:
${content}
`).join('\n') || 'No templates available - generate a professional response.'}

Guidelines:
- Keep responses concise (2-4 sentences max)
- Be warm but professional
- Always include a clear call-to-action for booking a meeting
- Use placeholders like {{calendar_link}} for the user to fill in
- Match the tone and energy of the lead's reply
- If they asked a question, answer it briefly then pivot to booking

Respond with JSON in this exact format:
{
  "classification": "interested|question|objection|referral|not_interested",
  "draft": "Your generated response here",
  "reasoning": "Brief explanation of your classification"
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

    // Update the reply with the AI draft and classification
    const { error: updateError } = await supabase
      .from('lead_replies')
      .update({
        ai_draft: parsed.draft,
        reply_type: parsed.classification,
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
